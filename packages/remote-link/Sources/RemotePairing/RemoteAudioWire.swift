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
    public let media: YouTubeSnapshot?
    public let selectionID: UUID?
    public let timer: RemoteSleepTimer?

    public init(
        revision: UInt64, output: RemoteAudioOutput?, failure: RemoteAudioFailure?,
        media: YouTubeSnapshot? = nil, selectionID: UUID? = nil, timer: RemoteSleepTimer? = nil
    ) {
        self.revision = revision
        self.output = output
        self.failure = failure
        self.media = media
        self.selectionID = selectionID
        self.timer = timer
    }

    public func validate() throws {
        try media?.validate()
        try timer?.validate()
        if let timer, timer.phase.isActive, timer.selectionID != selectionID {
            throw PairingFailure.protocolError
        }
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

/// Foreground remote allowlist, separate from onboarding. No input, power, or shell actions exist here.
public struct RemoteAudioFrame: Codable, Sendable {
    public enum Kind: String, Codable, Sendable {
        case audioWelcome, audioUpdate, audioResult, setVolume, setMuted, refreshAudio, setPlayback
        case startSleepTimer, cancelSleepTimer
    }
    public var version = 1
    public var type: Kind
    public var requestID: UUID
    public var sessionID: UUID
    public var sequence: UInt64 = 0
    public var outputID: UUID?
    public var volume: Double?
    public var targetID: UUID?
    public var paused: Bool?
    public var mediaFailure: MediaFailure?
    public var timerFailure: RemoteTimerFailure?
    public var selectionID: UUID?
    public var timerID: UUID?
    public var durationMinutes: Int?
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
                "volume", "muted", "snapshot", "failure", "targetID", "paused", "mediaFailure",
                "timerFailure", "selectionID", "timerID", "durationMinutes",
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
            snapshot == nil, failure == nil, mediaFailure == nil, timerFailure == nil
        else { throw PairingFailure.protocolError }
        guard
            type == .startSleepTimer || type == .cancelSleepTimer
                || (selectionID == nil && timerID == nil && durationMinutes == nil)
        else { throw PairingFailure.protocolError }
        switch type {
        case .setVolume:
            guard outputID != nil, let volume, volume.isFinite, (0...1).contains(volume),
                muted == nil, targetID == nil, paused == nil
            else { throw PairingFailure.protocolError }
        case .setMuted:
            guard outputID != nil, muted != nil, volume == nil, targetID == nil, paused == nil
            else {
                throw PairingFailure.protocolError
            }
        case .refreshAudio:
            guard outputID == nil, volume == nil, muted == nil, targetID == nil, paused == nil
            else {
                throw PairingFailure.protocolError
            }
        case .setPlayback:
            guard targetID != nil, paused != nil, outputID == nil, volume == nil, muted == nil
            else {
                throw PairingFailure.protocolError
            }
        case .startSleepTimer:
            guard selectionID != nil, let durationMinutes, (1...720).contains(durationMinutes),
                targetID == nil, paused == nil, outputID == nil, volume == nil, muted == nil
            else { throw PairingFailure.protocolError }
        case .cancelSleepTimer:
            guard timerID != nil, selectionID == nil, durationMinutes == nil,
                targetID == nil, paused == nil, outputID == nil, volume == nil, muted == nil
            else { throw PairingFailure.protocolError }
        default: throw PairingFailure.protocolError
        }
    }

    public func validateServerFrame() throws {
        guard version == 1, outputID == nil, volume == nil, muted == nil, targetID == nil,
            paused == nil, selectionID == nil, timerID == nil, durationMinutes == nil, let snapshot
        else {
            throw PairingFailure.protocolError
        }
        try snapshot.validate()
        switch type {
        case .audioWelcome, .audioUpdate:
            guard sequence == 0, failure == nil, mediaFailure == nil, timerFailure == nil else {
                throw PairingFailure.protocolError
            }
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
    private var budget: RequestBudget

    public init(sessionID: UUID, now: ContinuousClock.Instant) {
        self.sessionID = sessionID
        budget = RequestBudget(now: now)
    }

    public mutating func accept(_ frame: RemoteAudioFrame, now: ContinuousClock.Instant) throws {
        try frame.validateCommand()
        guard frame.sessionID == sessionID, frame.sequence == nextSequence else {
            throw PairingFailure.protocolError
        }
        try budget.consume(now: now)
        nextSequence += 1
    }
}
