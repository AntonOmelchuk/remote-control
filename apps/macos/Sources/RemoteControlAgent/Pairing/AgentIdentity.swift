import CryptoKit
import Foundation
import RemotePairing
import Security

struct AgentIdentity {
    let identity: SecIdentity
    let fingerprint: String
    private static let label = "com.antonomelchuk.remotecontrol.agent.tls.v1"

    static func loadOrCreate() throws -> Self {
        let query: [String: Any] = [
            kSecClass as String: kSecClassCertificate, kSecAttrLabel as String: label,
            kSecUseDataProtectionKeychain as String: true,
            kSecReturnRef as String: true, kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        if status == errSecSuccess, let item, CFGetTypeID(item) == SecCertificateGetTypeID() {
            let certificate = item as! SecCertificate
            return try resolve(certificate)
        }
        guard status == errSecItemNotFound else {
            throw PairingOperationError(.readCertificate, status: status)
        }

        let key = P256.Signing.PrivateKey()
        let certificateData = try AgentCertificate.make(key: key, now: Date())
        guard
            let secCertificate = SecCertificateCreateWithData(
                nil, certificateData as CFData)
        else { throw PairingOperationError(.decodeCertificate) }
        let keyAttributes: [String: Any] = [
            kSecAttrKeyType as String: kSecAttrKeyTypeECSECPrimeRandom,
            kSecAttrKeyClass as String: kSecAttrKeyClassPrivate,
        ]
        var keyError: Unmanaged<CFError>?
        guard
            let secKey = SecKeyCreateWithData(
                key.x963Representation as CFData,
                keyAttributes as CFDictionary, &keyError)
        else {
            let status = keyError.map { Int32(clamping: CFErrorGetCode($0.takeRetainedValue())) }
            throw PairingOperationError(.importPrivateKey, status: status)
        }
        let keyQuery: [String: Any] = [
            kSecClass as String: kSecClassKey,
            kSecValueRef as String: secKey, kSecAttrApplicationTag as String: Data(label.utf8),
            kSecAttrLabel as String: label,
            kSecUseDataProtectionKeychain as String: true,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]
        let keyStatus = SecItemAdd(keyQuery as CFDictionary, nil)
        guard keyStatus == errSecSuccess else {
            throw PairingOperationError(.savePrivateKey, status: keyStatus)
        }
        let certQuery: [String: Any] = [
            kSecClass as String: kSecClassCertificate,
            kSecValueRef as String: secCertificate, kSecAttrLabel as String: label,
            kSecUseDataProtectionKeychain as String: true,
        ]
        let certificateStatus = SecItemAdd(certQuery as CFDictionary, nil)
        guard certificateStatus == errSecSuccess else {
            let cleanup: [String: Any] = [
                kSecClass as String: kSecClassKey,
                kSecValueRef as String: secKey,
                kSecUseDataProtectionKeychain as String: true,
            ]
            SecItemDelete(cleanup as CFDictionary)
            throw PairingOperationError(.saveCertificate, status: certificateStatus)
        }
        return try resolve(secCertificate)
    }

    private static func resolve(_ certificate: SecCertificate) throws -> Self {
        let query: [String: Any] = [
            kSecClass as String: kSecClassIdentity,
            kSecAttrLabel as String: label,
            kSecUseDataProtectionKeychain as String: true,
            kSecReturnRef as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]
        var item: CFTypeRef?
        let status = SecItemCopyMatching(query as CFDictionary, &item)
        guard status == errSecSuccess else {
            throw PairingOperationError(.resolveIdentity, status: status)
        }
        guard let item, CFGetTypeID(item) == SecIdentityGetTypeID() else {
            throw PairingOperationError(.resolveIdentity)
        }
        let identity = item as! SecIdentity
        var identityCertificate: SecCertificate?
        let certificateStatus = SecIdentityCopyCertificate(identity, &identityCertificate)
        guard certificateStatus == errSecSuccess else {
            throw PairingOperationError(.readCertificate, status: certificateStatus)
        }
        guard let identityCertificate,
            SecCertificateCopyData(identityCertificate) as Data == SecCertificateCopyData(
                certificate) as Data
        else { throw PairingOperationError(.resolveIdentity) }
        return Self(
            identity: identity,
            fingerprint: PairingCrypto.fingerprint(
                SecCertificateCopyData(identityCertificate) as Data))
    }
}
