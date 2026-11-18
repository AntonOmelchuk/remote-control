import AppKit
import SwiftUI

@main
@MainActor
struct RemoteControlAgentApp: App {
    var body: some Scene {
        MenuBarExtra("Remote Control", systemImage: "laptopcomputer") {
            AgentMenuView {
                NSApplication.shared.terminate(nil)
            }
        }
        .menuBarExtraStyle(.window)
    }
}
