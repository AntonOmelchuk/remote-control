import RemoteCore
import Synchronization
import Testing

@Suite("Audio command safety", .timeLimit(.minutes(1)))
struct AudioOutputServiceTests {
    @Test
    func volumeRejectsNonFiniteAndOutOfRangeValues() throws {
        for value in [Double.nan, .infinity, -.infinity, -0.01, 1.01] {
            #expect(throws: AudioFailure.invalidVolume) { try VolumeLevel(value) }
        }
        for value in [0.0, 0.42, 1.0] {
            #expect(try VolumeLevel(value).scalar == value)
        }
    }

    @Test
    func absentOutputRejectsCommandsWithoutWriting() async throws {
        let hardware = FakeAudioHardware(output: nil)
        let service = AudioOutputService(hardware: hardware)
        let result = try await service.setVolume(VolumeLevel(0.2), expected: firstID)
        #expect(result.failure == .noOutput)
        #expect(result.update.state == .output(nil))
        #expect(hardware.volumeWrites == 0)
    }

    @Test
    func readOnlyVolumeDoesNotDisableWritableMute() async throws {
        let output = try fixture(volume: .readOnly(VolumeLevel(0.42)))
        let hardware = FakeAudioHardware(output: output)
        let service = AudioOutputService(hardware: hardware)
        let volume = try await service.setVolume(VolumeLevel(0.2), expected: firstID)
        let mute = try await service.setMuted(true, expected: firstID)
        #expect(volume.failure == .volumeUnavailable)
        #expect(hardware.volumeWrites == 0)
        #expect(mute.failure == nil)
        #expect(hardware.output?.mute.value == true)
        #expect(hardware.output?.volume.value == output.volume.value)
    }

    @Test
    func unsupportedMuteDoesNotDisableWritableVolume() async throws {
        let hardware = try FakeAudioHardware(output: fixture(mute: .unsupported))
        let service = AudioOutputService(hardware: hardware)
        let muted = try await service.setMuted(true, expected: firstID)
        let volume = try await service.setVolume(VolumeLevel(0.2), expected: firstID)
        #expect(muted.failure == .muteUnavailable)
        #expect(volume.failure == nil)
        #expect(try hardware.output?.volume.value == VolumeLevel(0.2))
        #expect(hardware.muteWrites == 0)
    }

    @Test
    func staleIdentityIsRejectedEvenIfObjectIDWasReused() async throws {
        let replacement = AudioOutputID(objectID: firstID.objectID, uid: "replacement-output")
        let hardware = try FakeAudioHardware(output: fixture(id: replacement))
        let service = AudioOutputService(hardware: hardware)
        let result = try await service.setVolume(VolumeLevel(0.8), expected: firstID)
        #expect(result.failure == .outputChanged)
        #expect(hardware.volumeWrites == 0)
        #expect(hardware.output?.id == replacement)
    }

    @Test
    func outputChangeAtWriteBoundaryIsNotRetriedOnNewOutput() async throws {
        let replacement = AudioOutputID(objectID: 22, uid: "second-output")
        let hardware = try FakeAudioHardware(output: fixture())
        hardware.changeOnNextWrite(try fixture(id: replacement))
        let service = AudioOutputService(hardware: hardware)
        let result = try await service.setVolume(VolumeLevel(0.8), expected: firstID)
        #expect(result.failure == .outputChanged)
        #expect(hardware.volumeWrites == 0)
        #expect(try hardware.output?.volume.value == VolumeLevel(0.42))
        #expect(hardware.output?.id == replacement)
    }

    @Test
    func writeFailureReturnsActualStateWithoutOptimisticVolume() async throws {
        let initial = try fixture()
        let hardware = FakeAudioHardware(output: initial)
        hardware.failWrites()
        let service = AudioOutputService(hardware: hardware)
        let result = try await service.setVolume(VolumeLevel(0.8), expected: firstID)
        #expect(result.failure == .hardwareFailure)
        #expect(result.update.state == .output(initial))
        #expect(hardware.volumeWrites == 0)
    }

    @Test
    func successfulWritePublishesHardwareReadbackAndIncreasingRevision() async throws {
        let hardware = try FakeAudioHardware(output: fixture())
        hardware.quantizeVolume()
        let service = AudioOutputService(hardware: hardware)
        let before = await service.refresh()
        let result = try await service.setVolume(VolumeLevel(0.53), expected: firstID)
        #expect(result.failure == nil)
        #expect(result.update.revision > before.revision)
        #expect(try hardware.output?.volume.value == VolumeLevel(0.5))
        #expect(result.update.state == .output(hardware.output))
    }

