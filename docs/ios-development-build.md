# iOS Development Build

This guide covers local compilation, signing, installation, and everyday use of Remote Control on a physical iPhone. Run terminal commands from the repository root.

## Verified Milestone

On November 16, 2026, the maintainer built and installed Remote Control on an **iPhone XR running iOS 18.7.12**, using **Xcode 27.2**, **Node.js 24.22.3**, **pnpm 11.28.11**, and **CocoaPods 1.17.0**. After trusting the developer profile and connecting to Metro, the maintainer reported the current application functionality working.

This validates local native compilation, signing, installation, launch, and a manual smoke check of the existing shell, interactive preview, and preferences. Detailed language/theme persistence and system appearance checks were previously recorded in Expo Go; a separate exhaustive regression matrix for the native build has not been recorded.

Live Mac control, network pairing, the Agent, and browser integration are still planned. Native CI, TestFlight, standalone release behavior, VoiceOver, and larger text settings remain separate validation tasks. Run the quality checks before committing setup changes.

## What Runs Where

| Component                 | Responsibility                                                                |
| ------------------------- | ----------------------------------------------------------------------------- |
| Installed iOS application | Signed native binary containing React Native and the project's native modules |
| `expo-dev-client`         | Development launcher, developer menu, and debugging support                   |
| Metro on the Mac          | Serve the JavaScript bundle and development assets                            |
| Xcode and CocoaPods       | Compile native code, integrate dependencies, and sign the application         |
| Future macOS Agent        | Execute authenticated remote-control commands; not implemented yet            |

Metro is a development dependency. It is not the future Mac command server. The development build uses Metro in this workflow; a standalone release and distribution workflow has not been configured.

## Prerequisites

Check the selected Apple tools:

```bash
xcode-select -p
xcodebuild -version
pod --version
```

The selected developer directory should point into the intended Xcode installation, for example `/Applications/Xcode.app/Contents/Developer`.

If CocoaPods is absent and Homebrew is already installed, the maintainer's setup used:

```bash
brew install cocoapods
```

Select the project's Node.js environment and install existing dependencies as described in [Development Setup](development-setup.md). A simulator runtime is not required for this physical-device workflow.

The mobile manifest already includes `expo-dev-client` with the SDK 58-compatible range `~58.0.20`. Existing checkouts receive it from the lockfile. If recreating this integration in a different project, use Expo's dependency resolver:

```bash
pnpm --dir apps/mobile exec expo install expo-dev-client
```

## Pair the iPhone with Xcode

1. Connect the unlocked iPhone using a data-capable cable. A monitor's USB hub worked in the verified setup; the hub must have a data connection to the Mac.
2. Accept **Trust This Computer** on the phone when requested.
3. Open **Xcode > Open Developer Tool > Device Hub** and select the iPhone. Complete any pairing or device-preparation prompts.
4. Enable **Settings > Privacy & Security > Developer Mode** on the iPhone when requested. Restart and confirm activation. The option may appear only after pairing begins.

For the tested iOS 18 device, initial pairing uses a cable. Xcode 27's initial cable-free iPhone pairing requires iOS 27 or later. After pairing, Xcode supports wireless operation on the same network with IPv6 enabled. Disconnect the cable and confirm the phone remains available in Device Hub before relying on wireless installation. A complete wireless-only rebuild was not separately recorded in this milestone.

Trusting the computer, enabling Developer Mode, granting macOS access to a signing key, and trusting the app's developer profile are separate operations.

## Signing Identity and Application Identity

In **Xcode > Settings > Apple Accounts**, sign in to your own Apple Account and select your **Personal Team** or an authorized development team.

If no signing identity exists, choose **Manage Certificates > + > Apple Development**. Xcode creates a development certificate and its corresponding private key on this Mac.

| Item                                    | Purpose                                                             | Location                                         |
| --------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------ |
| Bundle identifier                       | Identify this application                                           | `ios.bundleIdentifier` in `apps/mobile/app.json` |
| Development certificate and private key | Establish the signing identity and sign code                        | Developer account and local macOS Keychain       |
| Provisioning profile                    | Authorize the application, team, and target devices for development | Managed by Xcode and embedded in the built app   |
| Developer profile trust                 | Permit the locally installed developer app to launch                | iPhone settings                                  |

