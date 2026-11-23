import Foundation
import RemotePairing

actor BrowserHostRelay {
    private let io = NativeMessageIO()
    private var session: URLSession?
    private var socket: URLSessionWebSocketTask?
    private var reader: Task<Void, Never>?
    private var receiver: Task<Void, Never>?
    private var setupDeadline: Task<Void, Never>?
    private var completed: CheckedContinuation<Void, any Error>?
    private var closed = false
    private var sequence: UInt64 = 1

    func run() async throws {
        do {
            let configuration = try BrowserRuntimeStore().read()
            let (session, socket) = try PinnedTransport.open(
                host: configuration.host,
                port: configuration.port, fingerprint: configuration.fingerprint,
                resourceTimeout: 86_400)
            self.session = session
            self.socket = socket
            setupDeadline = Task { [weak self] in
                do { try await Task.sleep(for: .seconds(8)) } catch { return }
                await self?.finish(PairingFailure.connection)
            }
            var request = PairingFrame(.attachBrowser, requestID: UUID())
            request.token = configuration.token
            try await socket.send(.string(String(decoding: try request.encoded(), as: UTF8.self)))
            let reply = try PairingFrame.decode(
                await PinnedTransport.receive(socket, timeout: .seconds(8)))
            guard !closed, reply.type == .browserAttached, reply.requestID == request.requestID
            else {
                throw PairingFailure.rejected
            }
            setupDeadline?.cancel()
            setupDeadline = nil
            try await io.send(BrowserBridgeFrame(.browserReady).encoded())
            try await withCheckedThrowingContinuation {
                (continuation: CheckedContinuation<Void, any Error>) in
                guard !closed else {
                    continuation.resume(throwing: PairingFailure.connection)
                    return
                }
                completed = continuation
                reader = Task { [weak self] in await self?.readChrome(socket) }
                receiver = Task { [weak self] in await self?.readAgent(socket) }
            }
        } catch {
            finish(PairingFailure.connection)
            throw PairingFailure.connection
        }
    }

    private func readChrome(_ socket: URLSessionWebSocketTask) async {
        do {
            while !Task.isCancelled {
                guard let data = try await io.next() else {
                    finish(nil)
                    return
                }
                guard !closed else { return }
                var frame = try BrowserBridgeFrame.decode(data)
                try frame.validateUpstream()
                guard frame.sequence == 0 else { throw PairingFailure.protocolError }
                frame.sequence = sequence
                sequence += 1
                try await socket.send(.string(String(decoding: try frame.encoded(), as: UTF8.self)))
            }
        } catch { finish(PairingFailure.connection) }
    }

    private func readAgent(_ socket: URLSessionWebSocketTask) async {
        do {
            while !Task.isCancelled {
                let data = try await PinnedTransport.receive(socket, timeout: .seconds(25))
                guard !closed else { return }
                let frame = try BrowserBridgeFrame.decode(data)
                try frame.validateDownstream()
                if frame.type == .browserCommand { try await io.send(data) }
            }
        } catch { finish(PairingFailure.connection) }
    }

    private func finish(_ error: PairingFailure?) {
        guard !closed else { return }
        closed = true
        setupDeadline?.cancel()
        reader?.cancel()
        receiver?.cancel()
        socket?.cancel(with: .goingAway, reason: nil)
        socket = nil
        session?.invalidateAndCancel()
        session = nil
        let continuation = completed
        completed = nil
        if let error { continuation?.resume(throwing: error) } else { continuation?.resume() }
    }
}
