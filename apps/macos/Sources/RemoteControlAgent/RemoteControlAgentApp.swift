import AppKit
import RemoteCore
import SwiftUI

@main
@MainActor
struct RemoteControlAgentApp: App {
    @State private var audio = AudioOutputService(hardware: CoreAudioHardware())

    var body: some Scene {
        MenuBarExtra("Remote Control", systemImage: "laptopcomputer") {
            AgentMenuView(audio: audio) {
                Task {
                    await audio.stopObserving()
                    NSApplication.shared.terminate(nil)
                }
            }
        }
        .menuBarExtraStyle(.window)
    }
}
