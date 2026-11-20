import Darwin
import Foundation
import Network
import Observation
import RemotePairing
import Security

struct PairedPhone: Codable, Identifiable {
    let id: UUID
    let name: String
    let verifier: String
}

struct PairingApproval {
    let connectionID: UUID
    let request: PairingFrame
    let code: String
}

@Observable
@MainActor
final class PairingController {
    private(set) var invitation: PairingInvitation?
    private(set) var approval: PairingApproval?
    private(set) var devices: [PairedPhone] = []
    private(set) var failure: PairingFailure?
    private(set) var diagnostic: String?
    private(set) var running = false
    private(set) var starting = false
    private(set) var addresses: [String] = []
    var selectedAddress = ""

    @ObservationIgnored private let vault = PairingKeychain(
        service: "com.antonomelchuk.remotecontrol.agent.pairing.v1")
    @ObservationIgnored private var identity: AgentIdentity?
    @ObservationIgnored private var listener: NWListener?
    @ObservationIgnored private var listeningHost: String?
    @ObservationIgnored private var gate = PairingGate()
    @ObservationIgnored private var peers: [UUID: Peer] = [:]
    @ObservationIgnored private var expiry: Task<Void, Never>?

    private struct Peer {
        let connection: NWConnection
        let timeout: Task<Void, Never>
        var requestID: UUID?
        var grant: PairedPhone?
        var closing = false
    }

    func prepare() {
        addresses = Self.privateAddresses()
        if !addresses.contains(selectedAddress) { selectedAddress = addresses.first ?? "" }
        do {
            if let data = try vault.load("devices") {
                let restored = try JSONDecoder().decode([PairedPhone].self, from: data)
                guard restored.count <= 10,
                    Set(restored.map(\.id)).count == restored.count,
                    restored.allSatisfy({
                        PairingEncoding.validName($0.name)
                            && (try? PairingEncoding.decodeBase64URL($0.verifier).count) == 32
                    })
                else { throw PairingFailure.storage }
                devices = restored
            }
        } catch {
            failure = .storage
            diagnostic = PairingDiagnostic.describe(error, stage: "devices.restore")
        }
    }

    func begin() {
        guard !starting else { return }
        failure = nil
        diagnostic = nil
        prepare()
        guard failure == nil else { return }
        guard PairingEncoding.isPrivateIPv4(selectedAddress) else {
            failure = .connection
            diagnostic = "network.address: no usable private IPv4 address"
            return
        }
        guard devices.count < 10 else {
            failure = .busy
            diagnostic = "devices.capacity: ten paired devices already stored"
            return
        }
        if running, selectedAddress == listeningHost {
            issueInvitation()
            return
        }
        if running { stop() }
        starting = true
        var stage = "identity.load-or-create"
        do {
            let loaded = try AgentIdentity.loadOrCreate()
            identity = loaded
            guard let secIdentity = sec_identity_create(loaded.identity) else {
                throw PairingFailure.identity
            }
            stage = "network.configure-tls"
            let tls = NWProtocolTLS.Options()
            sec_protocol_options_set_min_tls_protocol_version(tls.securityProtocolOptions, .TLSv13)
            sec_protocol_options_set_local_identity(tls.securityProtocolOptions, secIdentity)
            let parameters = NWParameters(tls: tls, tcp: NWProtocolTCP.Options())
            let webSocket = NWProtocolWebSocket.Options()
            webSocket.autoReplyPing = true
            webSocket.maximumMessageSize = PairingEncoding.maximumBytes
            parameters.defaultProtocolStack.applicationProtocols.insert(webSocket, at: 0)
            parameters.requiredLocalEndpoint = .hostPort(
                host: NWEndpoint.Host(selectedAddress), port: 49322)
            stage = "network.create-listener"
            let newListener = try NWListener(using: parameters)
            listeningHost = selectedAddress
            listener = newListener
            newListener.stateUpdateHandler = { [weak self, weak newListener] state in
                Task { @MainActor in
                    guard let self, self.listener === newListener else { return }
                    switch state {
                    case .ready:
                        self.starting = false
                        self.running = true
                        self.failure = nil
                        self.diagnostic = nil
                        self.issueInvitation()
                    case .waiting(let error):
                        self.failure = .connection
                        self.diagnostic = PairingDiagnostic.describe(
                            error, stage: "network.waiting")
                    case .failed(let error):
                        self.stop()
                        self.failure = .connection
                        self.diagnostic = PairingDiagnostic.describe(
                            error, stage: "network.listener")
                    default: break
                    }
                }
            }
            newListener.newConnectionHandler = { [weak self] connection in
                Task { @MainActor in self?.accept(connection) }
            }
            newListener.start(queue: .main)
        } catch {
            stop()
            failure = (error as? PairingFailure) ?? .identity
            diagnostic = PairingDiagnostic.describe(error, stage: stage)
        }
    }

