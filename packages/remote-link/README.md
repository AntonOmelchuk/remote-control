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

The original pairing flow saves and verifies access. `openAudio` now opens a distinct authenticated session with absolute audio commands and confirmed snapshots. Media, input, timer, and power actions remain unsupported. Saved access alone is not an active remote session.

```bash
swift test --package-path packages/remote-link -Xswiftc -warnings-as-errors
```

The platform-independent suite runs on Linux and macOS. On macOS, SwiftPM also compiles the native Foundation/Security client target, and three additional CryptoKit tests run. The Expo module requires an iOS development build. SwiftPM does not compile the Expo bridge.

On November 20, 2026, all 18 pairing tests passed on the maintainer's Mac (15 portable boundary tests plus three Apple-only crypto tests). The updated iOS development build launched and completed QR pairing, saved-access verification after separately restarting the phone app and Mac Agent, revocation rejection, and successful re-pairing. The signed Mac build's application/team identifier entitlements were verified. The pairing feature subsequently passed both CI jobs and was merged; current remote-audio CI remains pending; broader network and failure-case checks are recorded separately.

See [Secure Local Pairing](../../docs/secure-pairing.md) for security properties, failure recovery, build steps, limitations, and the device validation checklist.

## Remote Audio Update

`RemoteAudioWire.swift` defines bounded audio DTOs and the session/sequence/rate gate. `PinnedTransport.swift` shares the existing pin policy with `RemoteAudioClient.swift`, which owns the persistent session, native cache, heartbeat, command matching, deadlines, and cancellation. The Expo facade exposes `audioAPIVersion` for old-binary detection. No credentials or hardware UIDs cross into JavaScript.

The shared JSON fixture in `Tests/RemotePairingTests/Fixtures/` is consumed by Swift and mobile tests. The current portable protocol suite has 25 tests passing on Linux; all 28 tests, including the three Apple-only cases, subsequently passed on the Mac. The maintainer subsequently passed Apple compilation and the initial volume/mute/synchronization device checks. The maintainer also reported the UI follow-up working and verified active revocation/re-pairing. Feature CI and the broader failure matrix remain pending. See [Authenticated Remote Audio](../../docs/remote-audio-control.md).
