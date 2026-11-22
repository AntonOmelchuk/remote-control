/// Safe native diagnostics contain operation identifiers and numeric status codes only.
public struct PairingOperationError: Error, Sendable {
    public enum Operation: String, Sendable {
        case readCredential = "keychain.read-credential"
        case decodeCredential = "keychain.decode-credential"
        case updateCredential = "keychain.update-credential"
        case insertCredential = "keychain.insert-credential"
        case deleteCredential = "keychain.delete-credential"
        case readCertificate = "identity.read-certificate"
        case decodeCertificate = "identity.decode-certificate"
        case importPrivateKey = "identity.import-private-key"
        case savePrivateKey = "identity.save-private-key"
        case saveCertificate = "identity.save-certificate"
        case resolveIdentity = "identity.resolve-private-key"
    }

    public let operation: Operation
    public let status: Int32?

    public init(_ operation: Operation, status: Int32? = nil) {
        self.operation = operation
        self.status = status
    }
}