The current bundle identifier is `com.antonomelchuk.remotecontrol`. Contributors using another team may need a unique identifier. Treat a change to it as a native configuration change requiring regeneration and a rebuild.

When macOS says **codesign wants to access a key**, enter the password for the `login` keychain, usually the macOS login password. **Always Allow** authorizes `codesign` to reuse that specific key without repeating the dialog. This is not an Apple Account password prompt.

Keep private keys and exported signing identities out of the repository. App signing proves the origin and integrity of the installed binary; the future remote-control pairing and authorization model is a separate security boundary.

## First Build and Installation

Stop an obsolete Metro session with Ctrl+C, then run:

```bash
pnpm --dir apps/mobile exec expo run:ios --device
```

Choose the physical iPhone and, if prompted, your signing identity or team. When `apps/mobile/ios` is absent, Expo generates it first. The build integrates Pods, compiles and signs the application, installs it, and attempts to launch it with a development server.

If iOS blocks the first launch because the developer profile is not trusted, open:

**Settings > General > VPN & Device Management > Developer App > your developer identity > Trust**.

Select the identity used for this build, then reopen Remote Control. Menu labels may vary with the phone's language.

## Daily Development

With the native application installed, start Metro:

```bash
pnpm --dir apps/mobile exec expo start --dev-client
```

Scan the terminal QR code using the iPhone camera and open the link in Remote Control. Keep the Mac and iPhone on a reachable local network. Allow local-network access if iOS requests it.

**Finding Dev Servers** is the development launcher's discovery screen. It means the launcher is open; it does not prove that the application JavaScript has loaded. Starting Metro and opening its QR link completed this step in the verified setup.

| Change                                                                      | Required action                                                         |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| React component, styles, translations, or other JavaScript/TypeScript logic | Keep Metro running; use Fast Refresh or reload                          |
| JavaScript-only dependency                                                  | Install it and restart Metro if necessary                               |
| Native dependency, native module, or config plugin                          | Regenerate the iOS project and rebuild                                  |
| Native app configuration such as bundle identifier or entitlements          | Regenerate and rebuild                                                  |
| Expired Personal Team provisioning                                          | Reprovision, rebuild, and reinstall using the same application identity |

## Generated Native Project

This repository uses Continuous Native Generation. `apps/mobile/ios` is generated and ignored by Git. Verify the rule with:

```bash
git check-ignore -v apps/mobile/ios/Podfile
```

The verified result identifies the `/ios` rule in `apps/mobile/.gitignore`.

Keep durable native settings in `app.json` and config plugins. Inspect generated files when debugging, but encode lasting changes in those inputs rather than relying on manual edits inside `ios/`.

After changing native inputs, review your working tree and preserve any investigation work before regenerating:

```bash
pnpm --dir apps/mobile exec expo prebuild --platform ios --clean
pnpm --dir apps/mobile exec expo run:ios --device
```

`prebuild --clean` deletes and recreates the generated iOS directory. It is not needed for ordinary UI edits. Personal account selection, certificates, and keychain permissions remain local machine setup.

## Troubleshooting

### No Code Signing Certificates Are Available

Having an Apple Account listed in Xcode does not guarantee this Mac has a usable signing identity. Create **Apple Development** under the intended team's **Manage Certificates** panel, then repeat the device build.

### ApplicationVerificationFailed During Installation

Read the underlying installation error before choosing a fix. To install an existing build directly and obtain detailed output:

```bash
xcrun devicectl list devices
xcrun devicectl device install app \
  --device '<device identifier>' \
  '/absolute/path/to/RemoteControl.app'
```

Replace both placeholders using the device list and the `.app` path printed by Expo. The phone must be paired and unlocked. This diagnostic repeats installation without recompiling.

In the first setup, the detailed error reported **No code signature found** for `hermesvm.framework`. The build log showed that signing had been attempted for Hermes and several other embedded frameworks, but those commands returned **errSecInternalComponent**.

