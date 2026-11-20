import Foundation
import SwiftASN1
import X509

#if canImport(CryptoKit)
    import CryptoKit
#else
    import Crypto
#endif

enum AgentCertificate {
    static func make(key: P256.Signing.PrivateKey, now: Date) throws -> Data {
        let name = try DistinguishedName { CommonName("Remote Control Agent") }
        let certificate = try Certificate(
            version: .v3, serialNumber: .init(),
            publicKey: Certificate.PublicKey(key.publicKey),
            notValidBefore: now.addingTimeInterval(-300),
            notValidAfter: now.addingTimeInterval(10 * 365 * 24 * 3600),
            issuer: name, subject: name, signatureAlgorithm: .ecdsaWithSHA256,
            extensions: Certificate.Extensions {
                Critical(BasicConstraints.notCertificateAuthority)
                Critical(KeyUsage(digitalSignature: true))
                try ExtendedKeyUsage([.serverAuth])
            },
            issuerPrivateKey: Certificate.PrivateKey(key)
        )
        var serializer = DER.Serializer()
        try serializer.serialize(certificate)
        return Data(serializer.serializedBytes)
    }
}
