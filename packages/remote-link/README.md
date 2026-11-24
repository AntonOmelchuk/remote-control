# RemoteLink

This workspace package provides the shared Swift pairing protocol and the native iOS Expo bridge. The Mac consumes its `RemotePairing` SwiftPM library. The iOS app consumes `@remote-control/remote-link`, and Expo Autolinking compiles the same Swift protocol sources alongside the native client.

| Path                                        | Responsibility                                                                                             |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `Sources/RemotePairing/PairingWire.swift`   | Versioned invitations/frames, bounded decoding, address/name validation, and native saved-credential model |
| `Sources/RemotePairing/PairingGate.swift`   | Authoritative monotonic deadline, request reservation, single use, and invalid-proof budget                |
| `Sources/RemotePairing/AppleSecurity.swift` | Apple-only CSPRNG, HMAC, comparison code, certificate fingerprint, and Keychain wrapper                    |
| `apple/PairingClient.swift`                 | Actor-isolated iOS client, TLS pinning, Keychain persistence, saved-access verification, and cancellation  |
| `apple/RemoteLinkModule.swift`              | Expo functions; exports only display summaries and operation results                                       |
| `src/index.ts`                              | Optional native-module loading and typed facade                                                            |
| `Tests/RemotePairingTests/`                 | Protocol, expiry, replay/reservation, input bounds, and Apple-only crypto tests                            |

The original pairing flow saves and verifies access. `openAudio` now opens a distinct authenticated session with absolute audio commands and confirmed snapshots. A selected YouTube target can also receive absolute play/pause through `setPlayback`; input, timer and power actions remain unsupported. Saved access alone is not an active remote session.

```bash
swift test --package-path packages/remote-link -Xswiftc -warnings-as-errors
```

The platform-independent suite runs on Linux and macOS. On macOS, SwiftPM also compiles the native Foundation/Security client target, and three additional CryptoKit tests run. The Expo module requires an iOS development build. SwiftPM does not compile the Expo bridge.

On November 20, 2026, all 18 pairing tests passed on the maintainer's Mac (15 portable boundary tests plus three Apple-only crypto tests). The updated iOS development build launched and completed QR pairing, saved-access verification after separately restarting the phone app and Mac Agent, revocation rejection, and successful re-pairing. The signed Mac build's application/team identifier entitlements were verified. The pairing feature subsequently passed both CI jobs and was merged; remote-audio CI passed before merge; broader network and failure-case checks are recorded separately.

See [Secure Local Pairing](../../docs/secure-pairing.md) for security properties, failure recovery, build steps, limitations, and the device validation checklist.

## Remote Audio Update

`RemoteAudioWire.swift` defines bounded audio DTOs and the session/sequence/rate gate. `PinnedTransport.swift` shares the existing pin policy with `RemoteAudioClient.swift`, which owns the persistent session, native cache, heartbeat, command matching, deadlines, and cancellation. The Expo facade exposes `audioAPIVersion` for old-binary detection. No credentials or hardware UIDs cross into JavaScript.

The shared JSON fixture in `Tests/RemotePairingTests/Fixtures/` is consumed by Swift and mobile tests. The audio baseline portable protocol suite had 25 tests passing on Linux; all 28 tests, including the three Apple-only cases, subsequently passed on the Mac. The maintainer subsequently passed Apple compilation and the initial volume/mute/synchronization device checks. The maintainer also reported the UI follow-up working and verified active revocation/re-pairing. Audio feature CI passed; broader failure coverage remains pending. See [Authenticated Remote Audio](../../docs/remote-audio-control.md).

## Selected YouTube Boundary

`MediaWire.swift` validates media snapshots and fixed failure codes. `BrowserBridgeWire.swift` defines a separate browser-only gate and Native Messaging codec. `BrowserBridgeRuntime.swift` publishes a private, generation-bound capability outside the repository. `BrowserBridgeIdentity.swift` pins the allowed development extension origin.

The TypeScript `./media` export is framework-free and safe to bundle in Chrome. The default export remains the Expo native facade; browser code must not import it. `src/package.json` defines the ESM scope for direct Node TypeScript tests while the ESLint configuration remains CommonJS. `mediaAPIVersion` distinguishes updated iOS binaries.

The new fixture is consumed by Swift, mobile and extension tests. The portable suite has 31 passing tests; The maintainer subsequently completed the native Mac check and physical iOS compilation after restricting `BrowserRuntimeStore` to macOS/Linux. Primary selected-video playback and synchronization then passed after canonicalizing target/request UUID text in TypeScript. Final Mac checks and both YouTube feature CI jobs subsequently passed before merge as `e92bec1`. Broader failure coverage remains pending. See [YouTube control](../../docs/youtube-control.md).

## Mac-Owned Sleep Timer

The timer increment adds custom 1–720-minute scheduling on the Mac, a separate selected-document identity, stale-command protection and independent timer status. It pauses the current ready video in that document and continues after the phone session closes. The schedule is in memory only; the Mac must remain awake. Creator revocation, selection loss and connection shutdown cancel active timers. There is no power action or automatic replay after an uncertain result.

Portable checks pass 25 core, 36 protocol, 34 mobile and 16 extension tests. These do not establish Apple SDK compilation or physical-device behavior. Updated native builds, helper installation, Chrome/iPhone acceptance and timer CI remain pending. Read the [sleep timer guide](../../docs/sleep-timer.md) for exact source ownership, security rules, coordinated upgrade steps and the pending acceptance matrix.
