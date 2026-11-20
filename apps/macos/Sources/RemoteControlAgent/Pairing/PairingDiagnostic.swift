import Network
import RemotePairing
import Security

/// Never format arbitrary errors, query dictionaries, certificates, or invitation values here.
enum PairingDiagnostic {
    static func describe(_ error: Error, stage: String) -> String {
        if let operation = error as? PairingOperationError {
            let prefix = "\(stage) / \(operation.operation.rawValue)"
            guard let status = operation.status else { return prefix }
            let message = SecCopyErrorMessageString(status, nil) as String? ?? "Unknown status"
            return "\(prefix): OSStatus \(status) — \(message)"
        }
        if let network = error as? NWError {
            switch network {
            case .posix(let code): return "\(stage): POSIX \(code.rawValue)"
            case .dns(let code): return "\(stage): DNS \(code)"
            case .tls(let code): return "\(stage): TLS \(code)"
            @unknown default: return "\(stage): unknown network status"
            }
        }
        if let failure = error as? PairingFailure { return "\(stage): \(failure.rawValue)" }
        return "\(stage): unexpected error"
    }
}