    func stop() {
        expiry?.cancel()
        expiry = nil
        listener?.cancel()
        listener = nil
        listeningHost = nil
        for id in Array(peers.keys) { close(id) }
        gate.cancel()
        invitation = nil
        approval = nil
        running = false
        starting = false
    }

    func decide(_ expected: PairingApproval, allow: Bool) {
        guard let current = approval,
            current.connectionID == expected.connectionID,
            current.request.requestID == expected.request.requestID
        else { return }
        approval = nil
        guard allow else {
            gate.cancel()
            invitation = nil
            reject(current.connectionID, request: current.request.requestID, reason: .rejected)
            return
        }
        do {
            try gate.approve(
                request: current.request.requestID, now: .now)
            guard var peer = peers[current.connectionID], let name = current.request.name else {
                throw PairingFailure.connection
            }
            invitation = nil
            expiry?.cancel()
            let token = try PairingCrypto.randomSecret()
            let record = PairedPhone(
                id: UUID(), name: name,
                verifier: PairingCrypto.proof(Data("remote-control/token/v1".utf8), secret: token))
            peer.grant = record
            peers[current.connectionID] = peer
            var reply = PairingFrame(.grant, requestID: current.request.requestID)
            reply.deviceID = record.id
            reply.token = PairingEncoding.base64URL(token)
            send(reply, to: current.connectionID)
        } catch {
            invitation = nil
            gate.cancel()
            reject(
                current.connectionID, request: current.request.requestID,
                reason: (error as? PairingFailure) ?? .storage)
        }
    }

    func revoke(_ id: UUID) {
        do {
            let next = devices.filter { $0.id != id }
            try vault.save(JSONEncoder().encode(next), account: "devices")
            devices = next
            failure = nil
            diagnostic = nil
        } catch {
            failure = .storage
            diagnostic = PairingDiagnostic.describe(error, stage: "devices.revoke")
        }
    }

    private func issueInvitation() {
        guard let port = listener?.port?.rawValue, let identity else { return }
        if let approval { close(approval.connectionID) }
        approval = nil
        gate.cancel()
        invitation = nil
        expiry?.cancel()
        do {
            let ticket = PairingInvitation(
                id: UUID(), host: selectedAddress, port: port,
                name: macName(), fingerprint: identity.fingerprint,
                secret: PairingEncoding.base64URL(try PairingCrypto.randomSecret()),
                expiresAt: Int64(Date().addingTimeInterval(120).timeIntervalSince1970 * 1000))
            try ticket.validate(now: Date())
            invitation = ticket
            gate.open(id: ticket.id, now: .now)
            expiry = Task { [weak self] in
                do { try await Task.sleep(for: .seconds(120)) } catch { return }
                guard let self, self.invitation?.id == ticket.id else { return }
                self.gate.cancel()
                self.invitation = nil
                if let approval = self.approval {
                    self.reject(
                        approval.connectionID, request: approval.request.requestID, reason: .expired
                    )
                }
                self.approval = nil
            }
        } catch {
            failure = (error as? PairingFailure) ?? .storage
            diagnostic = PairingDiagnostic.describe(error, stage: "invitation.create")
        }
    }

    private func accept(_ connection: NWConnection) {
        guard running, peers.count < 3 else {
            connection.cancel()
            return
        }
        let id = UUID()
        let timeout = Task { [weak self] in
            do { try await Task.sleep(for: .seconds(60)) } catch { return }
            self?.close(id)
        }
        peers[id] = Peer(connection: connection, timeout: timeout)
        connection.stateUpdateHandler = { [weak self] state in
            Task { @MainActor in
                switch state {
                case .ready: self?.receive(id)
                case .failed, .cancelled: self?.close(id)
                default: break
                }
            }
        }
        connection.start(queue: .main)
    }

    private func receive(_ id: UUID) {
        guard let peer = peers[id] else { return }
        peer.connection.receiveMessage { [weak self] data, context, complete, error in
            let isText =
                (context?.protocolMetadata(definition: NWProtocolWebSocket.definition)
                as? NWProtocolWebSocket.Metadata)?.opcode == .text
            Task { @MainActor in
                guard let self, self.peers[id] != nil else { return }
                guard error == nil, complete, isText, let data else {
                    self.close(id)
                    return
                }
                do { try self.handle(PairingFrame.decode(data), from: id) } catch { self.close(id) }
                if let peer = self.peers[id], !peer.closing { self.receive(id) }
            }
        }
    }

