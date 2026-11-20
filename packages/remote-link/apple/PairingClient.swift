import Foundation
import Security

#if canImport(RemotePairing)
    import RemotePairing
#endif

private final class PinnedTLSDelegate: NSObject, URLSessionDelegate, URLSessionTaskDelegate,
    Sendable
{
    private let fingerprint: String
    init(fingerprint: String) { self.fingerprint = fingerprint }

    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler:
            @escaping @Sendable (
                URLSession.AuthChallengeDisposition, URLCredential?
            ) -> Void
    ) {
        guard
            challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
            let trust = challenge.protectionSpace.serverTrust,
            let chain = SecTrustCopyCertificateChain(trust) as? [SecCertificate],
            let leaf = chain.first,
            PairingCrypto.fingerprint(SecCertificateCopyData(leaf) as Data) == fingerprint
        else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        // The scanned leaf is the trust anchor; this does not trust arbitrary self-signed peers.
        guard SecTrustSetPolicies(trust, SecPolicyCreateBasicX509()) == errSecSuccess,
            SecTrustSetAnchorCertificates(trust, [leaf] as CFArray) == errSecSuccess,
            SecTrustSetAnchorCertificatesOnly(trust, true) == errSecSuccess,
            SecTrustEvaluateWithError(trust, nil)
        else {
            completionHandler(.cancelAuthenticationChallenge, nil)
            return
        }
        completionHandler(.useCredential, URLCredential(trust: trust))
    }

    func urlSession(
        _ session: URLSession, task: URLSessionTask,
        willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
        completionHandler: @escaping @Sendable (URLRequest?) -> Void
    ) {
        completionHandler(nil)
    }
}

