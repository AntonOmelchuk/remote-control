import Foundation
import RemotePairing
import Testing

@Suite("Pairing boundaries")
struct PairingTests {
    let instant = ContinuousClock.now
    let now = Date(timeIntervalSince1970: 1_800_000_000)

    func invitation(
        host: String = "192.168.1.10", port: UInt16 = 49322,
        version: Int = 1, fingerprint: String = String(repeating: "a", count: 64),
        secret: String = PairingEncoding.base64URL(Data(repeating: 7, count: 32)),
        expiry: Int64 = 1_800_000_120_000
    ) -> PairingInvitation {
        PairingInvitation(
            id: UUID(), host: host, port: port, name: "My Mac",
            fingerprint: fingerprint, secret: secret, expiresAt: expiry, version: version)
    }

    @Test func invitationRoundTrip() throws {
        let value = invitation()
        #expect(try PairingInvitation.parse(value.code(), now: now) == value)
    }

    @Test func encodedSecretsAreCanonical() throws {
        for count in 0...64 {
            let data = Data(repeating: UInt8(count), count: count)
            #expect(try PairingEncoding.decodeBase64URL(PairingEncoding.base64URL(data)) == data)
        }
        #expect(throws: PairingFailure.invalidCode) { try PairingEncoding.decodeBase64URL("AA==") }
        #expect(throws: PairingFailure.invalidCode) { try PairingEncoding.decodeBase64URL("AB") }
    }

    @Test(arguments: [
        "8.8.8.8", "127.0.0.1", "169.254.1.1", "192.168.01.1", "10.0.0.999",
        "10.0.0.1.evil", "user@10.0.0.1", "10.0.0.1/path", "::1", "localhost",
    ])
    func rejectsNonLocalAddresses(_ host: String) {
        #expect(throws: PairingFailure.invalidCode) {
            try invitation(host: host).validate(now: now)
        }
    }

    @Test(arguments: ["10.0.0.1", "172.16.0.1", "172.31.255.255", "192.168.10.20"])
    func acceptsPrivateAddresses(_ host: String) throws {
        try invitation(host: host).validate(now: now)
    }

    @Test func expiryAndFutureLimit() {
        #expect(throws: PairingFailure.expired) {
            try invitation(expiry: 1_800_000_000_000).validate(now: now)
        }
        #expect(throws: PairingFailure.expired) {
            try invitation(expiry: 1_800_000_126_000).validate(now: now)
        }
    }

    @Test func validatesTrustMaterialAndVersion() {
        #expect(throws: PairingFailure.invalidCode) {
            try invitation(version: 2).validate(now: now)
        }
        #expect(throws: PairingFailure.invalidCode) { try invitation(port: 443).validate(now: now) }
        #expect(throws: PairingFailure.invalidCode) {
            try invitation(fingerprint: "abcd").validate(now: now)
        }
        #expect(throws: PairingFailure.invalidCode) {
            try invitation(secret: "AA").validate(now: now)
        }
    }

    @Test func rejectsWrongCodeSchemeAndOversize() {
        #expect(throws: PairingFailure.invalidCode) {
            try PairingInvitation.parse("https://example.org", now: now)
        }
        #expect(throws: PairingFailure.invalidCode) {
            try PairingInvitation.parse(String(repeating: "a", count: 5000), now: now)
        }
    }

    @Test func namesAreBoundedWithoutControlCharacters() {
        #expect(PairingEncoding.validName("Антон — iPhone"))
        #expect(!PairingEncoding.validName("  "))
        #expect(!PairingEncoding.validName("iPhone\nAllow access"))
        #expect(!PairingEncoding.validName(String(repeating: "x", count: 81)))
    }

    @Test func frameRejectsUnsupportedVersionUnknownActionsAndLargeMessages() throws {
        let frame = PairingFrame(.request, requestID: UUID())
        #expect(try PairingFrame.decode(frame.encoded()).requestID == frame.requestID)
        let invalidVersion = Data(
            "{\"version\":2,\"type\":\"request\",\"requestID\":\"\(frame.requestID)\"}".utf8)
        #expect(throws: PairingFailure.protocolError) { try PairingFrame.decode(invalidVersion) }
        #expect(throws: PairingFailure.protocolError) {
            try PairingFrame.decode(Data("{\"type\":\"shutdown\"}".utf8))
        }
        #expect(throws: PairingFailure.protocolError) {
            try PairingFrame.decode(Data(repeating: 32, count: 4097))
        }
    }

    @Test func proofInputBindsTheRequestInvitationAndName() {
        var first = PairingFrame(.request, requestID: UUID())
        first.invitationID = UUID()
        first.name = "iPhone"
        var next = first
        next.requestID = UUID()
        #expect(first.proofInput != next.proofInput)
        next = first
        next.invitationID = UUID()
        #expect(first.proofInput != next.proofInput)
        next = first
        next.name = "Other iPhone"
        #expect(first.proofInput != next.proofInput)
    }

    @Test func approvalIsSingleUseAndRequiresReservation() throws {
        var gate = PairingGate()
        let invitation = UUID()
        let request = UUID()
        gate.open(id: invitation, now: instant.advanced(by: .seconds(100)))
        #expect(throws: PairingFailure.protocolError) {
            try gate.approve(request: request, now: instant.advanced(by: .seconds(101)))
        }
        try gate.reserve(
            invitation: invitation, request: request, now: instant.advanced(by: .seconds(101)))
        #expect(throws: PairingFailure.busy) {
            try gate.reserve(
                invitation: invitation, request: UUID(), now: instant.advanced(by: .seconds(102)))
        }
        try gate.approve(request: request, now: instant.advanced(by: .seconds(103)))
        #expect(throws: PairingFailure.expired) {
            try gate.validate(id: invitation, now: instant.advanced(by: .seconds(104)))
        }
    }

    @Test func approvalRechecksDeadline() throws {
        var gate = PairingGate()
        let id = UUID()
        let request = UUID()
        gate.open(id: id, now: instant.advanced(by: .seconds(100)))
        try gate.reserve(invitation: id, request: request, now: instant.advanced(by: .seconds(219)))
        #expect(throws: PairingFailure.expired) {
            try gate.approve(request: request, now: instant.advanced(by: .seconds(220)))
        }
    }

    @Test func wrongInvitationCannotReserve() {
        var gate = PairingGate()
        gate.open(id: UUID(), now: instant.advanced(by: .seconds(100)))
        #expect(throws: PairingFailure.invalidCode) {
            try gate.reserve(
                invitation: UUID(), request: UUID(), now: instant.advanced(by: .seconds(101)))
        }
        #expect(gate.pendingRequestID == nil)
    }

    @Test func fiveInvalidProofsCloseTheWindow() throws {
        var gate = PairingGate()
        let id = UUID()
        gate.open(id: id, now: instant.advanced(by: .seconds(100)))
        for _ in 0..<4 { gate.recordInvalidProof() }
        try gate.validate(id: id, now: instant.advanced(by: .seconds(101)))
        gate.recordInvalidProof()
        #expect(throws: PairingFailure.expired) {
            try gate.validate(id: id, now: instant.advanced(by: .seconds(101)))
        }
    }

    @Test func cancellingOrReplacingInvalidatesPreviousInvitation() throws {
        var gate = PairingGate()
        let old = UUID()
        gate.open(id: old, now: instant.advanced(by: .seconds(100)))
        gate.cancel()
        #expect(throws: PairingFailure.expired) {
            try gate.validate(id: old, now: instant.advanced(by: .seconds(101)))
        }
        let next = UUID()
        gate.open(id: next, now: instant.advanced(by: .seconds(102)))
        #expect(throws: PairingFailure.invalidCode) {
            try gate.validate(id: old, now: instant.advanced(by: .seconds(103)))
        }
        try gate.validate(id: next, now: instant.advanced(by: .seconds(103)))
    }
}