    private func handle(_ message: PairingFrame, from id: UUID) throws {
        guard var peer = peers[id], !peer.closing else { return }
        switch message.type {
        case .request:
            guard peer.requestID == nil, let invitation, let invitationID = message.invitationID,
                let name = message.name, PairingEncoding.validName(name), let proof = message.proof
            else { throw PairingFailure.protocolError }
            do {
                try gate.validate(id: invitationID, now: .now)
                let secret = try PairingEncoding.decodeBase64URL(invitation.secret)
                guard PairingCrypto.verify(proof, input: message.proofInput, secret: secret) else {
                    gate.recordInvalidProof()
                    if gate.invitationID == nil { self.invitation = nil }
                    throw PairingFailure.invalidCode
                }
                try gate.reserve(
                    invitation: invitationID, request: message.requestID,
                    now: .now)
                peer.requestID = message.requestID
                peers[id] = peer
                approval = PairingApproval(
                    connectionID: id, request: message,
                    code: PairingCrypto.comparison(message.proofInput, secret: secret))
            } catch {
                reject(
                    id, request: message.requestID,
                    reason: (error as? PairingFailure) ?? .protocolError)
            }
        case .acknowledge:
            guard peer.requestID == message.requestID, let grant = peer.grant else {
                throw PairingFailure.protocolError
            }
            do {
                guard devices.count < 10 else { throw PairingFailure.busy }
                peer.grant = nil
                peers[id] = peer
                let next = devices + [grant]
                try vault.save(JSONEncoder().encode(next), account: "devices")
                devices = next
                send(PairingFrame(.paired, requestID: message.requestID), to: id, closeAfter: true)
            } catch {
                reject(id, request: message.requestID, reason: .storage)
            }
        case .authenticate:
            guard peer.requestID == nil, let deviceID = message.deviceID, let token = message.token,
                let bytes = try? PairingEncoding.decodeBase64URL(token), bytes.count == 32,
                let device = devices.first(where: { $0.id == deviceID }),
                PairingCrypto.verify(
                    device.verifier, input: Data("remote-control/token/v1".utf8), secret: bytes)
            else {
                reject(id, request: message.requestID, reason: .rejected)
                return
            }
            peer.requestID = message.requestID
            peers[id] = peer
            send(
                PairingFrame(.authenticated, requestID: message.requestID), to: id, closeAfter: true
            )
        default: throw PairingFailure.protocolError
        }
    }

    private func send(_ frame: PairingFrame, to id: UUID, closeAfter: Bool = false) {
        guard var peer = peers[id], let data = try? frame.encoded() else {
            close(id)
            return
        }
        if closeAfter {
            peer.closing = true
            peers[id] = peer
        }
        let metadata = NWProtocolWebSocket.Metadata(opcode: .text)
        let context = NWConnection.ContentContext(identifier: "pairing", metadata: [metadata])
        peer.connection.send(
            content: data, contentContext: context, isComplete: true,
            completion: .contentProcessed { [weak self] error in
                Task { @MainActor in if error != nil || closeAfter { self?.close(id) } }
            })
    }

    private func reject(_ id: UUID, request: UUID, reason: PairingFailure) {
        var frame = PairingFrame(.rejected, requestID: request)
        frame.failure = reason
        send(frame, to: id, closeAfter: true)
    }

    private func close(_ id: UUID) {
        guard let peer = peers.removeValue(forKey: id) else { return }
        peer.timeout.cancel()
        peer.connection.stateUpdateHandler = nil
        peer.connection.cancel()
        if approval?.connectionID == id {
            approval = nil
            invitation = nil
            gate.cancel()
            expiry?.cancel()
        }
    }

    private func macName() -> String {
        let name = Host.current().localizedName ?? "Remote Control Mac"
        return PairingEncoding.validName(name) ? name : "Remote Control Mac"
    }

    private static func privateAddresses() -> [String] {
        var head: UnsafeMutablePointer<ifaddrs>?
        guard getifaddrs(&head) == 0 else { return [] }
        defer { freeifaddrs(head) }
        var next = head
        var found: [String] = []
        while let current = next {
            defer { next = current.pointee.ifa_next }
            guard let address = current.pointee.ifa_addr,
                address.pointee.sa_family == UInt8(AF_INET),
                current.pointee.ifa_flags & UInt32(IFF_UP) != 0
            else { continue }
            var host = [CChar](repeating: 0, count: Int(NI_MAXHOST))
            guard
                getnameinfo(
                    address, socklen_t(address.pointee.sa_len), &host,
                    socklen_t(host.count), nil, 0, NI_NUMERICHOST) == 0
            else { continue }
            let value = String(
                decoding: host.prefix(while: { $0 != 0 }).map { UInt8(bitPattern: $0) },
                as: UTF8.self)
            if PairingEncoding.isPrivateIPv4(value), !found.contains(value) { found.append(value) }
        }
        return found.sorted()
    }
}
