# Remote Control for iPhone

**Current status:** pairing and audio passed the primary-device checks and both feature CI jobs before merge. Selected YouTube playback was verified on the primary Mac/iPhone on November 23: Pause/Play, browser-to-phone synchronization, changing videos in one selected tab, and audio control after closing that tab. The updated native apps launched after the iOS platform guard, and the UUID-casing fix passed 28 mobile and 14 extension tests. Final Mac checks after the guard, YouTube CI and broader failure/accessibility coverage remain pending. See [YouTube control](../../docs/youtube-control.md) for setup and recorded coverage.

The Expo/React Native client for controlling a Mac on the local network. Secure pairing and saved-access verification are implemented and locally verified. Live remote audio has passed the primary-device workflow; selected YouTube playback has passed the primary-device workflow; timers and power remain planned. The remote preview continues to use local sample state.

## Current Features

- Home, connection guide, QR pairing, Mac remote, remote preview, and Settings routes through Expo Router.
- Native QR camera scanner and a pinned TLS pairing client implemented in the `@remote-control/remote-link` workspace module.
- Explicit approval on the Mac, native Keychain credentials, saved-access verification, and local credential removal.
- Persistent system/English/Ukrainian language and system/light/dark appearance preferences.
- Preview volume/mute, play/pause, seeking, and timer presets, isolated from Mac commands.

On November 20, 2026, the maintainer launched the updated development build on the physical iPhone and verified pairing, saved-access verification after separately restarting the phone app and Mac Agent, revocation rejection, and successful re-pairing. `pnpm check` passed all 15 mobile tests alongside formatting, ESLint, and TypeScript. Feature CI and wider device/accessibility checks remain pending.

## Development

Run from the repository root with the Node/pnpm versions selected there:

```bash
pnpm install --frozen-lockfile
pnpm --dir apps/mobile exec expo start --dev-client
```

A development build is required for the custom native pairing module. Expo Go and older development binaries keep preview access and show a rebuild explanation when pairing is unavailable. Metro serves the JavaScript bundle during development; standalone release distribution is separate work.

After native dependency or configuration changes, regenerate through Expo and build for the physical iPhone:

```bash
pnpm --dir apps/mobile exec expo prebuild --platform ios
pnpm --dir apps/mobile exec expo run:ios --device
```

Use the Xcode account/team configured for your working development build. Generated `ios/` files, Pods, and signing artifacts remain ignored. Source-level permissions and locale text are configured in `app.json` and `locales/`; the camera configuration does not request microphone access. A simulator runtime is not required for the documented device workflow.

See [iOS Development Build](../../docs/ios-development-build.md) for signing, trust, Metro, and troubleshooting details.

## Source Ownership

| Path                           | Responsibility                                                                                             |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `src/app/`                     | Thin route entries and root navigation/providers                                                           |
| `src/components/ui/`           | Shared text, buttons, symbols, and screen layout                                                           |
| `src/design-system/`           | Theme palettes, tokens, and theme-aware styles                                                             |
| `src/features/connection/`     | Home, Mac illustration, and connection guide                                                               |
| `src/features/pairing/`        | Lazy-loaded scanner, comparison and saved-access UI, operation cancellation, and native-summary validation |
| `src/features/remote-preview/` | Preview cards, timer picker, and isolated sample state                                                     |
| `src/features/settings/`       | Language and appearance selection                                                                          |
| `src/localization/`            | Typed English/Ukrainian resources and translation setup                                                    |
| `src/preferences/`             | Versioned preference validation, restoration, and serialized writes                                        |
| `locales/`                     | Native camera/local-network permission text                                                                |
| `tests/`                       | Preferences, localization, contrast, native-summary, and audio fixture tests                               |
| `../../packages/remote-link/`  | Shared Swift pairing protocol, native iOS client, Keychain/TLS boundary, and Expo facade                   |

The shared native package is linked as a pnpm workspace dependency and discovered by Expo Autolinking. TLS identity checks and saved tokens stay native; JavaScript receives display summaries and operation results. The scanned QR text exists briefly in camera-event memory and is not persisted. Phone pairing currently saves one Mac credential.

## Checks and Limits

```bash
pnpm check
make -C apps/macos check
```

The first command checks repository formatting, mobile/native-facade ESLint, mobile TypeScript, and 28 mobile and 14 browser unit tests, plus the extension bundle. The second checks the Swift packages and Mac application on macOS. Neither command replaces the physical iOS build or manual network/camera checks.

Saved access is not a continuous remote session. The remote-audio update separates listener start, QR creation, saved-device labels, and active-session labels; its primary-device behavior has been checked; broader UI/accessibility coverage remains pending. Current pairing, signing, security boundaries, verified scenarios, and remaining cases are documented in [Secure Local Pairing](../../docs/secure-pairing.md).

- [Root project overview](../../README.md)
- [Mobile shell](../../docs/mobile-shell.md)
- [Preferences architecture](../../docs/app-preferences.md)
- [Native pairing package](../../packages/remote-link/README.md)

## Selected YouTube Card

`src/features/youtube/` renders confirmed metadata, position and play/pause. The existing focused remote hook serializes audio/media writes and reads the native cache. `mediaFailure` is independent of audio errors. `mediaAPIVersion` gates the native method for older installed binaries. Rebuild the iOS development app for this Swift change; Expo Go and a Metro-only reload cannot add the playback method. The shared timestamp formatter handles fractional positions and hours.