actor PairingClient {
    private let vault = PairingKeychain(
        service: "com.antonomelchuk.remotecontrol.mobile.pairing.v1")
    private var prepared: (invitation: PairingInvitation, frame: PairingFrame)?
    private var socket: URLSessionWebSocketTask?
    private var session: URLSession?
    private var operation: UUID?

    func prepare(code: String, name: String) throws -> String {
        guard operation == nil else { throw PairingFailure.busy }
        guard PairingEncoding.validName(name) else { throw PairingFailure.invalidCode }
        let invitation = try PairingInvitation.parse(code, now: Date())
        let secret = try PairingEncoding.decodeBase64URL(invitation.secret)
        var frame = PairingFrame(.request, requestID: UUID())
        frame.invitationID = invitation.id
        frame.name = name
        frame.proof = PairingCrypto.proof(frame.proofInput, secret: secret)
        prepared = (invitation, frame)
        let summary = [
            "name": invitation.name,
            "comparison": PairingCrypto.comparison(frame.proofInput, secret: secret),
        ]
        return String(decoding: try JSONEncoder().encode(summary), as: UTF8.self)
    }

    func pair() async throws -> String {
        guard operation == nil, let prepared else { throw PairingFailure.busy }
        try prepared.invitation.validate(now: Date())
        self.prepared = nil
        let generation = UUID()
        operation = generation
        defer { finish(generation) }
        let socket = try open(
            host: prepared.invitation.host, port: prepared.invitation.port,
            fingerprint: prepared.invitation.fingerprint)
        try await send(prepared.frame, over: socket)
        let grant = try await receive(over: socket, matching: prepared.frame.requestID)
        guard operation == generation else { throw PairingFailure.cancelled }
        guard grant.type == .grant, let deviceID = grant.deviceID, let token = grant.token,
            (try? PairingEncoding.decodeBase64URL(token).count) == 32
        else { throw PairingFailure.protocolError }
        let saved = SavedMac(invitation: prepared.invitation, deviceID: deviceID, token: token)
        try vault.save(JSONEncoder().encode(saved), account: "mac")
        do {
            try await send(
                PairingFrame(.acknowledge, requestID: prepared.frame.requestID), over: socket)
            let confirmed = try await receive(over: socket, matching: prepared.frame.requestID)
            guard operation == generation else { throw PairingFailure.cancelled }
            guard confirmed.type == .paired else { throw PairingFailure.protocolError }
            return try summary(saved)
        } catch {
            // A lost final reply is ambiguous; keep the saved credential so it can be verified.
            throw error
        }
    }

    func saved() throws -> String? {
        guard let data = try vault.load("mac") else { return nil }
        let saved = try JSONDecoder().decode(SavedMac.self, from: data)
        return try summary(saved)
    }

    func verifySaved() async throws -> String {
        guard operation == nil else { throw PairingFailure.busy }
        guard let data = try vault.load("mac") else { throw PairingFailure.rejected }
        let saved = try JSONDecoder().decode(SavedMac.self, from: data)
        guard PairingEncoding.isPrivateIPv4(saved.host),
            PairingEncoding.validFingerprint(saved.fingerprint),
            saved.port >= 1024, (try? PairingEncoding.decodeBase64URL(saved.token).count) == 32
        else { throw PairingFailure.storage }
        let generation = UUID()
        operation = generation
        defer { finish(generation) }
        let socket = try open(host: saved.host, port: saved.port, fingerprint: saved.fingerprint)
        var frame = PairingFrame(.authenticate, requestID: UUID())
        frame.deviceID = saved.deviceID
        frame.token = saved.token
        try await send(frame, over: socket)
        let reply = try await receive(over: socket, matching: frame.requestID)
        guard operation == generation else { throw PairingFailure.cancelled }
        guard reply.type == .authenticated else { throw PairingFailure.protocolError }
        return try summary(saved)
    }

    func forget() throws {
        cancel()
        try vault.delete("mac")
    }

    func cancel() {
        operation = nil
        prepared = nil
        socket?.cancel(with: .goingAway, reason: nil)
        socket = nil
        session?.invalidateAndCancel()
        session = nil
    }

    private func finish(_ generation: UUID) {
        if operation == generation { cancel() }
    }

    private func summary(_ saved: SavedMac) throws -> String {
        String(
            decoding: try JSONEncoder().encode([
                "name": saved.name, "id": saved.deviceID.uuidString,
            ]), as: UTF8.self)
    }

    private func open(host: String, port: UInt16, fingerprint: String) throws
        -> URLSessionWebSocketTask
    {
        guard let url = URL(string: "wss://\(host):\(port)/pairing/v1") else {
            throw PairingFailure.invalidCode
        }
        let configuration = URLSessionConfiguration.ephemeral
        configuration.tlsMinimumSupportedProtocolVersion = .TLSv13
        configuration.timeoutIntervalForRequest = 60
        configuration.timeoutIntervalForResource = 65
        configuration.urlCache = nil
        configuration.httpCookieStorage = nil
        let session = URLSession(
            configuration: configuration,
            delegate: PinnedTLSDelegate(fingerprint: fingerprint), delegateQueue: nil)
        self.session = session
        let socket = session.webSocketTask(with: url)
        socket.maximumMessageSize = PairingEncoding.maximumBytes
        self.socket = socket
        socket.resume()
        return socket
    }

    private func send(_ frame: PairingFrame, over socket: URLSessionWebSocketTask) async throws {
        try await socket.send(.string(String(decoding: try frame.encoded(), as: UTF8.self)))
    }

    private func receive(over socket: URLSessionWebSocketTask, matching id: UUID) async throws
        -> PairingFrame
    {
        try await withThrowingTaskGroup(of: PairingFrame.self) { group in
            group.addTask {
                guard case .string(let text) = try await socket.receive() else {
                    throw PairingFailure.protocolError
                }
                let reply = try PairingFrame.decode(Data(text.utf8))
                guard reply.requestID == id else { throw PairingFailure.protocolError }
                if reply.type == .rejected { throw reply.failure ?? PairingFailure.rejected }
                return reply
            }
            group.addTask {
                try await Task.sleep(for: .seconds(60))
                socket.cancel(with: .goingAway, reason: nil)
                throw PairingFailure.connection
            }
            defer { group.cancelAll() }
            guard let result = try await group.next() else { throw PairingFailure.connection }
            return result
        }
    }
}