    @Test
    func mutePreservesVolumeAndUnmuteRestoresAudibleStateWithoutChangingGain() async throws {
        let initial = try fixture()
        let hardware = FakeAudioHardware(output: initial)
        let service = AudioOutputService(hardware: hardware)
        let muted = try await service.setMuted(true, expected: firstID)
        let unmuted = try await service.setMuted(false, expected: firstID)
        #expect(muted.failure == nil)
        #expect(unmuted.failure == nil)
        #expect(hardware.output?.mute.value == false)
        #expect(hardware.output?.volume == initial.volume)
        #expect(hardware.volumeWrites == 0)
    }

    @Test
    func cancelledCommandNeverReachesHardware() async throws {
        let hardware = try FakeAudioHardware(output: fixture())
        let service = AudioOutputService(hardware: hardware)
        let expected = firstID
        let command = Task {
            withUnsafeCurrentTask { $0?.cancel() }
            return try await service.setVolume(VolumeLevel(0.8), expected: expected)
        }
        do {
            _ = try await command.value
            Issue.record("A cancelled command unexpectedly completed")
        } catch is CancellationError {
            #expect(hardware.volumeWrites == 0)
        }
    }

    @Test
    func externalChangesReachTheSubscribedStream() async throws {
        let hardware = try FakeAudioHardware(output: fixture())
        let service = AudioOutputService(hardware: hardware)
        let stream = await service.updates()
        var iterator = stream.makeAsyncIterator()
        let initial = await iterator.next()
        let changed = try fixture(volume: .writable(VolumeLevel(0.2)))
        hardware.replaceOutput(changed)
        let update = await iterator.next()
        #expect(initial?.state != update?.state)
        #expect(update?.state == .output(changed))
        await service.stopObserving()
        #expect(hardware.activeObservers == 0)
    }

    @Test
    func changingOutputReplacesTheObservationAndRestartReestablishesIt() async throws {
        let hardware = try FakeAudioHardware(output: fixture())
        let service = AudioOutputService(hardware: hardware)
        let stream = await service.updates()
        var iterator = stream.makeAsyncIterator()
        _ = await iterator.next()
        let replacement = try fixture(id: AudioOutputID(objectID: 22, uid: "second-output"))
        hardware.replaceOutput(replacement)
        _ = await iterator.next()
        #expect(hardware.observedOutput == replacement.id)
        #expect(hardware.activeObservers == 1)
        let count = hardware.observationStarts
        hardware.emit(.serviceRestarted)
        _ = await iterator.next()
        #expect(hardware.observationStarts > count)
        #expect(hardware.activeObservers == 1)
        await service.stopObserving()
        #expect(hardware.activeObservers == 0)
    }

    @Test
    func replacingSubscriptionDoesNotLetOldTerminationCancelTheNewObserver() async throws {
        let hardware = try FakeAudioHardware(output: fixture())
        let service = AudioOutputService(hardware: hardware)
        let first = await service.updates()
        var firstIterator = first.makeAsyncIterator()
        _ = await firstIterator.next()
        let second = await service.updates()
        var secondIterator = second.makeAsyncIterator()
        _ = await secondIterator.next()
        let changed = try fixture(volume: .writable(VolumeLevel(0.3)))
        hardware.replaceOutput(changed)
        let update = await secondIterator.next()
        #expect(update?.state == .output(changed))
        #expect(hardware.activeObservers == 1)
        await service.stopObserving()
    }

    @Test
    func readFailureClearsPreviouslyObservedState() async throws {
        let hardware = try FakeAudioHardware(output: fixture())
        let service = AudioOutputService(hardware: hardware)
        let first = await service.refresh()
        hardware.failReads()
        let next = await service.refresh()
        #expect(first.state == .output(hardware.output))
        #expect(next.state == .failed(.hardwareFailure))
        #expect(next.revision > first.revision)
    }

    @Test
    func observationFailureDoesNotPresentStateAsActivelyMonitored() async throws {
        let hardware = try FakeAudioHardware(output: fixture())
        hardware.failObservation()
        let service = AudioOutputService(hardware: hardware)
        let stream = await service.updates()
        var iterator = stream.makeAsyncIterator()
        let update = await iterator.next()
        #expect(update?.state == .failed(.observationUnavailable))
        await service.stopObserving()
    }

    private var firstID: AudioOutputID { AudioOutputID(objectID: 11, uid: "first-output") }

