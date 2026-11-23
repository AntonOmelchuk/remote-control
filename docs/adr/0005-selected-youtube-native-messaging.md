# ADR 0005: Selected YouTube Control Through Native Messaging

- Status: Accepted; primary native/browser/device workflow verified, feature CI pending
- Date: November 22, 2026
- Baseline: `4d11376`

## Context

The authenticated iPhone-to-Mac audio path is merged and verified on the primary devices. YouTube playback needs access to the actual browser player. Public system media-key events cannot reliably identify a selected tab or confirm the outcome. Embedding browser secrets in mobile JavaScript or giving a page system-command access would cross existing trust boundaries.

## Decision

Add a Chrome Manifest V3 extension, a separate Swift Native Messaging executable, and an explicit per-run browser capability in the Agent. Select one top-level YouTube watch document through the popup. Read and control its standard HTML video element; do not depend on undocumented YouTube playback APIs.

Reuse the saved phone's authenticated WSS session for an absolute `setPlayback(targetID, paused)` action. Keep the browser peer on a separate directional allowlist. Reuse TLS pinning in the native helper, not JavaScript. Use a private atomic runtime file for the ephemeral browser-only token; do not grant the helper access to phone Keychain credentials.

Share pure media DTO validators through `@remote-control/remote-link/media` and a three-consumer JSON fixture. Keep the Expo facade separate from browser bundles. Maintain legacy audio transport names for compatibility while composing audio and media snapshots under one increasing broker revision.

## Alternatives

| Option                                             | Reason not selected                                                           |
| -------------------------------------------------- | ----------------------------------------------------------------------------- |
| Simulated system media keys                        | Ambiguous destination and weak confirmed-state reporting                      |
| Browser automation / remote debugging              | Excessive browser privileges and deployment surface for this task             |
| Extension directly handles saved phone credentials | Moves system authority and secrets into the browser                           |
| Unauthenticated localhost HTTP control API         | Adds another unauthenticated command surface and origin policy                |
| Cloud relay                                        | Unnecessary for the local-network product and does not solve player selection |

## Consequences

The user must install/reload an unpacked extension and register the helper locally. The extension identity is stable through a public development key, which does not establish publisher authenticity. Distribution, signing/notarization, browser-channel support, discovery and a richer site-adapter contract remain later decisions.

Autoplay, suspension, advertisements and changes to YouTube's DOM can limit operation. Commands are bounded, correlated and target-checked but not transactional; lost/late playback outcomes are not automatically retried. The UI shows confirmed state and independent media errors. Real Chrome/device checks are required before recording this milestone as verified.

See [YouTube control](../youtube-control.md) for setup, ownership, threat boundaries, limits and the validation matrix.

## Validation Follow-up: November 23, 2026

The maintainer completed the Mac Agent/helper checks, signed launch, native-host registration and physical iOS build. The iOS build exposed a Mac-only filesystem API in shared sources; `BrowserRuntimeStore` is now compiled only on macOS/Linux, preserving its portable filesystem tests. Actual playback exposed a UUID text-casing mismatch missed by the original same-case fixture. TypeScript now canonicalizes validated UUIDs while preserving case-sensitive YouTube video IDs.

Phone Pause/Play, browser-to-phone synchronization, changing videos in one selected watch tab, and media clearing with continued audio control after closing the tab passed. The follow-up passes 28 mobile and 14 extension tests. Final Mac checks after the guard, feature CI, long-running/background behavior and the remaining failure matrix are still pending.
