import SwiftUI

@MainActor
struct AgentStatusCard: View {
    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            Text("Setup only")
                .font(.caption.weight(.medium))
                .foregroundStyle(.secondary)
                .padding(.horizontal, 10)
                .padding(.vertical, 5)
                .background(Color.primary.opacity(0.06), in: Capsule())

            Label("Connections unavailable", systemImage: "iphone")
                .font(.headline)
                .fixedSize(horizontal: false, vertical: true)

            Text(
                "Remote Control is running on this Mac. Phone connections will be available in a future update."
            )
            .font(.subheadline)
            .foregroundStyle(.secondary)
            .fixedSize(horizontal: false, vertical: true)
        }
        .padding(16)
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color.primary.opacity(0.04), in: RoundedRectangle(cornerRadius: 18))
        .overlay {
            RoundedRectangle(cornerRadius: 18)
                .strokeBorder(Color.primary.opacity(0.08), lineWidth: 1)
        }
        .accessibilityElement(children: .combine)
    }
}
