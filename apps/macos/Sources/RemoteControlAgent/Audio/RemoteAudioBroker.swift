import Foundation
import RemoteCore
import RemotePairing

/// Maps confirmed HAL state to a transport DTO without exposing HAL object IDs or UIDs.
@MainActor
final class RemoteAudioBroker {
    private let service: AudioOutputService
    private let media: YouTubeService
    let timer: SleepTimerController
    private var audioRevision: UInt64?
    private var revision: UInt64 = 0
    private var observation: Task<Void, Never>?
    private var outputID: AudioOutputID?
    private var outputToken = UUID()
    private var latest: RemoteAudioSnapshot?
    var onChange: ((RemoteAudioSnapshot) -> Void)?

    init(service: AudioOutputService, media: YouTubeService) {
        self.service = service
        self.media = media
        self.timer = SleepTimerController(media: media)
        media.onChange = { [weak self] in
            self?.timer.selectionChanged()
            guard let self, let latest = self.latest else { return }
            self.publish(output: latest.output, failure: latest.failure)
        }
        timer.onChange = { [weak self] in
            guard let self, let latest = self.latest else { return }
            self.publish(output: latest.output, failure: latest.failure)
        }
    }

    func start() {
        guard observation == nil else { return }
        observation = Task { [weak self, service] in
            for await update in await service.updates() {
                guard !Task.isCancelled else { return }
                self?.apply(update)
            }
        }
    }

    func stop() {
        observation?.cancel()
        observation = nil
        latest = nil
        audioRevision = nil
        outputID = nil
        outputToken = UUID()
    }

    func refresh() async -> RemoteAudioSnapshot {
        apply(await service.refresh())
        return latest ?? RemoteAudioSnapshot(revision: 0, output: nil, failure: .hardwareFailure)
    }

    func execute(_ frame: RemoteAudioFrame, deviceID: UUID) async throws -> (
        RemoteAudioSnapshot, RemoteAudioFailure?, MediaFailure?, RemoteTimerFailure?
    ) {
        try Task.checkCancellation()
        if frame.type == .refreshAudio { return (await refresh(), nil, nil, nil) }
        if frame.type == .setPlayback {
            guard let target = frame.targetID, let paused = frame.paused else {
                throw PairingFailure.protocolError
            }
            let failure = try await media.setPaused(paused, target: target)
            let current: RemoteAudioSnapshot
            if let latest { current = latest } else { current = await refresh() }
            return (current, nil, failure, nil)
        }
        if frame.type == .startSleepTimer || frame.type == .cancelSleepTimer {
            let failure: RemoteTimerFailure?
            if frame.type == .startSleepTimer {
                guard let minutes = frame.durationMinutes, let selection = frame.selectionID else {
                    throw PairingFailure.protocolError
                }
                failure = timer.start(
                    minutes: minutes, selectionID: selection, expectedID: frame.timerID,
                    ownerID: deviceID)
            } else {
                guard let id = frame.timerID else { throw PairingFailure.protocolError }
                failure = timer.cancel(expectedID: id)
            }
            let current: RemoteAudioSnapshot
            if let latest { current = latest } else { current = await refresh() }
            return (current, nil, nil, failure)
        }
        guard frame.outputID == outputToken, let expected = outputID else {
            return (await refresh(), .outputChanged, nil, nil)
        }
        let result: AudioCommandResult
        switch frame.type {
        case .setVolume:
            guard let scalar = frame.volume else { throw PairingFailure.protocolError }
            result = try await service.setVolume(VolumeLevel(scalar), expected: expected)
        case .setMuted:
            guard let muted = frame.muted else { throw PairingFailure.protocolError }
            result = try await service.setMuted(muted, expected: expected)
        default: throw PairingFailure.protocolError
        }
        apply(result.update)
        let snapshot =
            latest
            ?? RemoteAudioSnapshot(
                revision: result.update.revision, output: nil, failure: .hardwareFailure)
        return (snapshot, result.failure.map(mapFailure), nil, nil)
    }

    private func apply(_ update: AudioUpdate) {
        if let audioRevision, update.revision <= audioRevision { return }
        audioRevision = update.revision
        let output: RemoteAudioOutput?
        let failure: RemoteAudioFailure?
        switch update.state {
        case .output(let value):
            if outputID != value?.id {
                outputID = value?.id
                outputToken = UUID()
            }
            output = value.map {
                let cleaned = $0.name.unicodeScalars.filter {
                    !CharacterSet.controlCharacters.contains($0)
                }
                let name = String(String.UnicodeScalarView(cleaned.prefix(40)))
                return RemoteAudioOutput(
                    id: outputToken, name: name.isEmpty ? "Audio output" : String(name),
                    volume: $0.volume.value?.scalar, canSetVolume: $0.volume.canWrite,
                    muted: $0.mute.value, canSetMute: $0.mute.canWrite)
            }
            failure = nil
        case .failed(let value):
            outputID = nil
            outputToken = UUID()
            output = nil
            failure = mapFailure(value)
        }
        publish(output: output, failure: failure)
    }

    private func publish(output: RemoteAudioOutput?, failure: RemoteAudioFailure?) {
        revision += 1
        let snapshot = RemoteAudioSnapshot(
            revision: revision, output: output, failure: failure, media: media.snapshot,
            selectionID: media.selectionID, timer: timer.state)
        latest = snapshot
        onChange?(snapshot)
    }

    private func mapFailure(_ value: AudioFailure) -> RemoteAudioFailure {
        switch value {
        case .invalidVolume: .invalidVolume
        case .noOutput: .noOutput
        case .outputChanged: .outputChanged
        case .volumeUnavailable: .volumeUnavailable
        case .muteUnavailable: .muteUnavailable
        case .hardwareFailure: .hardwareFailure
        case .observationUnavailable: .observationUnavailable
        }
    }
}
