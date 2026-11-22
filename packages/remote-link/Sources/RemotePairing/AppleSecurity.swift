#if canImport(Security) && canImport(CryptoKit)
    import CryptoKit
    import Foundation
    import Security

    public enum PairingCrypto {
        public static func randomSecret() throws -> Data {
            var bytes = [UInt8](repeating: 0, count: 32)
            guard SecRandomCopyBytes(kSecRandomDefault, bytes.count, &bytes) == errSecSuccess else {
                throw PairingFailure.storage
            }
            return Data(bytes)
        }

        public static func fingerprint(_ certificate: Data) -> String {
            SHA256.hash(data: certificate).map { String(format: "%02x", $0) }.joined()
        }

        public static func proof(_ input: Data, secret: Data) -> String {
            PairingEncoding.base64URL(
                Data(
                    HMAC<SHA256>.authenticationCode(
                        for: input, using: SymmetricKey(data: secret))))
        }

        public static func verify(_ proof: String, input: Data, secret: Data) -> Bool {
            guard let tag = try? PairingEncoding.decodeBase64URL(proof) else { return false }
            return HMAC<SHA256>.isValidAuthenticationCode(
                tag, authenticating: input,
                using: SymmetricKey(data: secret))
        }

        public static func comparison(_ input: Data, secret: Data) -> String {
            let tag = Array(
                HMAC<SHA256>.authenticationCode(
                    for: input,
                    using: SymmetricKey(data: secret)))
            let number = tag.prefix(4).reduce(UInt32(0)) { ($0 << 8) | UInt32($1) }
            return String(format: "%06u", number % 1_000_000)
        }
    }

    public struct PairingKeychain: Sendable {
        private let service: String
        public init(service: String) { self.service = service }

        public func load(_ account: String) throws -> Data? {
            var query = base(account)
            query[kSecReturnData as String] = true
            query[kSecMatchLimit as String] = kSecMatchLimitOne
            var result: CFTypeRef?
            let status = SecItemCopyMatching(query as CFDictionary, &result)
            if status == errSecItemNotFound { return nil }
            guard status == errSecSuccess else {
                throw PairingOperationError(.readCredential, status: status)
            }
            guard let data = result as? Data else {
                throw PairingOperationError(.decodeCredential)
            }
            return data
        }

        public func save(_ data: Data, account: String) throws {
            let update = [kSecValueData as String: data]
            let status = SecItemUpdate(base(account) as CFDictionary, update as CFDictionary)
            if status == errSecSuccess { return }
            guard status == errSecItemNotFound else {
                throw PairingOperationError(.updateCredential, status: status)
            }
            var query = base(account)
            query[kSecValueData as String] = data
            query[kSecAttrAccessible as String] = kSecAttrAccessibleWhenUnlockedThisDeviceOnly
            let insertionStatus = SecItemAdd(query as CFDictionary, nil)
            guard insertionStatus == errSecSuccess else {
                throw PairingOperationError(.insertCredential, status: insertionStatus)
            }
        }

        public func delete(_ account: String) throws {
            let status = SecItemDelete(base(account) as CFDictionary)
            guard status == errSecSuccess || status == errSecItemNotFound else {
                throw PairingOperationError(.deleteCredential, status: status)
            }
        }

        private func base(_ account: String) -> [String: Any] {
            [
                kSecClass as String: kSecClassGenericPassword, kSecAttrService as String: service,
                kSecAttrAccount as String: account, kSecAttrSynchronizable as String: false,
                kSecUseDataProtectionKeychain as String: true,
            ]
        }
    }
#endif
