import Foundation
import RemotePairing
import SwiftUI

@MainActor
struct SleepTimerStatusCard: View {
    let controller: SleepTimerController

    private var countdown: String {
        let value = controller.state.remainingSeconds
        return String(format: "%02d:%02d:%02d", value / 3600, (value / 60) % 60, value % 60)
    }

    private var message: LocalizedStringKey {
        switch controller.state.phase {
        case .idle: "Set a sleep timer on your iPhone."
        case .running: "The selected YouTube tab will pause when the timer ends."
        case .executing: "Pausing the selected video…"
        case .completed: "The selected video is paused."
        case .cancelled: "Sleep timer cancelled."
        case .failed: "The timer could not pause the video. Check its status on your iPhone."
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("Sleep timer", systemImage: "moon")
                .font(.headline)
            if controller.state.phase.isActive {
                Text(verbatim: countdown)
                    .font(.title.monospacedDigit().weight(.semibold))
                    .contentTransition(.identity)
            }
            Text(message)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
            if controller.state.phase.isActive, let id = controller.state.id {
                Button("Cancel sleep timer") { _ = controller.cancel(expectedID: id) }
                    .buttonStyle(.bordered)
            }
            Text("Keep your Mac awake. Closing the iPhone app does not cancel this timer.")
                .font(.caption)
                .foregroundStyle(.secondary)
                .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.primary.opacity(0.04), in: RoundedRectangle(cornerRadius: 18))
        .transaction { $0.animation = nil }
    }
}
