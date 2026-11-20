import Foundation
import RemoteCore
import SwiftUI

@MainActor
struct AgentMenuView: View {
    @Environment(\.colorScheme) private var colorScheme

    let audio: AudioOutputService
    let pairing: PairingController
    let onQuit: () -> Void

    private var accent: Color {
        colorScheme == .dark
            ? Color(red: 0.84, green: 0.96, blue: 0.62)
            : Color(red: 0.14, green: 0.36, blue: 0.22)
    }

    private var version: String {
        Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "—"
    }

    var body: some View {
        VStack(spacing: 0) {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    header

                    Text("Your Mac, within reach.")
                        .font(.title2.weight(.semibold))
                        .fixedSize(horizontal: false, vertical: true)

                    AgentPairingCard(controller: pairing)
                        .tint(accent)
                    AudioControlCard(service: audio)
                        .tint(accent)
                }
                .padding(20)
            }

            Divider().padding(.horizontal, 20)
            footer.padding(20)
        }
        .frame(width: 360, height: 640)
        .background(.regularMaterial)
    }

    private var header: some View {
        HStack(spacing: 12) {
            Image(systemName: "laptopcomputer")
                .font(.system(size: 22, weight: .medium))
                .foregroundStyle(colorScheme == .dark ? Color.black : Color.white)
                .frame(width: 48, height: 48)
                .background(accent, in: RoundedRectangle(cornerRadius: 14))
                .accessibilityHidden(true)

            VStack(alignment: .leading, spacing: 4) {
                Text("Remote Control")
                    .font(.headline)

                Text("Mac companion")
                    .font(.subheadline)
                    .foregroundStyle(.secondary)
            }

            Spacer(minLength: 0)
        }
        .accessibilityElement(children: .combine)
    }

    private var footer: some View {
        HStack(spacing: 12) {
            HStack(spacing: 4) {
                Text("Version")
                Text(verbatim: version)
            }
            .font(.caption)
            .foregroundStyle(.secondary)
            .accessibilityElement(children: .combine)

            Spacer(minLength: 0)

            Button("Quit Remote Control", action: onQuit)
                .buttonStyle(.bordered)
                .keyboardShortcut("q", modifiers: .command)
        }
    }
}
