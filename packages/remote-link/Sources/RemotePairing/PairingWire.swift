import Foundation

public enum PairingFailure: String, Error, Codable, Sendable {
    case invalidCode, expired, busy, rejected, connection, identity, storage, cancelled,
        protocolError
}

public enum PairingEncoding {
    public static let maximumBytes = 4096

    public static func base64URL(_ data: Data) -> String {
        data.base64EncodedString().replacingOccurrences(of: "+", with: "-")
            .replacingOccurrences(of: "/", with: "_").replacingOccurrences(of: "=", with: "")
    }

    public static func decodeBase64URL(_ value: String) throws -> Data {
        guard value.utf8.count <= maximumBytes,
            value.utf8.allSatisfy({
                (65...90).contains($0) || (97...122).contains($0)
                    || (48...57).contains($0) || $0 == 45 || $0 == 95
            })
        else { throw PairingFailure.invalidCode }
        let padded =
            value.replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
            + String(repeating: "=", count: (4 - value.count % 4) % 4)
        guard let data = Data(base64Encoded: padded), base64URL(data) == value else {
            throw PairingFailure.invalidCode
        }
        return data
    }

    public static func isPrivateIPv4(_ host: String) -> Bool {
        let parts = host.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 4 else { return false }
        let octets = parts.compactMap { part -> UInt8? in
            guard !part.isEmpty, part.count == 1 || part.first != "0",
                part.utf8.allSatisfy({ (48...57).contains($0) })
            else { return nil }
            return UInt8(part)
        }
        guard octets.count == 4 else { return false }
        return octets[0] == 10 || (octets[0] == 172 && (16...31).contains(octets[1]))
            || (octets[0] == 192 && octets[1] == 168)
    }

    public static func validName(_ value: String) -> Bool {
        !value.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && value.utf8.count <= 80
            && !value.unicodeScalars.contains(where: { CharacterSet.controlCharacters.contains($0) }
            )
    }

    public static func validFingerprint(_ value: String) -> Bool {
        value.utf8.count == 64
            && value.utf8.allSatisfy({ (48...57).contains($0) || (97...102).contains($0) })
    }
}

public struct PairingInvitation: Codable, Equatable, Sendable {
    public let version: Int
    public let id: UUID
    public let host: String
    public let port: UInt16
    public let name: String
    public let fingerprint: String
    public let secret: String
    public let expiresAt: Int64

    public init(
        id: UUID, host: String, port: UInt16, name: String, fingerprint: String,
        secret: String, expiresAt: Int64, version: Int = 1
    ) {
        self.version = version
        self.id = id
        self.host = host
        self.port = port
        self.name = name
        self.fingerprint = fingerprint
        self.secret = secret
        self.expiresAt = expiresAt
    }

    public func validate(now: Date) throws {
        guard version == 1, PairingEncoding.isPrivateIPv4(host), port >= 1024,
            PairingEncoding.validName(name), PairingEncoding.validFingerprint(fingerprint),
            (try? PairingEncoding.decodeBase64URL(secret).count) == 32
        else { throw PairingFailure.invalidCode }
        let current = now.timeIntervalSince1970 * 1000
        guard Double(expiresAt) > current, Double(expiresAt) - current <= 125_000 else {
            throw PairingFailure.expired
        }
    }

    public func code() throws -> String {
        let data = try JSONEncoder().encode(self)
        guard data.count <= PairingEncoding.maximumBytes else { throw PairingFailure.invalidCode }
        return "remotecontrol-pair://v1/" + PairingEncoding.base64URL(data)
    }

    public static func parse(_ code: String, now: Date) throws -> Self {
        let prefix = "remotecontrol-pair://v1/"
        guard code.utf8.count <= PairingEncoding.maximumBytes, code.hasPrefix(prefix) else {
            throw PairingFailure.invalidCode
        }
        do {
            let data = try PairingEncoding.decodeBase64URL(String(code.dropFirst(prefix.count)))
            let invitation = try JSONDecoder().decode(Self.self, from: data)
            try invitation.validate(now: now)
            return invitation
        } catch let failure as PairingFailure { throw failure } catch {
            throw PairingFailure.invalidCode
        }
    }
}

public struct PairingFrame: Codable, Sendable {
    public enum Kind: String, Codable, Sendable {
        case request, grant, acknowledge, paired, rejected, authenticate, authenticated, openAudio,
            attachBrowser, browserAttached
    }
    public var version = 1
    public var type: Kind
    public var requestID: UUID
    public var invitationID: UUID?
    public var name: String?
    public var proof: String?
    public var deviceID: UUID?
    public var token: String?
    public var failure: PairingFailure?

    public init(_ type: Kind, requestID: UUID) {
        self.type = type
        self.requestID = requestID
    }

    public func encoded() throws -> Data {
        let data = try JSONEncoder().encode(self)
        guard data.count <= PairingEncoding.maximumBytes else { throw PairingFailure.protocolError }
        return data
    }

    public static func decode(_ data: Data) throws -> Self {
        guard data.count <= PairingEncoding.maximumBytes else { throw PairingFailure.protocolError }
        do {
            let frame = try JSONDecoder().decode(Self.self, from: data)
            guard frame.version == 1 else { throw PairingFailure.protocolError }
            return frame
        } catch { throw PairingFailure.protocolError }
    }

    public var proofInput: Data {
        Data(
            [
                "remote-control/pair/v1", invitationID?.uuidString ?? "",
                requestID.uuidString, name ?? "",
            ].joined(separator: "\n").utf8)
    }
}

public struct SavedMac: Codable, Sendable {
    public let host: String
    public let port: UInt16
    public let name: String
    public let fingerprint: String
    public let deviceID: UUID
    public let token: String

    public init(invitation: PairingInvitation, deviceID: UUID, token: String) {
        host = invitation.host
        port = invitation.port
        name = invitation.name
        fingerprint = invitation.fingerprint
        self.deviceID = deviceID
        self.token = token
    }
}
