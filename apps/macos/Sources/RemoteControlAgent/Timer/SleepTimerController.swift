import Foundation
import Observation
import RemoteCore
import RemotePairing

@Observable
@MainActor
final class SleepTimerController {
    private(set) var state = RemoteSleepTimer()
    @ObservationIgnored var onChange: (() -> Void)?
    @ObservationIgnored private var machine = SleepTimerMachine()
    @ObservationIgnored private let media: YouTubeService
    @ObservationIgnored private var pulse: Task<Void, Never>?
    @ObservationIgnored private var execution: Task<Void, Never>?

    init(media: YouTubeService) { self.media = media }

    func start(minutes: Int, selectionID: UUID, expectedID: UUID?, ownerID: UUID)
        -> RemoteTimerFailure?
    {
        guard media.connected else { return .bridgeUnavailable }
        guard media.selectionID == selectionID else { return .selectionChanged }
        guard media.canControl else { return .notReady }
        do {
            try machine.start(
                minutes: minutes, selectionID: selectionID, expectedID: expectedID,
                ownerID: ownerID, now: .now)
            execution?.cancel()
            execution = nil
            pulse?.cancel()
            publish()
            pulse = Task { [weak self] in
                while !Task.isCancelled {
                    do { try await Task.sleep(for: .seconds(1)) } catch { return }
                    guard let self else { return }
                    self.tick()
                    if self.machine.state.phase != .running { return }
                }
            }
            return nil
        } catch { return map(error) }
    }

    func cancel(expectedID: UUID) -> RemoteTimerFailure? {
        do {
            try machine.cancel(expectedID: expectedID)
            stopTasks()
            publish()
            return nil
        } catch { return map(error) }
    }

    func stop() {
        machine.cancel(reason: .connectionsStopped)
        stopTasks()
        publish()
    }

    func revoke(ownerID: UUID) {
        machine.revoke(ownerID: ownerID)
        settleCancellation()
    }

    func selectionChanged() {
        machine.selectionChanged(to: media.selectionID, disconnected: !media.connected)
        settleCancellation()
    }

    private func settleCancellation() {
        if !machine.state.phase.isActive { stopTasks() }
        publish()
    }

    private func tick() {
        let expiration = machine.tick(now: .now)
        publish()
        guard let expiration else { return }
        execution = Task { [weak self] in
            guard let self else { return }
            var failure: SleepTimerFailure?
            if self.media.selectionID != expiration.selectionID {
                failure = .selectionChanged
            } else if let target = self.media.snapshot.targetID, self.media.canControl {
                do {
                    try Task.checkCancellation()
                    if let mediaFailure = try await self.media.setPaused(true, target: target) {
                        failure =
                            mediaFailure == .targetChanged
                            ? .notReady
                            : SleepTimerFailure(rawValue: mediaFailure.rawValue) ?? .notReady
                    }
                } catch { failure = .notReady }
            } else {
                failure = .notReady
            }
            self.machine.finish(id: expiration.id, failure: failure)
            self.publish()
        }
    }

    private func stopTasks() {
        pulse?.cancel()
        pulse = nil
        execution?.cancel()
        execution = nil
    }

    private func publish() {
        let value = machine.state
        let next = RemoteSleepTimer(
            phase: RemoteSleepTimer.Phase(rawValue: value.phase.rawValue) ?? .failed,
            id: value.id, selectionID: value.selectionID, durationSeconds: value.durationSeconds,
            remainingSeconds: value.remainingSeconds,
            failure: value.failure.flatMap { RemoteTimerFailure(rawValue: $0.rawValue) },
            cancellation: value.cancellation.flatMap {
                RemoteSleepTimer.Cancellation(rawValue: $0.rawValue)
            })
        guard next != state else { return }
        state = next
        onChange?()
    }

    private func map(_ error: any Error) -> RemoteTimerFailure {
        (error as? SleepTimerFailure).flatMap { RemoteTimerFailure(rawValue: $0.rawValue) }
            ?? .notReady
    }
}