#if canImport(CryptoKit) && canImport(Security)
    @Suite("Apple pairing cryptography")
    struct PairingCryptoTests {
        @Test func proofBindsMessageAndSecret() throws {
            let secret = try PairingCrypto.randomSecret()
            let input = Data("request-one".utf8)
            let proof = PairingCrypto.proof(input, secret: secret)
            #expect(PairingCrypto.verify(proof, input: input, secret: secret))
            #expect(!PairingCrypto.verify(proof, input: Data("request-two".utf8), secret: secret))
            #expect(
                !PairingCrypto.verify(proof, input: input, secret: try PairingCrypto.randomSecret())
            )
            #expect(!PairingCrypto.verify("invalid", input: input, secret: secret))
        }

        @Test func comparisonKeepsLeadingZeroesAndIsDeterministic() {
            let input = Data("comparison".utf8)
            let secret = Data(repeating: 8, count: 32)
            let value = PairingCrypto.comparison(input, secret: secret)
            #expect(value.count == 6)
            let containsOnlyDigits = value.allSatisfy { $0.isNumber }
            #expect(containsOnlyDigits)
            #expect(value == PairingCrypto.comparison(input, secret: secret))
        }

        @Test func fingerprintsAreFixedLengthLowercaseHex() {
            let value = PairingCrypto.fingerprint(Data("certificate".utf8))
            #expect(PairingEncoding.validFingerprint(value))
            #expect(value != PairingCrypto.fingerprint(Data("other".utf8)))
        }
    }
#endif
