import Foundation

#if canImport(RemotePairing)
    import RemotePairing
#endif

private struct RemoteAudioStatus: Codable {
    let owner: String
    let snapshot: RemoteAudioSnapshot
    let commandFailure: RemoteAudioFailure?
}

/// One foreground session, one command in flight. Never retries a write after an ambiguous result.
actor RemoteAudioClient {
    private let vault = PairingKeychain(
        service: "com.antonomelchuk.remotecontrol.mobile.pairing.v1")
    private var owner: String?
    private var sessionID: UUID?
    private var session: URLSession?
    private var socket: URLSessionWebSocketTask?
    private var snapshot: RemoteAudioSnapshot?
    private var commandFailure: RemoteAudioFailure?
    private var nextSequence: UInt64 = 1
    private var receiver: Task<Void, Never>?
    private var heartbeat: Task<Void, Never>?
    private var deadline: Task<Void, Never>?
    private var sender: Task<Void, Never>?
    private var waitingForHeartbeat: CheckedContinuation<Void, any Error>?
    private var pending:
        (frame: RemoteAudioFrame, continuation: CheckedContinuation<String, any Error>)?

    func connect(owner requested: String) async throws -> String {
        guard owner == nil else { throw PairingFailure.busy }
        guard !requested.isEmpty, requested.utf8.count <= 80 else {
            throw PairingFailure.protocolError
        }
        owner = requested
        do {
            guard let data = try vault.load("mac") else { throw PairingFailure.rejected }
            let saved = try JSONDecoder().decode(SavedMac.self, from: data)
            guard PairingEncoding.validName(saved.name),
                (try? PairingEncoding.decodeBase64URL(saved.token).count) == 32
            else { throw PairingFailure.storage }
            let (session, socket) = try PinnedTransport.open(
                host: saved.host, port: saved.port, fingerprint: saved.fingerprint,
                resourceTimeout: 86_400)
            self.session = session
            self.socket = socket
            deadline = Task { [weak self] in
                do { try await Task.sleep(for: .seconds(8)) } catch { return }
                await self?.disconnect(owner: requested)
            }
            var request = PairingFrame(.openAudio, requestID: UUID())
            request.deviceID = saved.deviceID
            request.token = saved.token
            try await socket.send(.string(String(decoding: try request.encoded(), as: UTF8.self)))
            let reply = try await PinnedTransport.receive(socket, timeout: .seconds(8))
            guard owner == requested else { throw PairingFailure.cancelled }
            if let rejected = try? PairingFrame.decode(reply), rejected.type == .rejected {
                throw rejected.failure ?? PairingFailure.rejected
            }
            let welcome = try RemoteAudioFrame.decode(reply)
            try welcome.validateServerFrame()
            guard welcome.type == .audioWelcome, welcome.requestID == request.requestID else {
                throw PairingFailure.protocolError
            }
            deadline?.cancel()
            deadline = nil
            sessionID = welcome.sessionID
            snapshot = welcome.snapshot
            nextSequence = 1
            receiver = Task { [weak self] in
                await self?.receiveLoop(owner: requested, socket: socket)
            }
            heartbeat = Task { [weak self] in
                while !Task.isCancelled {
                    do { try await Task.sleep(for: .seconds(10)) } catch { return }
                    guard let self else { return }
                    await self.keepAlive(owner: requested)
                }
            }
            return try status(owner: requested)
        } catch {
            disconnect(owner: requested)
            throw error
        }
    }

    func status(owner requested: String) throws -> String {
        guard owner == requested, sessionID != nil, let snapshot else {
            throw PairingFailure.connection
        }
        return String(
            decoding: try JSONEncoder().encode(
                RemoteAudioStatus(
                    owner: requested, snapshot: snapshot, commandFailure: commandFailure)),
            as: UTF8.self)
    }

    func setVolume(owner: String, outputID: String, volume: Double) async throws -> String {
        guard let id = UUID(uuidString: outputID) else { throw PairingFailure.protocolError }
        try await waitForHeartbeat(owner: owner)
        var frame = try command(.setVolume, owner: owner)
        frame.outputID = id
        frame.volume = volume
        return try await submit(frame, owner: owner)
    }

    func setMuted(owner: String, outputID: String, muted: Bool) async throws -> String {
        guard let id = UUID(uuidString: outputID) else { throw PairingFailure.protocolError }
        try await waitForHeartbeat(owner: owner)
        var frame = try command(.setMuted, owner: owner)
        frame.outputID = id
        frame.muted = muted
        return try await submit(frame, owner: owner)
    }

    func disconnect(owner requested: String) {
        guard owner == requested else { return }
        cancelAll()
    }

    func cancelAll() {
        owner = nil
        sessionID = nil
        snapshot = nil
        commandFailure = nil
        receiver?.cancel()
        heartbeat?.cancel()
        deadline?.cancel()
        sender?.cancel()
        receiver = nil
        heartbeat = nil
        deadline = nil
        sender = nil
        socket?.cancel(with: .goingAway, reason: nil)
        socket = nil
        session?.invalidateAndCancel()
        session = nil
        let operation = pending
        pending = nil
        operation?.continuation.resume(throwing: PairingFailure.connection)
        let waiting = waitingForHeartbeat
        waitingForHeartbeat = nil
        waiting?.resume(throwing: PairingFailure.connection)
    }

    private func waitForHeartbeat(owner requested: String) async throws {
        guard owner == requested else { throw PairingFailure.connection }
        guard let pending else { return }
        guard pending.frame.type == .refreshAudio, waitingForHeartbeat == nil else {
            throw PairingFailure.busy
        }
        try await withCheckedThrowingContinuation { continuation in
            waitingForHeartbeat = continuation
        }
    }

    private func statusWithFailure(_ failure: RemoteAudioFailure?, owner requested: String) throws
        -> String
    {
        commandFailure = failure
        return try status(owner: requested)
    }

    private func command(_ kind: RemoteAudioFrame.Kind, owner requested: String) throws
        -> RemoteAudioFrame
    {
        guard owner == requested, let sessionID, snapshot != nil else {
            throw PairingFailure.connection
        }
        guard pending == nil else { throw PairingFailure.busy }
        var frame = RemoteAudioFrame(kind, requestID: UUID(), sessionID: sessionID)
        frame.sequence = nextSequence
        return frame
    }

    private func submit(_ frame: RemoteAudioFrame, owner requested: String) async throws -> String {
        try frame.validateCommand()
        guard owner == requested, pending == nil, let socket else { throw PairingFailure.busy }
        let text = String(decoding: try frame.encoded(), as: UTF8.self)
        nextSequence += 1
        return try await withCheckedThrowingContinuation { continuation in
            pending = (frame, continuation)
            deadline = Task { [weak self] in
                do { try await Task.sleep(for: .seconds(8)) } catch { return }
                await self?.disconnect(owner: requested)
            }
            sender = Task { [weak self] in
                do { try await socket.send(.string(text)) } catch {
                    await self?.disconnect(owner: requested)
                }
            }
        }
    }

    private func keepAlive(owner requested: String) async {
        guard owner == requested, pending == nil else { return }
        do {
            _ = try await submit(command(.refreshAudio, owner: requested), owner: requested)
        } catch { disconnect(owner: requested) }
    }

    private func receiveLoop(owner requested: String, socket: URLSessionWebSocketTask) async {
        do {
            while !Task.isCancelled {
                let data = try await PinnedTransport.receive(socket, timeout: .seconds(25))
                guard owner == requested else { return }
                let frame = try RemoteAudioFrame.decode(data)
                try frame.validateServerFrame()
                guard frame.sessionID == sessionID, frame.type != .audioWelcome,
                    let next = frame.snapshot
                else { throw PairingFailure.protocolError }
                if let snapshot, next.revision < snapshot.revision {
                    if frame.type == .audioUpdate { continue }
                    // An earlier readback can trail a newer observer event; never roll state back.
                } else {
                    snapshot = next
                }
                if frame.type == .audioResult {
                    guard let operation = pending, operation.frame.requestID == frame.requestID,
                        operation.frame.sequence == frame.sequence
                    else { throw PairingFailure.protocolError }
                    let response = try statusWithFailure(
                        operation.frame.type == .refreshAudio ? commandFailure : frame.failure,
                        owner: requested)
                    pending = nil
                    deadline?.cancel()
                    deadline = nil
                    operation.continuation.resume(returning: response)
                    let waiting = waitingForHeartbeat
                    waitingForHeartbeat = nil
                    waiting?.resume()
                }
            }
        } catch { disconnect(owner: requested) }
    }
}
