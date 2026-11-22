import Foundation
import RemoteCore
import SwiftUI

@MainActor
struct AudioControlCard: View {
    let service: AudioOutputService

    @State private var output: AudioOutputSnapshot?
    @State private var readFailure: AudioFailure?
    @State private var commandFailure: AudioFailure?
    @State private var loading = true
    @State private var writing = false
    @State private var active = false
    @State private var revision: UInt64 = 0
    @State private var reloadID = 0
    @State private var draftVolume: Double?
    @State private var actionID: UUID?
    @State private var action: Task<Void, Never>?

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("System audio").font(.headline)

            if loading {
                ProgressView("Reading audio output…")
            } else if let output {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Output").font(.caption).foregroundStyle(.secondary)
                    Text(verbatim: output.name).font(.subheadline).lineLimit(2)
                }
                volumeControls(output)
                muteControl(output)
            } else if readFailure == nil {
                Text("No audio output is available.")
                    .font(.subheadline).foregroundStyle(.secondary)
            }

            if let failure = readFailure ?? commandFailure {
                Text(message(failure))
                    .font(.caption).foregroundStyle(.red)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack {
                Text("Changes affect this Mac.")
                    .font(.caption).foregroundStyle(.secondary)
                Spacer(minLength: 4)
                Button("Refresh") {
                    guard !writing, draftVolume == nil else { return }
                    commandFailure = nil
                    reloadID += 1
                }
                .controlSize(.small)
            }
        }
        .padding(16)
        .background(Color.primary.opacity(0.04), in: RoundedRectangle(cornerRadius: 18))
        .onAppear { active = true }
        .onDisappear {
            active = false
            cancelAction()
        }
        .task(id: reloadID) {
            active = true
            loading = true
            for await update in await service.updates() {
                guard !Task.isCancelled else { return }
                apply(update)
            }
        }
    }

    @ViewBuilder
    private func volumeControls(_ output: AudioOutputSnapshot) -> some View {
        if let volume = output.volume.value {
            HStack {
                Text("Volume")
                Spacer()
                Text(draftVolume ?? volume.scalar, format: .percent.precision(.fractionLength(0)))
                    .monospacedDigit()
            }
            .font(.subheadline)

            Slider(
                value: Binding(
                    get: { draftVolume ?? volume.scalar },
                    set: { proposeVolume(($0 * 100).rounded() / 100, expected: output.id) }
                ),
                in: 0...1
            )
            .disabled(writing || !output.volume.canWrite)
            .accessibilityLabel(Text("Volume"))

            HStack {
                Button {
                    proposeVolume(
                        max(0, (draftVolume ?? volume.scalar) - 0.05), expected: output.id)
                } label: {
                    Image(systemName: "minus")
                }
                .accessibilityLabel(Text("Decrease volume"))

                Spacer()

                Button {
                    proposeVolume(
                        min(1, (draftVolume ?? volume.scalar) + 0.05), expected: output.id)
                } label: {
                    Image(systemName: "plus")
                }
                .accessibilityLabel(Text("Increase volume"))
            }
            .buttonStyle(.bordered)
            .disabled(writing || !output.volume.canWrite)

            if !output.volume.canWrite {
                Text("Volume is read-only for this output.")
                    .font(.caption).foregroundStyle(.secondary)
            }
        } else {
            Text("Volume control is unavailable for this output.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    @ViewBuilder
    private func muteControl(_ output: AudioOutputSnapshot) -> some View {
        if let muted = output.mute.value {
            Button {
                submitMute(!muted, expected: output.id)
            } label: {
                Label {
                    Text(muted ? LocalizedStringKey("Unmute") : LocalizedStringKey("Mute"))
                } icon: {
                    Image(systemName: muted ? "speaker.slash.fill" : "speaker.wave.2.fill")
                }
                .frame(maxWidth: .infinity)
            }
            .buttonStyle(.bordered)
            .disabled(!output.mute.canWrite)
        } else {
            Text("Mute control is unavailable for this output.")
                .font(.caption).foregroundStyle(.secondary)
        }
    }

    private func proposeVolume(_ scalar: Double, expected: AudioOutputID) {
        guard !writing, output?.id == expected, output?.volume.canWrite == true else { return }
        guard let level = try? VolumeLevel(scalar) else { return }
        action?.cancel()
        let request = UUID()
        actionID = request
        draftVolume = scalar
        action = Task {
            do {
                try await Task.sleep(for: .milliseconds(75))
                try Task.checkCancellation()
                guard active, actionID == request else { return }
                writing = true
                commandFailure = nil
                defer { finishAction(request) }
                let result = try await service.setVolume(level, expected: expected)
                guard active, actionID == request, !Task.isCancelled else { return }
                commandFailure = result.failure
                apply(result.update)
            } catch is CancellationError {
                finishAction(request)
            } catch {
                if active, actionID == request {
                    commandFailure = .hardwareFailure
                    finishAction(request)
                }
            }
        }
    }

    private func submitMute(_ muted: Bool, expected: AudioOutputID) {
        guard !writing, draftVolume == nil, output?.id == expected,
            output?.mute.canWrite == true
        else { return }
        let request = UUID()
        actionID = request
        writing = true
        commandFailure = nil
        action = Task {
            defer { finishAction(request) }
            do {
                let result = try await service.setMuted(muted, expected: expected)
                guard active, actionID == request, !Task.isCancelled else { return }
                commandFailure = result.failure
                apply(result.update)
            } catch is CancellationError {
                return
            } catch {
                if active, actionID == request { commandFailure = .hardwareFailure }
            }
        }
    }

    private func apply(_ update: AudioUpdate) {
        guard active, update.revision >= revision else { return }
        revision = update.revision
        loading = false
        switch update.state {
        case .output(let next):
            if output?.id != next?.id {
                if actionID != nil { commandFailure = .outputChanged }
                cancelAction()
            }
            output = next
            readFailure = nil
        case .failed(let failure):
            cancelAction()
            output = nil
            readFailure = failure
        }
    }

    private func cancelAction() {
        action?.cancel()
        action = nil
        actionID = nil
        draftVolume = nil
        writing = false
    }

    private func finishAction(_ request: UUID) {
        guard actionID == request else { return }
        action = nil
        actionID = nil
        draftVolume = nil
        writing = false
    }

    private func message(_ failure: AudioFailure) -> LocalizedStringKey {
        switch failure {
        case .invalidVolume: "Choose a volume between 0% and 100%."
        case .noOutput: "No audio output is available."
        case .outputChanged: "The audio output changed. Review it and try again."
        case .volumeUnavailable: "Volume control is unavailable for this output."
        case .muteUnavailable: "Mute control is unavailable for this output."
        case .hardwareFailure: "Audio could not be updated. Refresh and try again."
        case .observationUnavailable: "Audio changes could not be monitored. Refresh and try again."
        }
    }
}
