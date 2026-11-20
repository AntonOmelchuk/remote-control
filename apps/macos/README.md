# Remote Control macOS Agent

The native Mac companion for Remote Control. The application provides a SwiftUI menu-bar panel with local volume and mute controls, phone-connection status, English/Ukrainian copy, and an explicit Quit action.

**Validation status:** on November 18, 2026, the maintainer passed `make -C apps/macos check` (strict Swift lint, project generation, and a successful native build) and confirmed launch, Quit and relaunch, light/dark appearance, and both English and Ukrainian interface text. Both GitHub jobs subsequently passed for that shell baseline. On November 19, 2026, the expanded native check passed with all 15 shared tests and a successful audio application build. Manual checks confirmed volume control, mute/unmute preserving volume, external volume synchronization, and removal of the transient spinner and tick marks on MacBook Pro Speakers. Button flicker is deferred; output switching and the expanded native CI execution remain unverified; see [macOS Audio Control](../../docs/macos-audio-control.md). VoiceOver, keyboard focus, and a broader device/OS matrix remain unverified. The working iOS development build is a separate completed milestone.

**Current pairing milestone:** the Agent now includes an expiring QR, explicit approval, saved-device records, and revocation. On November 20, 2026, Debug/SignedDebug builds, the Apple-issued signature and application/team identifier entitlements, QR pairing, saved-access verification after restarting each app, revocation, and re-pairing were verified locally. Final native checks passed all 33 Swift tests. Feature CI and broader network/device coverage remain pending. See [Secure Local Pairing](../../docs/secure-pairing.md). Local volume controls remain separate.

## Requirements

- macOS 15 or later is the configured deployment target; this is not a tested-device support matrix.
- Xcode with a Swift 6 toolchain and the macOS SDK.
- XcodeGen 2.46.0 or later; 2.46.0 is installed on the maintainer's Mac.
- The formatter bundled with the selected Xcode toolchain (`xcrun swift-format`).

The application references local `packages/remote-core` and `packages/remote-link` Swift packages. The pairing identity adds exact versions of Apple swift-certificates (1.9.0), swift-crypto (3.12.3), and swift-asn1 (1.3.1); the first native build resolves/downloads these dependencies. The `Debug` quality-check build uses ad hoc signing. Pairing runs from a separate `SignedDebug` build with an Apple Development identity and application-identifier entitlement. Configure your own Xcode team locally before running it. Developer ID signing and notarized distribution are future work.

## Build and Run

From the repository root:

```bash
make -C apps/macos check
make -C apps/macos run DEVELOPMENT_TEAM=YOUR_TEAM_ID
```

`check` lints Swift, runs the shared core and pairing tests, generates the Xcode project, and compiles the Debug application. `run` builds `SignedDebug`, allows Xcode automatic provisioning, verifies an Apple-issued signature and the built application/team identifier entitlements, then opens that signed bundle. It requires a team argument or a local signing configuration. Click the laptop symbol in the macOS menu bar to open its panel. The application has no Dock icon.

To avoid supplying the team on every run, copy `Signing.local.xcconfig.example` to `Signing.local.xcconfig` and replace the placeholder with your team ID. The local file is ignored by Git. `Config/Signing.xcconfig` optionally includes it, including when the generated project is opened in Xcode. Once configured, `make -C apps/macos run` uses it. The Xcode scheme's Run action also selects `SignedDebug`.

The two application paths are:

- `build/DerivedData/Build/Products/Debug/RemoteControlAgent.app`: compilation/local-audio checks; it has no Data Protection Keychain access identity.
- `build/DerivedData/Build/Products/SignedDebug/RemoteControlAgent.app`: signed pairing development app.

Before rebuilding an already-running copy, quit it from the panel. Launch Services may otherwise activate the existing process rather than restart the newly built executable.

The Debug bundle is written to:

```text
apps/macos/build/DerivedData/Build/Products/Debug/RemoteControlAgent.app
```

To generate and inspect the project in Xcode:

```bash
make -C apps/macos generate
open apps/macos/RemoteControlAgent.xcodeproj
```

Edit `project.yml` for durable target, scheme, signing, and build settings. Changes made only to the generated `.xcodeproj` can be replaced during generation.

## Commands

| Command                       | Responsibility                                       |
| ----------------------------- | ---------------------------------------------------- |
| `make -C apps/macos generate` | Generate the Xcode project from its specification    |
| `make -C apps/macos format`   | Rewrite Swift files using the native formatter       |
| `make -C apps/macos lint`     | Check Swift formatting and lint rules; warnings fail |
| `make -C apps/macos build`    | Generate the project and compile the Debug app       |
| `make -C apps/macos test`     | Run the shared Swift core tests with fake hardware   |
| `make -C apps/macos check`    | Lint, run core tests, and compile without launching  |
| `make -C apps/macos run`      | Build, verify signing, and open SignedDebug          |

The existing root `pnpm check` continues to cover repository formatting and mobile checks. It does not compile Swift. Run both commands before submitting changes that affect this milestone.

## File Responsibilities

| Path                                                     | Responsibility                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------- |
| `project.yml`                                            | Native targets, scheme, deployment target, language mode, and local signing |
| `Makefile`                                               | Shared local and CI commands                                                |
| `.swift-format`                                          | Swift formatting and lint configuration                                     |
| `.editorconfig`                                          | Four-space Swift indentation and Makefile tabs                              |
| `.gitignore`                                             | Generated Xcode project and build exclusions                                |
| `Resources/Info.plist`                                   | App identity, version substitutions, and menu-bar-only behavior             |
| `Resources/Localizable.xcstrings`                        | English and Ukrainian native String Catalog                                 |
| `Sources/RemoteControlAgent/RemoteControlAgentApp.swift` | Composition root, menu-bar scene, and application termination               |
| `Sources/RemoteControlAgent/AgentMenuView.swift`         | Panel layout, semantic colors, version display, and Quit button             |
| `Sources/RemoteControlAgent/AgentStatusCard.swift`       | Honest setup-only connection status                                         |

Additional audio boundaries:

| Path                                                       | Responsibility                                                   |
| ---------------------------------------------------------- | ---------------------------------------------------------------- |
| `Sources/RemoteControlAgent/Audio/AudioControlCard.swift`  | Audio presentation, pending drafts, revisions, and errors        |
| `Sources/RemoteControlAgent/Audio/CoreAudioHardware.swift` | Public CoreAudio reads, writes, and listener lifetime            |
| `../../packages/remote-core/`                              | Audio values, command service, hardware port, and isolated tests |

See [macOS Agent Shell](../../docs/macos-agent-shell.md) for architecture, validation, and scope, and [ADR 0002](../../docs/adr/0002-macos-project-generation.md) for the project-generation decision.
