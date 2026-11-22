import Foundation

public enum RemoteAudioFailure: String, Codable, Error, Sendable {
    case invalidVolume, noOutput, outputChanged, volumeUnavailable, muteUnavailable
    case hardwareFailure, observationUnavailable
}

/// Hardware identity remains on the Mac; the opaque token changes with the output route.
public struct RemoteAudioOutput: Codable, Equatable, Sendable {
    public let id: UUID
    public let name: String
    public let volume: Double?
    public let canSetVolume: Bool
    public let muted: Bool?
    public let canSetMute: Bool

    public init(
        id: UUID, name: String, volume: Double?, canSetVolume: Bool,
        muted: Bool?, canSetMute: Bool
    ) {
        self.id = id
        self.name = name
        self.volume = volume
        self.canSetVolume = canSetVolume
        self.muted = muted
        self.canSetMute = canSetMute
    }
}

public struct RemoteAudioSnapshot: Codable, Equatable, Sendable {
    public let revision: UInt64
    public let output: RemoteAudioOutput?
    public let failure: RemoteAudioFailure?

    public init(revision: UInt64, output: RemoteAudioOutput?, failure: RemoteAudioFailure?) {
        self.revision = revision
        self.output = output
        self.failure = failure
    }

    public func validate() throws {
        // The Expo facade exposes JSON numbers, so revisions must remain exactly representable.
        guard revision <= 9_007_199_254_740_991, output == nil || failure == nil else {
            throw PairingFailure.protocolError
        }
        if let output {
            guard !output.name.isEmpty, output.name.utf8.count <= 160,
                !output.name.unicodeScalars.contains(where: {
                    CharacterSet.controlCharacters.contains($0)
                }),
                output.volume.map({ $0.isFinite && (0...1).contains($0) }) ?? true,
                !output.canSetVolume || output.volume != nil,
                !output.canSetMute || output.muted != nil
            else { throw PairingFailure.protocolError }
        }
    }
}

/// Separate allowlist from onboarding. No media, input, power, or shell actions exist here.
public struct RemoteAudioFrame: Codable, Sendable {
    public enum Kind: String, Codable, Sendable {
        case audioWelcome, audioUpdate, audioResult, setVolume, setMuted, refreshAudio
    }
    public var version = 1
    public var type: Kind
    public var requestID: UUID
    public var sessionID: UUID
    public var sequence: UInt64 = 0
    public var outputID: UUID?
    public var volume: Double?
    public var muted: Bool?
    public var snapshot: RemoteAudioSnapshot?
    public var failure: RemoteAudioFailure?

    public init(_ type: Kind, requestID: UUID, sessionID: UUID) {
        self.type = type
        self.requestID = requestID
        self.sessionID = sessionID
    }

    public func encoded() throws -> Data {
        let data = try JSONEncoder().encode(self)
        guard data.count <= PairingEncoding.maximumBytes else { throw PairingFailure.protocolError }
        return data
    }

    public static func decode(_ data: Data) throws -> Self {
        guard data.count <= PairingEncoding.maximumBytes else { throw PairingFailure.protocolError }
        do {
            let allowed: Set<String> = [
                "version", "type", "requestID", "sessionID", "sequence", "outputID",
                "volume", "muted", "snapshot", "failure",
            ]
            guard let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
                Set(object.keys).isSubset(of: allowed)
            else { throw PairingFailure.protocolError }
            let frame = try JSONDecoder().decode(Self.self, from: data)
            guard frame.version == 1 else { throw PairingFailure.protocolError }
            return frame
        } catch { throw PairingFailure.protocolError }
    }

    public func validateCommand() throws {
        guard version == 1, sequence > 0, sequence <= 9_007_199_254_740_991,
            snapshot == nil, failure == nil
        else { throw PairingFailure.protocolError }
        switch type {
        case .setVolume:
            guard outputID != nil, let volume, volume.isFinite, (0...1).contains(volume),
                muted == nil
            else { throw PairingFailure.protocolError }
        case .setMuted:
            guard outputID != nil, muted != nil, volume == nil else {
                throw PairingFailure.protocolError
            }
        case .refreshAudio:
            guard outputID == nil, volume == nil, muted == nil else {
                throw PairingFailure.protocolError
            }
        default: throw PairingFailure.protocolError
        }
    }

    public func validateServerFrame() throws {
        guard version == 1, outputID == nil, volume == nil, muted == nil, let snapshot else {
            throw PairingFailure.protocolError
        }
        try snapshot.validate()
        switch type {
        case .audioWelcome, .audioUpdate:
            guard sequence == 0, failure == nil else { throw PairingFailure.protocolError }
        case .audioResult:
            guard sequence > 0, sequence <= 9_007_199_254_740_991 else {
                throw PairingFailure.protocolError
            }
        default: throw PairingFailure.protocolError
        }
    }
}

/// Created only after credential verification. Sequence/rate checks precede hardware dispatch.
public struct RemoteAudioGate: Sendable {
    public let sessionID: UUID
    private var nextSequence: UInt64 = 1
    private var tokens = 10.0
    private var last: ContinuousClock.Instant

    public init(sessionID: UUID, now: ContinuousClock.Instant) {
        self.sessionID = sessionID
        last = now
    }

    public mutating func accept(_ frame: RemoteAudioFrame, now: ContinuousClock.Instant) throws {
        try frame.validateCommand()
        guard frame.sessionID == sessionID, frame.sequence == nextSequence, now >= last else {
            throw PairingFailure.protocolError
        }
        let elapsed = last.duration(to: now).components
        let seconds = Double(elapsed.seconds) + Double(elapsed.attoseconds) / 1e18
        let available = min(10, tokens + seconds * 10)
        guard available >= 1 else { throw PairingFailure.busy }
        tokens = available - 1
        last = now
        nextSequence += 1
    }
}
