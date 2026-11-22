import Foundation
import Security

#if canImport(RemotePairing)
    import RemotePairing
#endif

final class PinnedTLSDelegate: NSObject, URLSessionDelegate, URLSessionTaskDelegate,
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

enum PinnedTransport {
    static func open(host: String, port: UInt16, fingerprint: String, resourceTimeout: TimeInterval)
        throws -> (URLSession, URLSessionWebSocketTask)
    {
        guard PairingEncoding.isPrivateIPv4(host), port >= 1024,
            PairingEncoding.validFingerprint(fingerprint),
            let url = URL(string: "wss://\(host):\(port)/pairing/v1")
        else { throw PairingFailure.invalidCode }
        let configuration = URLSessionConfiguration.ephemeral
        configuration.tlsMinimumSupportedProtocolVersion = .TLSv13
        configuration.timeoutIntervalForRequest = 60
        configuration.timeoutIntervalForResource = resourceTimeout
        configuration.urlCache = nil
        configuration.httpCookieStorage = nil
        let session = URLSession(
            configuration: configuration,
            delegate: PinnedTLSDelegate(fingerprint: fingerprint), delegateQueue: nil)
        let socket = session.webSocketTask(with: url)
        socket.maximumMessageSize = PairingEncoding.maximumBytes
        socket.resume()
        return (session, socket)
    }

    static func receive(_ socket: URLSessionWebSocketTask, timeout: Duration) async throws -> Data {
        try await withThrowingTaskGroup(of: Data.self) { group in
            group.addTask {
                guard case .string(let value) = try await socket.receive() else {
                    throw PairingFailure.protocolError
                }
                let data = Data(value.utf8)
                guard data.count <= PairingEncoding.maximumBytes else {
                    throw PairingFailure.protocolError
                }
                return data
            }
            group.addTask {
                try await Task.sleep(for: timeout)
                socket.cancel(with: .goingAway, reason: nil)
                throw PairingFailure.connection
            }
            defer { group.cancelAll() }
            guard let data = try await group.next() else { throw PairingFailure.connection }
            return data
        }
    }
}
