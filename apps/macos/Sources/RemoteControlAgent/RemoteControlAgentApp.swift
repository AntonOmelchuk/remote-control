import AppKit
import RemoteCore
import SwiftUI

@main
@MainActor
struct RemoteControlAgentApp: App {
    @State private var pairing = PairingController()
    @State private var audio = AudioOutputService(hardware: CoreAudioHardware())

    var body: some Scene {
        MenuBarExtra("Remote Control", systemImage: "laptopcomputer") {
            AgentMenuView(audio: audio, pairing: pairing) {
                Task {
                    pairing.stop()
                    await audio.stopObserving()
                    NSApplication.shared.terminate(nil)
                }
            }
        }
        .menuBarExtraStyle(.window)
    }
}