This error has multiple possible causes. Given the concurrent Keychain access prompt, unavailable key access during that first signing attempt was the working hypothesis; the exact underlying Keychain failure was not independently isolated. After granting access, the following clean rebuild installed successfully:

```bash
pnpm --dir apps/mobile exec expo run:ios --device --no-build-cache
```

`--no-build-cache` clears native DerivedData before building. It differs from `prebuild --clean`, which regenerates native project files. Use cache cleanup for a concrete stale-artifact problem rather than on every build.

If signing still fails, check the certificate's validity, corresponding private key, and Keychain access using Apple's diagnostic guide linked below. Changing the JavaScript engine or manually re-signing the built app is not part of this project's setup.

To inspect the relevant part of Expo's native build log:

```bash
grep -n -C 3 -E 'Code Signing|codesign|errSecInternalComponent' \
  apps/mobile/.expo/xcodebuild.log
```

### Installation Succeeds but Launch Is Denied

An error mentioning an invalid signature, inadequate entitlements, or a profile that has not been explicitly trusted lists several possibilities. In this setup, trusting the matching developer profile on the iPhone resolved the launch block. If that profile is already trusted, collect the complete underlying error rather than assuming trust is always the cause.

### Metro Is Not Reachable

Confirm the terminal is running `expo start --dev-client`, open its QR link, and check local-network access on the phone. Guest Wi-Fi isolation, VPN routing, and firewalls may prevent the phone from reaching the Mac. Confirm the connection before rebuilding native code for a JavaScript-server discovery problem.

### pnpm Is Missing in a New Terminal

Load nvm and select `.nvmrc`:

```bash
source "$HOME/.nvm/nvm.sh"
nvm use
pnpm --version
```

See [Development Setup](development-setup.md) for pinned pnpm installation and the separate GUI Git-hook environment.

## Personal Team and Distribution

A free Personal Team supports local testing on personal devices. Its provisioning profiles expire seven days after issuance, after which the app needs reprovisioning, rebuilding, and reinstallation. This limit concerns development provisioning, not a seven-day lifetime for every certificate.

TestFlight distribution requires access to a team enrolled in the Apple Developer Program and a separately configured App Store Connect workflow. This milestone does not create a TestFlight build, a cloud build configuration, or a standalone release.

## Validation and Commit Scope

The native setup changed `apps/mobile/app.json`, `apps/mobile/package.json`, and `pnpm-lock.yaml`. The accompanying documentation updates the README, the general setup guide, and this guide. Generated native output remains ignored.

Run `pnpm check` and `git diff --check` in the complete development repository, review the diff, then commit the setup and documentation together. The Ubuntu CI workflow still validates formatting, lint, types, and unit tests only. Add a native CI job separately when its signing, runner, and cost requirements have been defined.

## References

- [Expo SDK 58 DevClient](https://docs.expo.dev/versions/v58.0.0/sdk/dev-client/)
- [Expo local development builds](https://docs.expo.dev/guides/local-app-development/)
- [Using a development build](https://docs.expo.dev/develop/development-builds/use-development-builds/)
- [Expo CLI build and cache flags](https://docs.expo.dev/more/expo-cli/)
- [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)
- [Expo Xcode signing setup](https://expo.fyi/setup-xcode-signing)
- [Apple Device Hub](https://developer.apple.com/documentation/xcode/managing-your-simulated-and-physical-devices-in-device-hub)
- [Apple Developer Mode](https://developer.apple.com/documentation/xcode/enabling-developer-mode-on-a-device)
- [Apple development signing identities](https://developer.apple.com/documentation/xcode/sharing-your-teams-signing-certificates)
- [Apple code-signing diagnostics](https://developer.apple.com/forums/thread/712005)
- [Apple device command-line tools](https://developer.apple.com/documentation/xcode/interacting-with-devices-using-the-command-line)
- [Apple Personal Team limits](https://developer.apple.com/help/account/basics/about-your-developer-account)
- [Homebrew CocoaPods formula](https://formulae.brew.sh/formula/cocoapods)
