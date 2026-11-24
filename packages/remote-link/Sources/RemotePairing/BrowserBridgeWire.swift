import Foundation

/// The browser channel can publish one selected YouTube target and answer bounded playback requests.
public struct BrowserBridgeFrame: Codable, Sendable {
    public enum Kind: String, Codable, Sendable {
        case browserState, browserResult, browserCommand, browserHeartbeat, browserReady
    }
    public var version = 1
    public var type: Kind
    public var sequence: UInt64 = 0
    public var requestID: UUID?
    public var targetID: UUID?
    public var selectionID: UUID?
    public var paused: Bool?
    public var snapshot: YouTubeSnapshot?
    public var failure: MediaFailure?

    public init(_ type: Kind) { self.type = type }

    public func validateUpstream() throws {
        guard version == 1, targetID == nil, paused == nil else {
            throw PairingFailure.protocolError
        }
        switch type {
        case .browserState:
            guard requestID == nil, failure == nil, let snapshot,
                snapshot.availability == .ready || snapshot.availability == .advertisement
                    || snapshot.availability == .unavailable
            else { throw PairingFailure.protocolError }
            try snapshot.validate()
        case .browserResult:
            guard requestID != nil, snapshot == nil, selectionID == nil else {
                throw PairingFailure.protocolError
            }
        case .browserHeartbeat:
            guard requestID == nil, snapshot == nil, failure == nil, selectionID == nil else {
                throw PairingFailure.protocolError
            }
        default: throw PairingFailure.protocolError
        }
    }

    public func validateDownstream() throws {
        guard version == 1, sequence == 0, snapshot == nil, failure == nil, selectionID == nil
        else {
            throw PairingFailure.protocolError
        }
        switch type {
        case .browserCommand:
            guard requestID != nil, targetID != nil, paused != nil else {
                throw PairingFailure.protocolError
            }
        case .browserReady, .browserHeartbeat:
            guard requestID == nil, targetID == nil, paused == nil else {
                throw PairingFailure.protocolError
            }
        default: throw PairingFailure.protocolError
        }
    }

    public func encoded() throws -> Data {
        let data = try JSONEncoder().encode(self)
        guard data.count <= PairingEncoding.maximumBytes else { throw PairingFailure.protocolError }
        return data
    }

    public static func decode(_ data: Data) throws -> Self {
        guard data.count <= PairingEncoding.maximumBytes else { throw PairingFailure.protocolError }
        do {
            let keys: Set<String> = [
                "version", "type", "sequence", "requestID", "targetID", "paused", "snapshot",
                "failure", "selectionID",
            ]
            guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                Set(object.keys).isSubset(of: keys)
            else { throw PairingFailure.protocolError }
            let frame = try JSONDecoder().decode(Self.self, from: data)
            guard frame.version == 1 else { throw PairingFailure.protocolError }
            return frame
        } catch { throw PairingFailure.protocolError }
    }
}

public struct BrowserBridgeGate: Sendable {
    private var next: UInt64 = 1
    private var budget: RequestBudget
    public init(now: ContinuousClock.Instant) { budget = RequestBudget(now: now) }
    public mutating func accept(_ frame: BrowserBridgeFrame, now: ContinuousClock.Instant) throws {
        try frame.validateUpstream()
        guard frame.sequence == next, next <= 9_007_199_254_740_991 else {
            throw PairingFailure.protocolError
        }
        try budget.consume(now: now)
        next += 1
    }
}

/// Chrome uses native-endian UInt32 framing; all supported Apple Silicon/Intel Macs are little-endian.
public enum NativeMessageCodec {
    public static func payloadLength(header: Data) throws -> Int {
        guard header.count == 4 else { throw PairingFailure.protocolError }
        let length = header.enumerated().reduce(UInt32(0)) {
            $0 | (UInt32($1.element) << ($1.offset * 8))
        }
        guard length > 0, length <= PairingEncoding.maximumBytes else {
            throw PairingFailure.protocolError
        }
        return Int(length)
    }
    public static func frame(_ payload: Data) throws -> Data {
        guard !payload.isEmpty, payload.count <= PairingEncoding.maximumBytes else {
            throw PairingFailure.protocolError
        }
        let size = UInt32(payload.count)
        let header = Data((0..<4).map { UInt8(truncatingIfNeeded: size >> ($0 * 8)) })
        return header + payload
    }
}

public struct BrowserBridgeConfiguration: Codable, Sendable {
    public let generation: UUID
    public let host: String
    public let port: UInt16
    public let fingerprint: String
    public let token: String
    public init(generation: UUID, host: String, port: UInt16, fingerprint: String, token: String) {
        self.generation = generation
        self.host = host
        self.port = port
        self.fingerprint = fingerprint
        self.token = token
    }
    public func validate() throws {
        guard PairingEncoding.isPrivateIPv4(host), port >= 1024,
            PairingEncoding.validFingerprint(fingerprint),
            (try? PairingEncoding.decodeBase64URL(token).count) == 32
        else { throw PairingFailure.protocolError }
    }
}
