import Foundation
import Observation
import RemotePairing

/// The Mac user enables this independent, browser-only capability explicitly for each Agent run.
@Observable
@MainActor
final class BrowserBridgeAccess {
    private(set) var enabled = false
    private(set) var failed = false
    @ObservationIgnored private let store = BrowserRuntimeStore()
    @ObservationIgnored private var generation: UUID?
    @ObservationIgnored private var verifier: String?
    private static let proofInput = Data("remote-control/browser/v1".utf8)

    func enable(host: String, port: UInt16, fingerprint: String) {
        disable()
        do {
            let token = try PairingCrypto.randomSecret()
            let generation = UUID()
            try store.publish(
                BrowserBridgeConfiguration(
                    generation: generation, host: host, port: port,
                    fingerprint: fingerprint, token: PairingEncoding.base64URL(token)))
            self.generation = generation
            verifier = PairingCrypto.proof(Self.proofInput, secret: token)
            enabled = true
            failed = false
        } catch { failed = true }
    }

    func disable() {
        if let generation { store.remove(generation: generation) }
        generation = nil
        verifier = nil
        enabled = false
        failed = false
    }

    func accepts(_ token: String?) -> Bool {
        guard enabled, let verifier, let token,
            let bytes = try? PairingEncoding.decodeBase64URL(token), bytes.count == 32
        else { return false }
        return PairingCrypto.verify(verifier, input: Self.proofInput, secret: bytes)
    }
}
