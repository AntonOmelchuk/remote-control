# RemoteCore

The first shared Swift package contains audio-control models, a serialized application service, a hardware port, and isolated safety tests. It has no CoreAudio, SwiftUI, or third-party package dependency. The native adapter lives in `apps/macos`.

## Responsibilities

| Type                  | Responsibility                                                                  |
| --------------------- | ------------------------------------------------------------------------------- |
| `VolumeLevel`         | Reject non-finite scalar values and values outside `0...1`                      |
| `AudioOutputID`       | Bind a command to an observed HAL object ID and device UID                      |
| `AudioControl<Value>` | Represent unsupported, read-only, and writable controls explicitly              |
| `AudioOutputSnapshot` | Carry the observed output name, volume, mute, and capabilities                  |
| `AudioHardwarePort`   | Isolate synchronous hardware reads, writes, and observer registration           |
| `AudioOutputService`  | Serialize hardware access, validate identity/capabilities, and publish readback |
| `AudioUpdate`         | Order observed state with a monotonic revision                                  |
| `AudioCommandResult`  | Return current observed state and a separate command failure                    |

`AudioOutputService` is an actor. Each command validates the current output and executes its synchronous hardware operation without suspending inside the service. Native I/O therefore runs away from the SwiftUI main actor. The adapter rechecks the expected identity immediately before a write. A routing change causes rejection rather than a retry against another output.

The observation stream supports independent subscribers through one native observer. Each subscriber buffers only its newest update. Cancelling one subscriber leaves the others active; the final cancellation removes observation. Unique subscription IDs prevent a delayed old termination callback from cancelling a new subscription. `stopObserving()` finishes every stream during application shutdown.

A successful setter can precede the actual HAL state change. The result's snapshot is a read of hardware state at that moment. The service never substitutes the requested value for observed state. Subsequent property notifications publish later readbacks.

## Tests

From the repository root:

```bash
xcrun swift test --package-path packages/remote-core
```

The original 15 tests passed in the implementation workspace using Swift 6.0.3 on Linux and on the maintainer's Mac through `make -C apps/macos check` on November 19, 2026. That original Swift Testing suite covered invalid values, absent output, independent capabilities, stale identity, changes at the write boundary, hardware failures, quantized readback, mute preservation, cancellation, external notifications, observer replacement, read failures, and service restarts. Tests use a synchronized fake hardware port and do not access physical audio devices.

For the complete Mac check, including strict Swift lint and the application build:

```bash
make -C apps/macos check
```

See [macOS Audio Control](../../docs/macos-audio-control.md) for native behavior, current validation, and device limitations.

The remote-audio update adds fan-out, subscriber cancellation, and global-stop coverage. All 17 current core tests pass on Swift 6.0.3/Linux; the maintainer subsequently passed the 17 core tests through the expanded 45-test Mac check. See [Authenticated Remote Audio](../../docs/remote-audio-control.md).

## Mac-Owned Sleep Timer

The timer increment adds custom 1–720-minute scheduling on the Mac, a separate selected-document identity, stale-command protection and independent timer status. It pauses the current ready video in that document and continues after the phone session closes. The schedule is in memory only; the Mac must remain awake. Creator revocation, selection loss and connection shutdown cancel active timers. There is no power action or automatic replay after an uncertain result.

Portable checks pass 25 core, 36 protocol, 34 mobile and 16 extension tests. These do not establish Apple SDK compilation or physical-device behavior. Updated native builds, helper installation, Chrome/iPhone acceptance and timer CI remain pending. Read the [sleep timer guide](../../docs/sleep-timer.md) for exact source ownership, security rules, coordinated upgrade steps and the pending acceptance matrix.
