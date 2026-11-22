import AppKit
import CoreImage.CIFilterBuiltins
import RemotePairing
import SwiftUI

@MainActor
struct AgentPairingCard: View {
    @Bindable var controller: PairingController

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Phone connection").font(.headline)
            Text("Pair only with an iPhone you trust.").font(.caption).foregroundStyle(.secondary)
            Text(
                controller.running
                    ? LocalizedStringKey("Connections enabled")
                    : LocalizedStringKey("Connections stopped")
            )
            .font(.caption).foregroundStyle(.secondary)

            if let approval = controller.approval {
                Text(verbatim: approval.request.name ?? "iPhone").font(
                    .subheadline.weight(.semibold))
                Text("Compare this code on your iPhone.").font(.caption)
                Text(verbatim: approval.code).font(.title.monospacedDigit())
                HStack {
                    Button("Reject") { controller.decide(approval, allow: false) }
                    Button("Allow pairing") { controller.decide(approval, allow: true) }
                        .buttonStyle(
                            .borderedProminent)
                }
            } else if let invitation = controller.invitation {
                if let image = qrImage(invitation) {
                    Image(nsImage: image).interpolation(.none).resizable()
                        .frame(width: 220, height: 220).padding(12).background(.white)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                        .accessibilityLabel(Text("Pairing QR code"))
                }
                Text("Scan in the iPhone app. This code expires in two minutes.")
                    .font(.caption).foregroundStyle(.secondary)
            }

            if controller.invitation == nil && controller.approval == nil {
                if controller.addresses.count > 1 {
                    Picker("Network address", selection: $controller.selectedAddress) {
                        ForEach(controller.addresses, id: \.self) { address in
                            Text(verbatim: address).tag(address)
                        }
                    }
                    .disabled(controller.running || controller.starting)
                }
                if controller.running {
                    Button("Pair an iPhone") { controller.begin() }
                        .buttonStyle(.borderedProminent)
                        .disabled(controller.devices.count >= 10)
                }
            }
            if !controller.running && !controller.starting {
                Button("Start connections") { controller.startConnections() }
                    .buttonStyle(.borderedProminent)
            }
            if controller.starting { Text("Starting connection…").font(.caption) }
            if controller.running || controller.starting {
                Button("Stop connections") { controller.stop() }.controlSize(.small)
            }
            if controller.failure != nil {
                Text("Connection setup failed. Check your network and Keychain, then try again.")
                    .font(.caption).foregroundStyle(.red)
                #if DEBUG
                    if let diagnostic = controller.diagnostic {
                        Text(verbatim: diagnostic)
                            .font(.caption.monospaced())
                            .foregroundStyle(.secondary)
                            .textSelection(.enabled)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                #endif
            }
            if !controller.devices.isEmpty {
                Text("Paired devices").font(.subheadline.weight(.semibold))
            }
            ForEach(controller.devices) { device in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(verbatim: device.name).font(.subheadline).lineLimit(2)
                        Text(
                            controller.activeDeviceIDs.contains(device.id)
                                ? LocalizedStringKey("Remote session active")
                                : LocalizedStringKey("Saved access")
                        )
                        .font(.caption).foregroundStyle(.secondary)
                    }
                    Spacer()
                    Button("Revoke") { controller.revoke(device.id) }.controlSize(.small)
                }
            }
            Text("Volume and mute are available to paired phones while connections are enabled.")
                .font(.caption).foregroundStyle(.secondary)
        }
        .padding(16)
        .background(Color.primary.opacity(0.04), in: RoundedRectangle(cornerRadius: 18))
        .task { controller.prepare() }
    }

    private func qrImage(_ invitation: PairingInvitation) -> NSImage? {
        guard let code = try? invitation.code() else { return nil }
        let filter = CIFilter.qrCodeGenerator()
        filter.message = Data(code.utf8)
        filter.correctionLevel = "M"
        guard let image = filter.outputImage?.transformed(by: CGAffineTransform(scaleX: 5, y: 5)),
            let cgImage = CIContext().createCGImage(image, from: image.extent)
        else { return nil }
        return NSImage(
            cgImage: cgImage, size: NSSize(width: image.extent.width, height: image.extent.height))
    }
}
