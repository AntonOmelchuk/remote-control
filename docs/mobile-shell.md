# Mobile Shell

The first mobile milestone establishes the visual language, navigation, and a deliberately isolated interactive preview. It does not connect to, discover, authenticate with, or control a Mac.

## Current Screens

| Route               | Purpose                        | Available behavior                                                                                                  |
| ------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| `/`                 | Disconnected home              | Show the product identity, an unconnected device state, and an entry to the preview                                 |
| `/connection-guide` | Explain the planned connection | Describe the future Mac companion, local networking, and QR confirmation; clearly state that pairing is unavailable |
| `/preview`          | Explore the remote interface   | Change sample volume, mute, toggle playback state, seek, choose a timer preset, and reset local state               |

The sample MacBook and video are fixtures. They do not represent a discovered device, a browser tab, or a live media session. The preview does not play media or advance a playback clock. Timer selection updates a preset label; it does not start a countdown or pause anything.

## File Responsibilities

| Location                                                             | Responsibility                                                                              |
| -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `apps/mobile/src/app/_layout.tsx`                                    | Define the native stack, dark navigation theme, screen titles, and status bar               |
| `apps/mobile/src/app/index.tsx`                                      | Export the home screen as the index route                                                   |
| `apps/mobile/src/app/preview.tsx`                                    | Export the preview screen as a route                                                        |
| `apps/mobile/src/app/connection-guide.tsx`                           | Export the connection guide as a route                                                      |
| `apps/mobile/src/design-system/tokens.ts`                            | Own shared colors, spacing, radii, content width, and minimum touch target                  |
| `apps/mobile/src/components/ui/app-text.tsx`                         | Apply typography variants while retaining React Native text scaling                         |
| `apps/mobile/src/components/ui/icon.tsx`                             | Render decorative iOS SF Symbols with typed symbol names                                    |
| `apps/mobile/src/components/ui/action-button.tsx`                    | Render a labeled primary or secondary action                                                |
| `apps/mobile/src/components/ui/icon-button.tsx`                      | Render an accessible icon action with a minimum 48-point target                             |
| `apps/mobile/src/components/ui/screen.tsx`                           | Provide scrolling, content width, padding, and safe-area handling                           |
| `apps/mobile/src/features/connection/`                               | Own the home screen, connection guide, and native-view Mac illustration                     |
| `apps/mobile/src/features/remote-preview/model/preview-state.ts`     | Define sample data, typed actions, state transitions, bounds, and display formatting        |
| `apps/mobile/src/features/remote-preview/screens/preview-screen.tsx` | Own preview state and connect presentation callbacks to reducer actions                     |
| `apps/mobile/src/features/remote-preview/components/`                | Present media, volume, timer selection, and the timer picker without owning transport logic |

Route files remain thin. Feature code stays outside `src/app`, because Expo Router treats files in that directory as routes.

## State and Boundaries

`useReducer` is sufficient for the current screen-local state. There is no shared session, persistence, server cache, or confirmed Mac state to justify a global store yet.

The reducer receives a discriminated union of actions. It returns new state, clamps volume to 0–100 and playback position to the sample duration, preserves the saved volume while muted, stops the playing state at the end when seeking, and restarts from zero when replaying the finished sample.

Presentation components receive values and callbacks. They do not import a networking client. The timer picker uses separate temporary visibility state because opening a sheet is a presentation concern.

Preview state resets when the screen is remounted or the user selects Reset preview. It is not persisted. It must never be reused as an authoritative source of device state. The connected implementation will need a separate session and confirmed snapshots from the Mac.

## Design and Accessibility

The visual direction uses graphite surfaces, a soft lime accent, system typography, SF Symbols, and rounded controls. The Mac illustration is composed from native views. No remote artwork or font download is required.

- Screens scroll rather than clipping content on smaller devices.
- Text scaling remains enabled; important text is not truncated to a fixed line count.
- Icon-only controls have explicit accessibility labels and disabled states.
- Action targets are at least 48 points.
- Volume and playback progress expose accessible values.
- Timer choices expose checked states, and the modal supports close, backdrop dismissal, and the accessibility escape gesture.
- The screen behind the timer picker is hidden from VoiceOver while the picker is open.
- There are no automatic decorative animations or animated modal transitions in this milestone.

Volume uses explicit increment/decrement controls in this preview. A native slider and gesture behavior can be evaluated with actual Mac state and latency constraints later.

