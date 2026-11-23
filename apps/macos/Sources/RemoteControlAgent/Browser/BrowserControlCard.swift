import RemotePairing
import SwiftUI

@MainActor
struct BrowserControlCard: View {
    @Bindable var controller: PairingController

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Label("YouTube in Chrome", systemImage: "play.rectangle").font(.headline)
            Text("Select one YouTube tab in the Chrome extension. Other tabs stay private.")
                .font(.caption).foregroundStyle(.secondary)
            if controller.browserEnabled {
                Text(
                    controller.media.connected
                        ? LocalizedStringKey("Chrome connected")
                        : LocalizedStringKey("Waiting for Chrome extension")
                )
                .font(.caption).foregroundStyle(.secondary)
                if let title = controller.media.snapshot.title {
                    Text(verbatim: title).font(.subheadline.weight(.semibold)).lineLimit(2)
                }
                Button("Disable YouTube") { controller.disableBrowser() }
            } else {
                Button("Enable YouTube") { controller.enableBrowser() }
                    .buttonStyle(.borderedProminent).disabled(!controller.running)
                if !controller.running {
                    Text("Start connections to enable YouTube.").font(.caption).foregroundStyle(
                        .secondary)
                }
            }
            if controller.browserFailed {
                Text("Could not enable the Chrome bridge. Check the local setup guide.")
                    .font(.caption).foregroundStyle(.red)
            }
        }
        .padding(16)
        .background(Color.primary.opacity(0.04), in: RoundedRectangle(cornerRadius: 18))
    }
}
