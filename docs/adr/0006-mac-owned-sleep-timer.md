# ADR 0006: Mac-Owned Sleep Timer Bound to a Selected Document

- Status: Accepted; implementation checks complete, native/device validation pending
- Date: November 24, 2026
- Baseline: `e92bec1`

## Context

The selected-YouTube workflow is merged after successful CI and primary-device checks. Users need arbitrary timer durations, including 2 h 45 min, and expect a countdown to survive closing the phone app. iOS JavaScript scheduling cannot provide that guarantee. A saved video target becomes stale when the selected tab advances to another video.

## Decision

Host one non-persistent 1–720-minute timer on the Agent. Keep a pure Swift deadline/ownership state machine in RemoteCore and a MainActor application controller for scheduling and browser I/O. Use `ContinuousClock` deadlines and reject expirations more than 15 seconds late. Do not prevent Mac sleep.

Introduce a document-selection UUID that remains stable across SPA video changes. At expiration, obtain the current ready video target from that selection and request absolute pause through the existing confirmed playback path. Reselection, document loss, bridge teardown, Stop and creator revocation cancel the schedule. Normal phone session closure does not.

Reuse the authenticated WSS session, shared revision stream, native cache and strict action gates. Require the expected timer UUID for cancellation/replacement, and generation-check asynchronous completion. Add a separate typed timer error; keep audio/media errors independent. The duration picker edits local state and sends only on Apply.

## Alternatives

| Option                            | Tradeoff                                                                              |
| --------------------------------- | ------------------------------------------------------------------------------------- |
| Phone JavaScript timeout          | Cannot continue reliably after suspension or process termination                      |
| Persist wall-clock expiry         | Adds restart/wake/recovery semantics and calendar-change policy beyond this increment |
| Pin initial video target          | Timer would fail on ordinary next-video navigation in the intended tab                |
| Follow any currently selected tab | Can unexpectedly act on a different document after a new user selection               |
| Cloud scheduler                   | Adds infrastructure without solving local player access or sleeping Mac behavior      |

## Consequences

Update Agent, helper, extension and iOS binary together. The timer requires an awake Agent and usable selected browser document. Schedules are lost on Agent restart. Late or uncertain outcomes are reported without automatic retry. Cancellation cannot undo a browser action already dispatched.

See [Sleep timer](../sleep-timer.md) for source ownership, state transitions, security boundaries, installation, exact validation evidence and the pending acceptance matrix.
