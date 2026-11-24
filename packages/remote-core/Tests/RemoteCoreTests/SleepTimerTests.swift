import Foundation
import RemoteCore
import Testing

@Suite("Mac-owned sleep timer deadlines")
struct SleepTimerTests {
    private let selection = UUID()
    private let owner = UUID()
    private let now = ContinuousClock.now

    private func running(minutes: Int = 1) throws -> SleepTimerMachine {
        var timer = SleepTimerMachine()
        try timer.start(
            minutes: minutes, selectionID: selection, expectedID: nil, ownerID: owner, now: now)
        return timer
    }

    @Test func arbitraryMinutesAndBounds() throws {
        for minutes in [1, 165, 720] {
            let timer = try running(minutes: minutes)
            #expect(timer.state.durationSeconds == minutes * 60)
            #expect(timer.state.remainingSeconds == minutes * 60)
            #expect(timer.state.phase == .running)
        }
        for minutes in [Int.min, -1, 0, 721, Int.max] {
            #expect(throws: SleepTimerFailure.invalidDuration) { try running(minutes: minutes) }
        }
    }

    @Test func ceilingNeverShowsZeroBeforeDeadlineAndEmitsOnlyOnce() throws {
        var timer = try running()
        let tick1 = timer.tick(now: now.advanced(by: .milliseconds(1)))
        #expect(tick1 == nil)
        #expect(timer.state.remainingSeconds == 60)
        let tick2 = timer.tick(now: now.advanced(by: .milliseconds(59_999)))
        #expect(tick2 == nil)
        #expect(timer.state.remainingSeconds == 1)
        let tick3 = timer.tick(now: now.advanced(by: .seconds(60)))
        let expiration = try #require(tick3)
        #expect(expiration.id == timer.state.id)
        #expect(expiration.selectionID == selection)
        #expect(timer.state.phase == .executing)
        #expect(timer.state.remainingSeconds == 0)
        let tick4 = timer.tick(now: now.advanced(by: .seconds(61)))
        #expect(tick4 == nil)
        timer.finish(id: expiration.id, failure: nil)
        #expect(timer.state.phase == .completed)
        let tick5 = timer.tick(now: now.advanced(by: .seconds(500)))
        #expect(tick5 == nil)
    }

    @Test func longSuspensionFailsWithoutDispatchAndLatenessBoundaryIsInclusive() throws {
        var timer = try running()
        let tick6 = timer.tick(now: now.advanced(by: .seconds(76)))
        #expect(tick6 == nil)
        #expect(timer.state.phase == .failed)
        #expect(timer.state.failure == .late)
        var boundary = try running()
        let tick7 = boundary.tick(now: now.advanced(by: .seconds(75)))
        #expect(tick7 != nil)
    }

    @Test func replacementAndCancellationRequireCurrentTimerIdentity() throws {
        var timer = try running()
        let original = try #require(timer.state.id)
        #expect(throws: SleepTimerFailure.timerChanged) {
            try timer.start(
                minutes: 165, selectionID: selection, expectedID: nil, ownerID: owner, now: now)
        }
        #expect(throws: SleepTimerFailure.timerChanged) { try timer.cancel(expectedID: UUID()) }
        try timer.start(
            minutes: 165, selectionID: selection, expectedID: original, ownerID: owner, now: now)
        let replacement = try #require(timer.state.id)
        #expect(replacement != original)
        #expect(throws: SleepTimerFailure.timerChanged) { try timer.cancel(expectedID: original) }
        timer.finish(id: original, failure: .blocked)
        #expect(timer.state.phase == .running)
        try timer.cancel(expectedID: replacement)
        #expect(timer.state.cancellation == .user)
        let tick8 = timer.tick(now: now.advanced(by: .seconds(10_000)))
        #expect(tick8 == nil)
        #expect(throws: SleepTimerFailure.timerChanged) {
            try timer.cancel(expectedID: replacement)
        }
    }

    @Test func completedAndCancelledTimersCannotBeResurrectedByOldCompletion() throws {
        var timer = try running()
        let tick9 = timer.tick(now: now.advanced(by: .seconds(60)))
        let expiration = try #require(tick9)
        timer.cancel(reason: .connectionsStopped)
        timer.finish(id: expiration.id, failure: nil)
        #expect(timer.state.phase == .cancelled)
        #expect(timer.state.cancellation == .connectionsStopped)
        try timer.start(
            minutes: 2, selectionID: selection, expectedID: expiration.id, ownerID: owner, now: now)
        timer.finish(id: expiration.id, failure: .timedOut)
        #expect(timer.state.phase == .running)
    }

    @Test func tabIdentitySurvivesVideoChangesButNotReselectionOrClosure() throws {
        var timer = try running()
        timer.selectionChanged(to: selection)
        #expect(timer.state.phase == .running)
        timer.selectionChanged(to: UUID())
        #expect(timer.state.cancellation == .selectionChanged)
        var closed = try running()
        closed.selectionChanged(to: nil)
        #expect(closed.state.cancellation == .selectionChanged)
        var disconnected = try running()
        disconnected.selectionChanged(to: nil, disconnected: true)
        #expect(disconnected.state.cancellation == .browserDisconnected)
    }

    @Test func onlyRevokingCreatorCancelsTimerAndReplacementTransfersOwnership() throws {
        var timer = try running()
        let other = UUID()
        timer.revoke(ownerID: other)
        #expect(timer.state.phase == .running)
        try timer.start(
            minutes: 2, selectionID: selection, expectedID: timer.state.id, ownerID: other, now: now
        )
        timer.revoke(ownerID: owner)
        #expect(timer.state.phase == .running)
        timer.revoke(ownerID: other)
        #expect(timer.state.cancellation == .ownerRevoked)
    }

    @Test func failuresAreConfirmedTerminalStatesAndNewInstanceIsIdle() throws {
        var timer = try running()
        let tick10 = timer.tick(now: now.advanced(by: .seconds(60)))
        let expiration = try #require(tick10)
        timer.finish(id: expiration.id, failure: .blocked)
        #expect(timer.state.failure == .blocked)
        #expect(timer.state.phase == .failed)
        #expect(timer.state.remainingSeconds == 0)
        #expect(SleepTimerMachine().state == SleepTimerState())
    }
}
