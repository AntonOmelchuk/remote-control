import Foundation

/// Pure deadline/ownership state machine. The platform controller schedules ticks and performs I/O.
public struct SleepTimerMachine: Sendable {
    public private(set) var state = SleepTimerState()
    private var deadline: ContinuousClock.Instant?
    private var ownerID: UUID?

    public init() {}

    public mutating func start(
        minutes: Int, selectionID: UUID, expectedID: UUID?, ownerID: UUID,
        now: ContinuousClock.Instant
    ) throws {
        guard (SleepTimerLimits.minimumMinutes...SleepTimerLimits.maximumMinutes).contains(minutes)
        else { throw SleepTimerFailure.invalidDuration }
        guard state.id == expectedID else { throw SleepTimerFailure.timerChanged }
        let duration = minutes * 60
        self.ownerID = ownerID
        deadline = now.advanced(by: .seconds(duration))
        state = SleepTimerState(
            phase: .running, id: UUID(), selectionID: selectionID,
            durationSeconds: duration, remainingSeconds: duration)
    }

    public mutating func cancel(expectedID: UUID) throws {
        guard state.id == expectedID, state.phase.isActive else {
            throw SleepTimerFailure.timerChanged
        }
        cancel(reason: .user)
    }

    public mutating func cancel(reason: SleepTimerCancellation) {
        guard state.phase.isActive else { return }
        transition(.cancelled, cancellation: reason)
    }

    public mutating func selectionChanged(to selectionID: UUID?, disconnected: Bool = false) {
        if state.phase.isActive && (disconnected || state.selectionID != selectionID) {
            cancel(reason: disconnected ? .browserDisconnected : .selectionChanged)
        }
    }

    public mutating func revoke(ownerID: UUID) {
        if self.ownerID == ownerID { cancel(reason: .ownerRevoked) }
    }

    /// Emits at most one expiration. A delayed wake never dispatches an hours-old pause.
    public mutating func tick(now: ContinuousClock.Instant) -> SleepTimerExpiration? {
        guard state.phase == .running, let deadline, let id = state.id,
            let selection = state.selectionID
        else { return nil }
        if now < deadline {
            let components = now.duration(to: deadline).components
            let seconds = Double(components.seconds) + Double(components.attoseconds) / 1e18
            state = SleepTimerState(
                phase: .running, id: id, selectionID: selection,
                durationSeconds: state.durationSeconds,
                remainingSeconds: min(state.durationSeconds, max(1, Int(seconds.rounded(.up)))))
            return nil
        }
        if deadline.duration(to: now) > SleepTimerLimits.maximumLateness {
            transition(.failed, failure: .late)
            return nil
        }
        self.deadline = nil
        state = SleepTimerState(
            phase: .executing, id: id, selectionID: selection,
            durationSeconds: state.durationSeconds)
        return SleepTimerExpiration(id: id, selectionID: selection)
    }

    public mutating func finish(id: UUID, failure: SleepTimerFailure?) {
        guard state.id == id, state.phase == .executing else { return }
        transition(failure == nil ? .completed : .failed, failure: failure)
    }

    private mutating func transition(
        _ phase: SleepTimerPhase, failure: SleepTimerFailure? = nil,
        cancellation: SleepTimerCancellation? = nil
    ) {
        deadline = nil
        ownerID = nil
        state = SleepTimerState(
            phase: phase, id: state.id, selectionID: state.selectionID,
            durationSeconds: state.durationSeconds, failure: failure, cancellation: cancellation)
    }
}
