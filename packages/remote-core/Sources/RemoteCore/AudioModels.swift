public enum AudioFailure: Error, Equatable, Sendable {
    case invalidVolume
    case noOutput
    case outputChanged
    case volumeUnavailable
    case muteUnavailable
    case hardwareFailure
    case observationUnavailable
}

public struct VolumeLevel: Equatable, Sendable {
    public let scalar: Double

    public init(_ scalar: Double) throws {
        guard scalar.isFinite, (0...1).contains(scalar) else {
            throw AudioFailure.invalidVolume
        }
        self.scalar = scalar
    }
}

public struct AudioOutputID: Equatable, Sendable {
    public let objectID: UInt32
    public let uid: String

    public init(objectID: UInt32, uid: String) {
        self.objectID = objectID
        self.uid = uid
    }
}

public enum AudioControl<Value: Equatable & Sendable>: Equatable, Sendable {
    case unsupported
    case readOnly(Value)
    case writable(Value)

    public var value: Value? {
        switch self {
        case .unsupported: nil
        case .readOnly(let value), .writable(let value): value
        }
    }

    public var canWrite: Bool {
        if case .writable = self { return true }
        return false
    }
}

public struct AudioOutputSnapshot: Equatable, Sendable {
    public let id: AudioOutputID
    public let name: String
    public let volume: AudioControl<VolumeLevel>
    public let mute: AudioControl<Bool>

    public init(
        id: AudioOutputID,
        name: String,
        volume: AudioControl<VolumeLevel>,
        mute: AudioControl<Bool>
    ) {
        self.id = id
        self.name = name
        self.volume = volume
        self.mute = mute
    }
}

public enum AudioState: Equatable, Sendable {
    case output(AudioOutputSnapshot?)
    case failed(AudioFailure)
}

public struct AudioUpdate: Equatable, Sendable {
    public let revision: UInt64
    public let state: AudioState
}

public struct AudioCommandResult: Sendable {
    public let update: AudioUpdate
    public let failure: AudioFailure?
}

public enum AudioHardwareChange: Equatable, Sendable {
    case stateChanged
    case serviceRestarted
}

public protocol AudioObservation: AnyObject {
    func cancel()
}

/// Synchronous operations are serialized by AudioOutputService, away from the UI actor.
public protocol AudioHardwarePort: Sendable {
    func snapshot() throws -> AudioOutputSnapshot?
    func writeVolume(_ level: VolumeLevel, expected: AudioOutputID) throws
    func writeMute(_ muted: Bool, expected: AudioOutputID) throws
    func observe(
        output: AudioOutputID?,
        onChange: @escaping @Sendable (AudioHardwareChange) -> Void
    ) throws -> any AudioObservation
}
