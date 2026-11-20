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

The initial pairing protocol supports only pairing and saved-access verification. It has no remote audio, media, touchpad, timer, or power handler. Saved access is not an active remote session.

```bash
swift test --package-path packages/remote-link -Xswiftc -warnings-as-errors
```

The platform-independent suite runs on Linux and macOS. On macOS, SwiftPM also compiles the native Foundation/Security client target, and three additional CryptoKit tests run. The Expo module requires an iOS development build. SwiftPM does not compile the Expo bridge.

On November 20, 2026, all 18 pairing tests passed on the maintainer's Mac (15 portable boundary tests plus three Apple-only crypto tests). The updated iOS development build launched and completed QR pairing, saved-access verification after separately restarting the phone app and Mac Agent, revocation rejection, and successful re-pairing. The signed Mac build's application/team identifier entitlements were verified. The feature's CI run remains pending; broader network and failure-case checks are recorded separately.

See [Secure Local Pairing](../../docs/secure-pairing.md) for security properties, failure recovery, build steps, limitations, and the device validation checklist.
