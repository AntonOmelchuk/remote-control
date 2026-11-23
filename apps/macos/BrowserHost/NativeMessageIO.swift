import Foundation
import RemotePairing

/// Separate serial I/O queues keep blocking pipe reads/writes off Swift's cooperative executor.
final class NativeMessageIO: Sendable {
    private let input = FileHandle.standardInput
    private let output = FileHandle.standardOutput
    private let inputQueue = DispatchQueue(label: "com.antonomelchuk.remotecontrol.browser-input")
    private let outputQueue = DispatchQueue(label: "com.antonomelchuk.remotecontrol.browser-output")

    func next() async throws -> Data? {
        try await withCheckedThrowingContinuation { continuation in
            inputQueue.async { [input] in
                do {
                    guard let header = try Self.readExactly(input, count: 4, allowEOF: true) else {
                        continuation.resume(returning: nil)
                        return
                    }
                    let size = try NativeMessageCodec.payloadLength(header: header)
                    let payload = try Self.readExactly(input, count: size, allowEOF: false)
                    continuation.resume(returning: payload)
                } catch { continuation.resume(throwing: PairingFailure.protocolError) }
            }
        }
    }

    func send(_ payload: Data) async throws {
        let bytes = try NativeMessageCodec.frame(payload)
        try await withCheckedThrowingContinuation {
            (continuation: CheckedContinuation<Void, any Error>) in
            outputQueue.async { [output] in
                do {
                    try output.write(contentsOf: bytes)
                    continuation.resume()
                } catch { continuation.resume(throwing: PairingFailure.connection) }
            }
        }
    }

    private static func readExactly(_ handle: FileHandle, count: Int, allowEOF: Bool) throws
        -> Data?
    {
        var result = Data()
        while result.count < count {
            let next = try handle.read(upToCount: count - result.count) ?? Data()
            if next.isEmpty {
                if allowEOF && result.isEmpty { return nil }
                throw PairingFailure.protocolError
            }
            result.append(next)
        }
        return result
    }
}
