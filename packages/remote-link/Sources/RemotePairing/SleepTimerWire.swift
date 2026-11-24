import Foundation

public enum RemoteTimerFailure: String, Codable, Error, Sendable {
    case invalidDuration, timerChanged, selectionChanged, notReady, bridgeUnavailable
    case blocked, timedOut, late
}

public struct RemoteSleepTimer: Codable, Equatable, Sendable {
    public enum Phase: String, Codable, Sendable {
        case idle, running, executing, completed, cancelled, failed
        public var isActive: Bool { self == .running || self == .executing }
    }
    public enum Cancellation: String, Codable, Sendable {
        case user, selectionChanged, browserDisconnected, connectionsStopped, ownerRevoked
    }
    public let phase: Phase
    public let id: UUID?
    public let selectionID: UUID?
    public let durationSeconds: Int
    public let remainingSeconds: Int
    public let failure: RemoteTimerFailure?
    public let cancellation: Cancellation?
    public init(
        phase: Phase = .idle, id: UUID? = nil, selectionID: UUID? = nil,
        durationSeconds: Int = 0, remainingSeconds: Int = 0,
        failure: RemoteTimerFailure? = nil, cancellation: Cancellation? = nil
    ) {
        self.phase = phase
        self.id = id
        self.selectionID = selectionID
        self.durationSeconds = durationSeconds
        self.remainingSeconds = remainingSeconds
        self.failure = failure
        self.cancellation = cancellation
    }
    public func validate() throws {
        if phase == .idle {
            guard id == nil, selectionID == nil, durationSeconds == 0, remainingSeconds == 0,
                failure == nil, cancellation == nil
            else { throw PairingFailure.protocolError }
            return
        }
        guard id != nil, selectionID != nil, (60...43_200).contains(durationSeconds),
            durationSeconds % 60 == 0, (0...durationSeconds).contains(remainingSeconds),
            phase == .running ? remainingSeconds > 0 : remainingSeconds == 0,
            phase == .failed ? failure != nil : failure == nil,
            phase == .cancelled ? cancellation != nil : cancellation == nil
        else { throw PairingFailure.protocolError }
    }
}
