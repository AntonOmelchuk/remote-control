# macOS Agent Shell

## Scope and Status

This milestone introduces the Mac application's lifecycle and presentation layer. It adds a menu-bar panel, an explicit setup-only connection status, and a Quit action. The UI follows macOS appearance and preferred application language using bundled English and Ukrainian resources. Phone preference choices do not synchronize with this shell.

**Local validation passed on November 18, 2026.** The maintainer ran `make -C apps/macos check` successfully and confirmed the menu-bar panel, Quit and relaunch, light/dark appearance, and both bundled languages. The new macOS CI workflow awaits its first run. These local results do not establish accessibility, distribution, or broader OS/device coverage.

The shell opens no listeners, advertises no Bonjour service, stores no pairing secrets, and sends no media, input, or power commands. A running panel is not evidence that the phone can control the Mac. Its connection status explicitly says connections are unavailable.

## Architecture

The application is a native SwiftUI target under `apps/macos`. `RemoteControlAgentApp` owns the application's scene and supplies a termination callback to `AgentMenuView`. This keeps application-lifecycle behavior at the composition root. The menu view composes the header, setup card, version, and Quit button. `AgentStatusCard` presents the current milestone's fixed status; it is not a simulated network state machine.

`MenuBarExtra` uses the window presentation style so the panel can contain ordinary SwiftUI views. `LSUIElement` identifies the application as a menu-bar utility without a Dock icon. UI declarations use explicit `@MainActor` isolation and compile in Swift 6 language mode with warnings treated as errors.

There are no domain, application-service, networking, or system-adapter layers yet. Introduce them when actual command behavior is implemented. The intended future dependency direction is from the SwiftUI composition root into application use cases, with native adapters implementing the required boundaries. UI views should not become the command server.

## Visual and Language Behavior

The panel uses system text styles, SF Symbols, native material, rounded surfaces, and a green accent that changes for light and dark appearance. The icon is decorative inside the panel; the menu-bar scene supplies its accessibility title. Text is allowed to wrap, and the status remains understandable without relying on color.

The native String Catalog provides English and Ukrainian strings. English is the development language. macOS chooses a supported language using the application's language preferences. An independent Mac language/theme picker and synchronization with iPhone preferences are outside this milestone.

The app reads its displayed version from its processed bundle metadata. There is no hardcoded duplicate version in the SwiftUI view. The initial menu-bar laptop symbol and generic application-bundle icon are temporary branding.

## Build Inputs and Outputs

XcodeGen reads `apps/macos/project.yml` and creates `RemoteControlAgent.xcodeproj`. Sources, the String Catalog, and `Info.plist` remain in Git; the generated project and `build/` directory are ignored by the package-local `.gitignore`.

The manifest defines one application target and one shared scheme. The configured minimum deployment target is macOS 15.0. This value establishes a compiler availability boundary, not a claim that all supported macOS releases have been manually tested.

The local configuration uses ad hoc signing (`CODE_SIGN_IDENTITY = -`) and enables the hardened runtime. It does not register a team, export a signing identity, or create a notarized distribution build. The shell introduces no entitlements or permission prompts. macOS system-control permissions must be designed and validated with the relevant adapters later.

See [ADR 0002](adr/0002-macos-project-generation.md) for tradeoffs and [the package README](../apps/macos/README.md) for exact commands.

## Quality Checks and CI

Run from the repository root:

```bash
pnpm check
make -C apps/macos check
git diff --check
```

The first command retains the existing mobile and documentation checks. The second runs the formatter's strict lint mode, generates the Xcode project, and compiles the native app. If formatting needs changes, apply them with `make -C apps/macos format`, review the diff, and rerun the native check.

The new `.github/workflows/macos.yml` defines `macOS build` on `macos-26`, selecting the documented Xcode 26.6 installation. The maintainer's local Xcode is 27.2. The workflow logs tool versions, installs XcodeGen through Homebrew, and runs the same native check as local development. Its generator installation follows Homebrew rather than an exact package lock; the specification enforces the minimum supported generator version. Toolchain changes require review if generation or formatting behavior changes.

The job has read-only repository contents permissions, does not persist checkout credentials, and has a 15-minute timeout. Push and pull-request path filters cover `apps/macos/**` and the workflow itself. The existing Ubuntu `Quality checks` job remains separate.

The new status is **not yet a required branch-protection check**. Do not make a path-filtered workflow an unconditional required check: a pull request outside those paths may not produce that status. Define an always-reporting job before changing branch-protection requirements.

The current shell has no business logic to justify a placeholder unit-test suite. Compilation and manual lifecycle checks are the relevant first checks. Add focused tests for future authentication, permissions, state transitions, bounded commands, and timer behavior when those contracts exist.

## Recorded Validation

The maintainer performed these checks on November 18, 2026:

| Check                                     | Observed result                                      |
| ----------------------------------------- | ---------------------------------------------------- |
| `make -C apps/macos check`                | Completed; terminal ended with `BUILD SUCCEEDED`     |
| Strict Swift lint and XcodeGen generation | Passed as preceding steps of the native check        |
| Open the Debug bundle                     | Menu-bar panel opened                                |
| Quit from the panel                       | Application terminated and menu-bar item disappeared |
| Open the bundle again                     | Menu-bar item returned and panel reopened            |
| Light and dark macOS appearance           | Both modes reported readable and correct             |
| Ukrainian launch override                 | Ukrainian text displayed without reported clipping   |
| English launch override                   | English text restored and displayed correctly        |

Localization was checked after quitting the previous process, using one launch override at a time:

```bash
open apps/macos/build/DerivedData/Build/Products/Debug/RemoteControlAgent.app \
  --args -AppleLanguages '(uk)'
```

```bash
open apps/macos/build/DerivedData/Build/Products/Debug/RemoteControlAgent.app \
  --args -AppleLanguages '(en)'
```

These are development test launches. The source continues to use native macOS language selection; no custom language-switching state was added to the app.

The following checks remain unrecorded:

- Explicit confirmation that the app has no Dock icon.
- VoiceOver labels, keyboard focus, and the Quit keyboard shortcut.
- Generated-file exclusions verified against the actual post-build Git status.
- First successful `macOS build` workflow run.
- A wider device/OS matrix, including the configured minimum macOS deployment version.

Local native checks are separate from `pnpm check`. Run the repository checks again before committing this milestone; the existing 13 mobile unit tests do not test the macOS UI.

## Next Integration Boundary

The next milestone should first validate a Mac system adapter and its permission requirements, then introduce a bounded command contract and authenticated transport. Pairing, connection state, and actual device controls require implementation and tests before this status can change to accepting phone connections.

## References

- [Apple MenuBarExtra](https://developer.apple.com/documentation/swiftui/menubarextra)
- [Apple LSUIElement](https://developer.apple.com/documentation/bundleresources/information-property-list/lsuielement)
- [Apple String Catalogs](https://developer.apple.com/documentation/xcode/localizing-and-varying-text-with-a-string-catalog)
- [XcodeGen project specification](https://github.com/yonaskolb/XcodeGen/blob/master/Docs/ProjectSpec.md)
- [Swift formatter](https://github.com/swiftlang/swift-format)
- [macOS 26 runner image](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md)
