import Foundation
import Observation
import RemotePairing

@Observable
@MainActor
final class YouTubeService {
    private(set) var snapshot = YouTubeSnapshot(availability: .disconnected)
    private(set) var selectionID: UUID?
    var connected: Bool { bridgeID != nil }
    var canControl: Bool {
        connected && snapshot.availability == .ready && lastState.duration(to: .now) <= .seconds(5)
    }
    @ObservationIgnored var onChange: (() -> Void)?
    @ObservationIgnored private var bridgeID: UUID?
    @ObservationIgnored private var send: ((BrowserBridgeFrame) -> Bool)?
    @ObservationIgnored private var monitor: Task<Void, Never>?
    @ObservationIgnored private var lastState = ContinuousClock.now
    @ObservationIgnored private var deadline: Task<Void, Never>?
    @ObservationIgnored private var pending: Pending?

    private struct Pending {
        let id: UUID
        let target: UUID
        let paused: Bool
        let continuation: CheckedContinuation<MediaFailure?, Never>
    }

    func attach(id: UUID, send: @escaping (BrowserBridgeFrame) -> Bool) -> Bool {
        guard bridgeID == nil else { return false }
        bridgeID = id
        self.send = send
        lastState = .now
        publish(YouTubeSnapshot(availability: .unavailable))
        monitor = Task { [weak self] in
            while !Task.isCancelled {
                do { try await Task.sleep(for: .seconds(1)) } catch { return }
                guard let self, self.bridgeID == id else { return }
                if self.lastState.duration(to: .now) > .seconds(5) {
                    self.publish(
                        YouTubeSnapshot(availability: .stale), selectionID: self.selectionID)
                    self.finish(.notReady)
                }
            }
        }
        return true
    }

    func detach(id: UUID) {
        guard bridgeID == id else { return }
        bridgeID = nil
        send = nil
        monitor?.cancel()
        monitor = nil
        finish(.bridgeUnavailable)
        publish(YouTubeSnapshot(availability: .disconnected))
    }

    func receive(_ frame: BrowserBridgeFrame, from id: UUID) {
        guard bridgeID == id else { return }
        switch frame.type {
        case .browserState:
            guard let snapshot = frame.snapshot else { return }
            lastState = .now
            publish(snapshot, selectionID: frame.selectionID)
            if let pending, pending.target != snapshot.targetID { finish(.targetChanged) }
        case .browserResult:
            guard let pending, pending.id == frame.requestID else { return }
            let failure: MediaFailure?
            if let reported = frame.failure {
                failure = reported
            } else if snapshot.targetID != pending.target {
                failure = .targetChanged
            } else if snapshot.availability != .ready || snapshot.paused != pending.paused {
                failure = .notReady
            } else {
                failure = nil
            }
            finish(failure)
        default: break
        }
    }

    func setPaused(_ paused: Bool, target: UUID) async throws -> MediaFailure? {
        try Task.checkCancellation()
        guard bridgeID != nil else { return .bridgeUnavailable }
        guard snapshot.targetID == target else { return .targetChanged }
        guard canControl, pending == nil else { return .notReady }
        let id = UUID()
        return await withTaskCancellationHandler {
            await withCheckedContinuation { continuation in
                guard !Task.isCancelled else {
                    continuation.resume(returning: .notReady)
                    return
                }
                pending = Pending(
                    id: id, target: target, paused: paused, continuation: continuation)
                var frame = BrowserBridgeFrame(.browserCommand)
                frame.requestID = id
                frame.targetID = target
                frame.paused = paused
                guard send?(frame) == true else {
                    finish(.bridgeUnavailable)
                    return
                }
                deadline = Task { [weak self] in
                    do { try await Task.sleep(for: .seconds(5)) } catch { return }
                    if self?.pending?.id == id { self?.finish(.timedOut) }
                }
            }
        } onCancel: {
            Task { @MainActor [weak self] in
                if self?.pending?.id == id { self?.finish(.notReady) }
            }
        }
    }

    private func publish(_ value: YouTubeSnapshot, selectionID: UUID? = nil) {
        guard snapshot != value || self.selectionID != selectionID else { return }
        self.selectionID = selectionID
        snapshot = value
        onChange?()
    }

    private func finish(_ failure: MediaFailure?) {
        let operation = pending
        pending = nil
        deadline?.cancel()
        deadline = nil
        operation?.continuation.resume(returning: failure)
    }
}
