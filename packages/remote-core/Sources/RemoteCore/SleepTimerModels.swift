import Foundation

public enum SleepTimerLimits {
    public static let minimumMinutes = 1
    public static let maximumMinutes = 720
    public static let maximumLateness: Duration = .seconds(15)
}

public enum SleepTimerPhase: String, Sendable {
    case idle, running, executing, completed, cancelled, failed
    public var isActive: Bool { self == .running || self == .executing }
}

public enum SleepTimerFailure: String, Error, Sendable {
    case invalidDuration, timerChanged, selectionChanged, notReady, bridgeUnavailable
    case blocked, timedOut, late
}

public enum SleepTimerCancellation: String, Sendable {
    case user, selectionChanged, browserDisconnected, connectionsStopped, ownerRevoked
}

public struct SleepTimerState: Equatable, Sendable {
    public let phase: SleepTimerPhase
    public let id: UUID?
    public let selectionID: UUID?
    public let durationSeconds: Int
    public let remainingSeconds: Int
    public let failure: SleepTimerFailure?
    public let cancellation: SleepTimerCancellation?

    public init(
        phase: SleepTimerPhase = .idle, id: UUID? = nil, selectionID: UUID? = nil,
        durationSeconds: Int = 0, remainingSeconds: Int = 0,
        failure: SleepTimerFailure? = nil, cancellation: SleepTimerCancellation? = nil
    ) {
        self.phase = phase
        self.id = id
        self.selectionID = selectionID
        self.durationSeconds = durationSeconds
        self.remainingSeconds = remainingSeconds
        self.failure = failure
        self.cancellation = cancellation
    }
}

public struct SleepTimerExpiration: Equatable, Sendable {
    public let id: UUID
    public let selectionID: UUID
}
