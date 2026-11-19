import Foundation

/// Owns hardware access and one active UI subscription. No hardware write is retried or retargeted.
public actor AudioOutputService {
    private let hardware: any AudioHardwarePort
    private var revision: UInt64 = 0
    private var generation: UUID?
    private var observedOutput: AudioOutputID?
    private var observation: (any AudioObservation)?
    private var continuation: AsyncStream<AudioUpdate>.Continuation?

    public init(hardware: any AudioHardwarePort) {
        self.hardware = hardware
    }

    public func updates() -> AsyncStream<AudioUpdate> {
        stopObserving()
        let session = UUID()
        generation = session
        let pair = AsyncStream<AudioUpdate>.makeStream(bufferingPolicy: .bufferingNewest(1))
        continuation = pair.continuation
        pair.continuation.onTermination = { [weak self] _ in
            Task { await self?.stopObserving(generation: session) }
        }
        _ = refresh(forceObservation: true)
        return pair.stream
    }

    public func refresh() -> AudioUpdate {
        refresh(forceObservation: observation == nil)
    }

    public func setVolume(_ level: VolumeLevel, expected: AudioOutputID) throws
        -> AudioCommandResult
    {
        try Task.checkCancellation()
        return execute {
            let output = try currentOutput(expected: expected)
            guard output.volume.canWrite else { throw AudioFailure.volumeUnavailable }
            try hardware.writeVolume(level, expected: expected)
        }
    }

    public func setMuted(_ muted: Bool, expected: AudioOutputID) throws -> AudioCommandResult {
        try Task.checkCancellation()
        return execute {
            let output = try currentOutput(expected: expected)
            guard output.mute.canWrite else { throw AudioFailure.muteUnavailable }
            try hardware.writeMute(muted, expected: expected)
        }
    }

    public func stopObserving() {
        generation = nil
        observation?.cancel()
        observation = nil
        observedOutput = nil
        continuation?.finish()
        continuation = nil
    }

    private func stopObserving(generation session: UUID) {
        guard generation == session else { return }
        stopObserving()
    }

    private func currentOutput(expected: AudioOutputID) throws -> AudioOutputSnapshot {
        guard let output = try hardware.snapshot() else { throw AudioFailure.noOutput }
        guard output.id == expected else { throw AudioFailure.outputChanged }
        return output
    }

    private func execute(_ write: () throws -> Void) -> AudioCommandResult {
        var failure: AudioFailure?
        do {
            try write()
        } catch {
            failure = error as? AudioFailure ?? .hardwareFailure
        }
        // HAL writes can settle asynchronously. This publishes observed state, never requested state.
        return AudioCommandResult(update: refresh(forceObservation: false), failure: failure)
    }

    private func refresh(forceObservation: Bool) -> AudioUpdate {
        let state: AudioState
        do {
            let output = try hardware.snapshot()
            if generation != nil,
                forceObservation || observation == nil || observedOutput != output?.id
            {
                try installObservation(output: output?.id)
            }
            state = .output(output)
        } catch {
            state = .failed(error as? AudioFailure ?? .hardwareFailure)
        }
        revision &+= 1
        let update = AudioUpdate(revision: revision, state: state)
        continuation?.yield(update)
        return update
    }

    private func installObservation(output: AudioOutputID?) throws {
        observation?.cancel()
        observation = nil
        guard let session = generation else { return }
        do {
            observation = try hardware.observe(output: output) { [weak self] change in
                Task { await self?.hardwareChanged(change, generation: session) }
            }
            observedOutput = output
        } catch {
            throw AudioFailure.observationUnavailable
        }
    }

    private func hardwareChanged(_ change: AudioHardwareChange, generation session: UUID) {
        guard generation == session else { return }
        _ = refresh(forceObservation: change == .serviceRestarted)
    }
}
