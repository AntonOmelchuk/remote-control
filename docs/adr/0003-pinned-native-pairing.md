# ADR 0003: Native Pinned TLS for Local Pairing

- **Status:** Accepted; native build/signing and primary physical-device pairing/revocation checks passed on 2026-11-20. Feature CI pending.
- **Date:** 2026-11-20

## Context

The phone must authenticate a Mac on a local network without a public CA, cloud account, or globally trusted certificate installation. Sharing a Wi-Fi network does not establish trust. An ordinary JavaScript WebSocket does not provide the per-connection certificate-pin decision required by this onboarding flow.

## Decision

Use WSS with a TLS 1.3 minimum. The Mac creates and persists a self-signed P-256 identity using Apple's X.509 package and Keychain. A short-lived QR invitation carries the exact leaf-certificate fingerprint and a random 256-bit onboarding secret. An iOS native Expo module evaluates the pin before sending a request proof or credential. The Mac requires explicit approval of a matching comparison code.

Share protocol source through a package that supports both SwiftPM and Expo/CocoaPods. Keep credential storage and transport trust native. Expose only display metadata through the JavaScript facade. Keep the existing remote preview independent from the pairing workflow.

Do not use an accept-all certificate delegate, a globally trusted development root, a certificate/private key committed to the repository, or an unauthenticated command server. Do not invent an application encryption protocol. TLS provides encryption and peer key possession; CryptoKit HMAC supplies the bounded invitation proof and stored-token verifier.

## Consequences

- A new physical-device development build is necessary; Expo Go retains preview access but cannot pair.
- The Mac adds exact-version Apple X.509/ASN.1 package dependencies. The shared protocol itself retains no external Swift dependency.
- First launch can require Keychain and local network permission. No system certificate trust profile is installed on the phone.
- Native trust evaluation intentionally uses the scanned leaf as its trust anchor instead of IP/DNS hostname identity. Identity changes require a new pairing; no silent fallback or rotation is implemented.
- The first milestone uses private IPv4 addresses and a fixed port. Bonjour relocation and continuous authenticated remote sessions follow separately.
- Pairing acknowledgment is not a distributed transaction. Saved-access verification provides recovery after a lost final response.
- Future remote commands must separately validate device access, current capabilities, argument bounds, output identity, and command/retry semantics. Pairing success alone does not implement those handlers.

See [Secure Local Pairing](../secure-pairing.md) for the protocol, storage details, and validation checklist.

## Signing Follow-up: 2026-11-20

The first Mac runtime attempt failed at private-key insertion with `errSecMissingEntitlement` (-34018). The built ad-hoc app exposed only its debugger entitlement. Make Keychain backend selection explicit: use Data Protection Keychain for identities and generic credentials, including identity lookup through the SecItem API.

Add a developer-signed `SignedDebug` runtime configuration with application/team identifier entitlements. Keep the ad-hoc `Debug` configuration for compilation and CI. Local developers supply their Xcode team through a command argument or an ignored xcconfig, and the signed build verifies its actual signature and entitlements before launch. There is no automatic fallback to file-based storage and no credential reset on an entitlement failure. The developer-signed app subsequently passed signature/entitlement checks and the pairing, restart persistence, revocation, and re-pairing workflow on the maintainer's devices. The listener uses the address and port from `requiredLocalEndpoint` with `NWListener(using:)`; it does not pass a conflicting second port argument.
