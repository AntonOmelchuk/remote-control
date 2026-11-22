# ADR 0004: Foreground Audio Sessions with Confirmed State

- **Status:** Accepted; primary native/device checks, UI follow-up smoke check, and active revocation/re-pairing passed. Feature CI and broader failure cases pending.
- **Date:** 2026-11-22

## Context

Pairing establishes saved access, but a short verification connection cannot synchronize remote controls. The Mac's existing audio service originally supported one subscriber, so adding a second consumer would have replaced the panel's stream. HAL output routes and capabilities can also change between rendering a control and executing a command.

## Decision

Open a distinct `openAudio` session over the existing pinned native WSS transport after validating the saved device/token. Keep onboarding and short saved-access verification unchanged. Use an audio-only versioned contract for absolute volume, absolute mute, and refresh. Require a session UUID, monotonically increasing command sequence, request UUID, and an opaque current-output token for writes.

The Mac validates the command shape, sequence, rate, authorization, hardware identity, and capability. Return actual hardware readback with an increasing revision and a separate failure code. Push subsequent observed changes. Maintain independent service subscriptions over one hardware observer so closing the panel does not stop remote updates.

Keep the native client responsible for the socket, TLS pinning, heartbeat, deadlines, reply correlation, and cancellation. React reads a validated native cache every 500 ms while its remote route is focused. This deliberately avoids a network polling loop and an additional event-subscription ownership boundary for this milestone. An Expo event API can replace cache reads later if measurements justify it; it must preserve the same lifecycle and stale-result protections.

Serialize writes; commit a slider draft on release. Do not present a requested value as a confirmed hardware value, queue a backlog of taps, or replay a command after an uncertain connection failure. Explicit reconnect authenticates and obtains a fresh snapshot. Leaving the screen or entering the background ends the session.

## Consequences

- Existing credentials remain usable; a new QR is unnecessary when the saved address and identity still match.
- Both native apps need rebuilding. A capability constant allows older iOS binaries to show a rebuild explanation.
- Swift and TypeScript validate their boundaries independently and consume a shared JSON fixture to detect contract drift.
- A read-only volume capability does not remove writable mute, and a route change rejects a stale write instead of retargeting it.
- Revocation closes active peers and cancels pending tasks after storage succeeds. An already executing synchronous hardware write may finish; revocation does not undo it.
- Full-state snapshots, coalesced update queues, one in-flight command, frame/rate bounds, and deadlines limit memory and request accumulation.
- The UI refresh cadence adds up to approximately 500 ms for an external change to become visible after it reaches the native receiver; command results update React directly.
- This decision does not grant media, input, timer, display, or power permissions. Those require separate bounded contracts.

See [Authenticated Remote Audio](../remote-audio-control.md) for exact ownership, limits, validation, and manual scenarios.
