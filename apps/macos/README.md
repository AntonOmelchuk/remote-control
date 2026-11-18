# Remote Control macOS Agent

The native Mac companion for Remote Control. This milestone provides a SwiftUI menu-bar application with a setup status, English/Ukrainian copy, and an explicit Quit action.

**Validation status:** on November 18, 2026, the maintainer passed `make -C apps/macos check` (strict Swift lint, project generation, and a successful native build) and confirmed launch, Quit and relaunch, light/dark appearance, and both English and Ukrainian interface text. The new macOS CI job has not yet run. VoiceOver, keyboard focus, and a broader device/OS matrix remain unverified. The working iOS development build is a separate completed milestone.

## Requirements

- macOS 15 or later is the configured deployment target; this is not a tested-device support matrix.
- Xcode with a Swift 6 toolchain and the macOS SDK.
- XcodeGen 2.46.0 or later; 2.46.0 is installed on the maintainer's Mac.
- The formatter bundled with the selected Xcode toolchain (`xcrun swift-format`).

No external Swift package dependencies are introduced. The current local build uses ad hoc signing and does not require an Apple development team. Developer ID signing and notarized distribution are future work.

## Build and Run

From the repository root:

```bash
make -C apps/macos check
make -C apps/macos run
```

`check` lints Swift, generates the Xcode project, and compiles the Debug application. `run` regenerates and incrementally builds the project, then opens the resulting application bundle. Click the laptop symbol in the macOS menu bar to open its panel. The application has no Dock icon.

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
| `make -C apps/macos check`    | Lint and compile without launching                   |
| `make -C apps/macos run`      | Build and open the application                       |

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

See [macOS Agent Shell](../../docs/macos-agent-shell.md) for architecture, validation, and scope, and [ADR 0002](../../docs/adr/0002-macos-project-generation.md) for the project-generation decision.
