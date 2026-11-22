# macOS Agent Shell

## Scope and Status

This milestone introduces the Mac application's lifecycle and presentation layer. It adds a menu-bar panel, an explicit setup-only connection status, and a Quit action. The UI follows macOS appearance and preferred application language using bundled English and Ukrainian resources. Phone preference choices do not synchronize with this shell.

**Local validation passed on November 18, 2026.** The maintainer ran `make -C apps/macos check` successfully and confirmed the menu-bar panel, Quit and relaunch, light/dark appearance, and both bundled languages. Both GitHub jobs subsequently passed for the shell baseline. The next local-audio milestone is documented separately in [macOS Audio Control](macos-audio-control.md). These local results do not establish accessibility, distribution, or broader OS/device coverage.

The Agent opens no network listeners, advertises no Bonjour service, stores no pairing secrets, and sends no media, input, or power commands. The local-audio milestone adds hardware-property observers and local sound controls. A running panel is not evidence that the phone can control the Mac. Its connection status explicitly says connections are unavailable.

## Architecture

The application is a native SwiftUI target under `apps/macos`. `RemoteControlAgentApp` owns the application's scene and supplies a termination callback to `AgentMenuView`. This keeps application-lifecycle behavior at the composition root. The menu view composes the header, setup card, version, and Quit button. `AgentStatusCard` presents the current milestone's fixed status; it is not a simulated network state machine.

`MenuBarExtra` uses the window presentation style so the panel can contain ordinary SwiftUI views. `LSUIElement` identifies the application as a menu-bar utility without a Dock icon. UI declarations use explicit `@MainActor` isolation and compile in Swift 6 language mode with warnings treated as errors.

The shell baseline introduced presentation and lifecycle only. The audio milestone now adds its first application service and native adapter; see [macOS Audio Control](macos-audio-control.md) for the current boundaries. The intended future dependency direction is from the SwiftUI composition root into application use cases, with native adapters implementing the required boundaries. UI views should not become the command server.

## Visual and Language Behavior

The panel uses system text styles, SF Symbols, native material, rounded surfaces, and a green accent that changes for light and dark appearance. The icon is decorative inside the panel; the menu-bar scene supplies its accessibility title. Text is allowed to wrap, and the status remains understandable without relying on color.

The native String Catalog provides English and Ukrainian strings. English is the development language. macOS chooses a supported language using the application's language preferences. An independent Mac language/theme picker and synchronization with iPhone preferences are outside this milestone.

The app reads its displayed version from its processed bundle metadata. There is no hardcoded duplicate version in the SwiftUI view. The initial menu-bar laptop symbol and generic application-bundle icon are temporary branding.

## Build Inputs and Outputs

XcodeGen reads `apps/macos/project.yml` and creates `RemoteControlAgent.xcodeproj`. Sources, the String Catalog, and `Info.plist` remain in Git; the generated project and `build/` directory are ignored by the package-local `.gitignore`.

The manifest defines one application target and one shared scheme. The configured minimum deployment target is macOS 15.0. This value establishes a compiler availability boundary, not a claim that all supported macOS releases have been manually tested.

The original shell used an ad-hoc Debug build. The current quality-check configuration retains that signing mode; Xcode reports Hardened Runtime disabled for ad-hoc signing. The pairing runtime now uses developer-signed SignedDebug with application/team identifier entitlements. See [Secure Local Pairing](secure-pairing.md) for verified signing and Keychain behavior, and the package README for the ignored local team configuration. Distribution signing and notarization remain separate work.

See [ADR 0002](adr/0002-macos-project-generation.md) for tradeoffs and [the package README](../apps/macos/README.md) for exact commands.

## Quality Checks and CI

Run from the repository root:

```bash
pnpm check
make -C apps/macos check
git diff --check
```

The first command retains the existing mobile and documentation checks. The second now runs strict Swift lint, the shared core tests, project generation, and the native app build. If formatting needs changes, apply them with `make -C apps/macos format`, review the diff, and rerun the native check.

The new `.github/workflows/macos.yml` defines `macOS build` on `macos-26`, selecting the documented Xcode 26.6 installation. The maintainer's local Xcode is 27.2. The workflow logs tool versions, installs XcodeGen through Homebrew, and runs the same native check as local development. Its generator installation follows Homebrew rather than an exact package lock; the specification enforces the minimum supported generator version. Toolchain changes require review if generation or formatting behavior changes.

The job has read-only repository contents permissions, does not persist checkout credentials, and has a 15-minute timeout. Push and pull-request path filters now cover `apps/macos/**`, `packages/remote-core/**`, `packages/remote-link/**`, and the workflow itself. The existing Ubuntu `Quality checks` job remains separate.

The new status is **not yet a required branch-protection check**. Do not make a path-filtered workflow an unconditional required check: a pull request outside those paths may not produce that status. Define an always-reporting job before changing branch-protection requirements.

The initial shell used compilation and lifecycle checks. The audio milestone adds 15 isolated Swift core tests for command safety and observer lifecycle. Future authentication, permissions, and timer contracts require their own focused tests.

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
- The current pairing feature workflow run; both shell and audio baselines passed GitHub checks.
- A wider device/OS matrix, including the configured minimum macOS deployment version.

Local native checks are separate from `pnpm check`. The pairing milestone subsequently passed both commands, including 15 mobile and 33 Swift tests. The mobile tests do not test the macOS UI.

## Next Integration Boundary

Local Core Audio controls and secure pairing have since been implemented and verified on the maintainer's devices. The next boundary is authenticated remote audio: bounded commands, current-device validation, confirmed state, and connection recovery. Saved pairing access is not a continuous command session. See [macOS Audio Control](macos-audio-control.md) and [Secure Local Pairing](secure-pairing.md).

## References

- [Apple MenuBarExtra](https://developer.apple.com/documentation/swiftui/menubarextra)
- [Apple LSUIElement](https://developer.apple.com/documentation/bundleresources/information-property-list/lsuielement)
- [Apple String Catalogs](https://developer.apple.com/documentation/xcode/localizing-and-varying-text-with-a-string-catalog)
- [XcodeGen project specification](https://github.com/yonaskolb/XcodeGen/blob/master/Docs/ProjectSpec.md)
- [Swift formatter](https://github.com/swiftlang/swift-format)
- [macOS 26 runner image](https://github.com/actions/runner-images/blob/main/images/macos/macos-26-Readme.md)