These are implementation choices, not a claim that an accessibility audit has passed. Verify VoiceOver focus order, modal focus behavior, text scaling, contrast, and touch targets on an iPhone.

## Configuration and Cleanup

`app.json` explicitly targets iOS, disables tablet support, selects a dark interface, and uses the `remotecontrol` URL scheme. The root and splash backgrounds match the interface.

The Expo demo routes, components, hooks, CSS, and unused images are removed. The existing app icon, Icon Composer assets, and splash image remain placeholders for the branding milestone. The legacy reset script remains for a separate review.

No dependency or lockfile changes are needed. Existing browser-related packages remain installed pending a separate dependency cleanup that updates the lockfile. They do not enable a mobile web target.

No native projects, signing configuration, camera permissions, local-network permissions, or transport security exceptions are added. Those belong to the corresponding native and connection milestones.

## Validation

Validation uses the supplied dependency manifest and compatible resolved packages in an isolated workspace. The repository lockfile was not included in the source archive, so the contributor must also run the repository checks against the existing pnpm lockfile after applying the change.

| Check                                                            | Result                                     |
| ---------------------------------------------------------------- | ------------------------------------------ |
| Prettier on changed source, app configuration, and documentation | Passed                                     |
| ESLint with zero warnings allowed                                | Passed                                     |
| TypeScript with `--noEmit`                                       | Passed                                     |
| iOS JavaScript export with React Compiler                        | Passed                                     |
| Preview-state boundary and transition smoke check                | Passed                                     |
| Physical-iPhone launch through Expo Go                           | Passed: home and preview screens           |
| Preview visual review on an iPhone                               | Passed for the supplied preview screenshot |
| Timer preset selection and selection retained when reopening     | Passed for 15 minutes                      |
| Custom native Apple compilation, signing, and installation       | Pending                                    |
| VoiceOver, larger text sizes, and broader device coverage        | Pending                                    |

An iOS JavaScript export does not compile or launch an Apple application.

From the repository root, apply formatting and run the existing checks:

```bash
pnpm format
pnpm check
```

Start Metro with the existing command:

```bash
pnpm dev:mobile
```

The shell has been launched on a physical iPhone through Expo Go. A custom development build, signing, and its installation remain pending.

## Manual Device Checklist

- Open the home screen and follow both navigation paths.
- Check a smaller iPhone size and a larger accessibility text size.
- Increase and decrease volume to both boundaries; mute and unmute without losing the saved value.
- Toggle playback state and seek to both ends of the sample; replay from the end.
- Open the timer picker, select each preset, dismiss it without selecting, and use VoiceOver escape.
- Reset the preview and confirm all sample values return to their defaults.
- Confirm the UI never claims an active Mac connection or a running timer.

## Next Milestone

The home and preview screens have been opened on an iPhone through Expo Go. The preview screenshot has been reviewed, and selecting a 15-minute timer preset, closing the picker, and reopening it with the selection retained have been confirmed manually. These observations do not replace the remaining device and accessibility checklist.

Add the preferences milestone, then configure a custom development build. Introduce the macOS companion and define the first authenticated command contract. Live control will replace sample state only after the connection and security boundaries exist.

## Planned Follow-up Requirements

These requirements are accepted for future implementation and are not current functionality.

### Language and Appearance

- Add a Settings screen with System, English, and Ukrainian language choices.
- Use the iPhone language in System mode and English when no supported translation is available.
- Translate visible copy, user-facing errors, native navigation titles, and accessibility labels.
- Keep source identifiers, comments, and documentation in English.
- Add System, Light, and Dark appearance choices with palettes designed for readable contrast.
- Persist explicit language and appearance choices between launches.

### Custom Timer Duration

- Replace the fixed-preset-only picker with a duration slider and precise minute adjustment.
- Support arbitrary minute-based durations, including 45 minutes, 2 hours, and 2 hours 45 minutes.
- Display hours and minutes clearly using the selected language.
- Keep common presets as optional shortcuts rather than the only available choices.
- Provide accessible adjustment actions and explicit controls for fine changes.
- Define the allowed duration range and validation in the command contract when the Mac-hosted timer is implemented.
- Execute the actual countdown and pause action on the Mac, so locking the iPhone does not cancel it.
- Show a running timer only after the Mac confirms it has started.
