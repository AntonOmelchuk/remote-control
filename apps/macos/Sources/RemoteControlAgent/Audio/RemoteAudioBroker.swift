import Foundation
import RemoteCore
import RemotePairing

/// Maps confirmed HAL state to a transport DTO without exposing HAL object IDs or UIDs.
@MainActor
final class RemoteAudioBroker {
    private let service: AudioOutputService
    private var observation: Task<Void, Never>?
    private var outputID: AudioOutputID?
    private var outputToken = UUID()
    private var latest: RemoteAudioSnapshot?
    var onChange: ((RemoteAudioSnapshot) -> Void)?

    init(service: AudioOutputService) { self.service = service }

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
        outputID = nil
        outputToken = UUID()
    }

    func refresh() async -> RemoteAudioSnapshot {
        apply(await service.refresh())
        return latest ?? RemoteAudioSnapshot(revision: 0, output: nil, failure: .hardwareFailure)
    }

    func execute(_ frame: RemoteAudioFrame) async throws -> (
        RemoteAudioSnapshot, RemoteAudioFailure?
    ) {
        try Task.checkCancellation()
        if frame.type == .refreshAudio { return (await refresh(), nil) }
        guard frame.outputID == outputToken, let expected = outputID else {
            return (await refresh(), .outputChanged)
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
        return (snapshot, result.failure.map(mapFailure))
    }

    private func apply(_ update: AudioUpdate) {
        if let latest, update.revision <= latest.revision { return }
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
        let snapshot = RemoteAudioSnapshot(
            revision: update.revision, output: output, failure: failure)
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
