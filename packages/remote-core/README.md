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

The observation stream supports one active subscriber. A new subscription replaces the previous one. Generation identifiers prevent old termination callbacks from cancelling a newer observer. Closing the stream removes the observation; the adapter owns the native registration tokens.

A successful setter can precede the actual HAL state change. The result's snapshot is a read of hardware state at that moment. The service never substitutes the requested value for observed state. Subsequent property notifications publish later readbacks.

## Tests

From the repository root:

```bash
xcrun swift test --package-path packages/remote-core
```

All 15 tests passed in the implementation workspace using Swift 6.0.3 on Linux and on the maintainer's Mac through `make -C apps/macos check` on November 19, 2026. The Swift Testing suite contains 15 tests for invalid values, absent output, independent capabilities, stale identity, changes at the write boundary, hardware failures, quantized readback, mute preservation, cancellation, external notifications, observer replacement, read failures, and service restarts. Tests use a synchronized fake hardware port and do not access physical audio devices.

For the complete Mac check, including strict Swift lint and the application build:

```bash
make -C apps/macos check
```

See [macOS Audio Control](../../docs/macos-audio-control.md) for native behavior, current validation, and device limitations.