    private func fixture(
        id: AudioOutputID? = nil,
        volume: AudioControl<VolumeLevel>? = nil,
        mute: AudioControl<Bool> = .writable(false)
    ) throws -> AudioOutputSnapshot {
        try AudioOutputSnapshot(
            id: id ?? firstID, name: "Test speakers",
            volume: volume ?? .writable(VolumeLevel(0.42)), mute: mute
        )
    }
}

private final class FakeAudioHardware: AudioHardwarePort, Sendable {
    private struct State {
        var output: AudioOutputSnapshot?
        var rejectReads = false
        var rejectWrites = false
        var rejectObservation = false
        var quantized = false
        var nextOutput: AudioOutputSnapshot?
        var volumeWrites = 0
        var muteWrites = 0
        var activeObservers = 0
        var observationStarts = 0
        var observedOutput: AudioOutputID?
        var onChange: (@Sendable (AudioHardwareChange) -> Void)?
    }

    private let state: Mutex<State>

    init(output: AudioOutputSnapshot?) {
        state = Mutex(State(output: output))
    }

    var output: AudioOutputSnapshot? { state.withLock { $0.output } }
    var volumeWrites: Int { state.withLock { $0.volumeWrites } }
    var muteWrites: Int { state.withLock { $0.muteWrites } }
    var activeObservers: Int { state.withLock { $0.activeObservers } }
    var observationStarts: Int { state.withLock { $0.observationStarts } }
    var observedOutput: AudioOutputID? { state.withLock { $0.observedOutput } }

    func snapshot() throws -> AudioOutputSnapshot? {
        try state.withLock {
            if $0.rejectReads { throw AudioFailure.hardwareFailure }
            return $0.output
        }
    }
    func failReads() { state.withLock { $0.rejectReads = true } }
    func failWrites() { state.withLock { $0.rejectWrites = true } }
    func failObservation() { state.withLock { $0.rejectObservation = true } }
    func quantizeVolume() { state.withLock { $0.quantized = true } }
    func changeOnNextWrite(_ output: AudioOutputSnapshot) {
        state.withLock { $0.nextOutput = output }
    }

    func replaceOutput(_ output: AudioOutputSnapshot) {
        state.withLock { $0.output = output }
        emit(.stateChanged)
    }

    func emit(_ change: AudioHardwareChange) {
        let callback = state.withLock { $0.onChange }
        callback?(change)
    }

    func writeVolume(_ level: VolumeLevel, expected: AudioOutputID) throws {
        try state.withLock { state in
            try prepareWrite(&state, expected: expected)
            guard let output = state.output else { throw AudioFailure.noOutput }
            let value =
                try state.quantized ? VolumeLevel((level.scalar * 10).rounded() / 10) : level
            state.output = AudioOutputSnapshot(
                id: output.id, name: output.name, volume: .writable(value), mute: output.mute
            )
            state.volumeWrites += 1
        }
    }

    func writeMute(_ muted: Bool, expected: AudioOutputID) throws {
        try state.withLock { state in
            try prepareWrite(&state, expected: expected)
            guard let output = state.output else { throw AudioFailure.noOutput }
            state.output = AudioOutputSnapshot(
                id: output.id, name: output.name, volume: output.volume, mute: .writable(muted)
            )
            state.muteWrites += 1
        }
    }

    func observe(
        output: AudioOutputID?,
        onChange: @escaping @Sendable (AudioHardwareChange) -> Void
    ) throws -> any AudioObservation {
        try state.withLock { state in
            if state.rejectObservation { throw AudioFailure.observationUnavailable }
            state.onChange = onChange
            state.observedOutput = output
            state.activeObservers += 1
            state.observationStarts += 1
        }
        return FakeObservation { [self] in
            state.withLock {
                $0.activeObservers -= 1
                $0.onChange = nil
            }
        }
    }

    private func prepareWrite(_ state: inout State, expected: AudioOutputID) throws {
        if let next = state.nextOutput {
            state.output = next
            state.nextOutput = nil
        }
        guard state.output?.id == expected else { throw AudioFailure.outputChanged }
        if state.rejectWrites { throw AudioFailure.hardwareFailure }
    }
}

private final class FakeObservation: AudioObservation {
    private let cancelled = Mutex(false)
    private let onCancel: @Sendable () -> Void

    init(onCancel: @escaping @Sendable () -> Void) { self.onCancel = onCancel }

    func cancel() {
        let first = cancelled.withLock { value in
            if value { return false }
            value = true
            return true
        }
        if first { onCancel() }
    }

    deinit { cancel() }
}
