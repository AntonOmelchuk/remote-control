# Remote Control

An iPhone remote for controlling a MacBook over a local network.

The product provides convenient access to audio, video playback, and selected system actions from a phone. The engineering goals are maintainable code, a secure command protocol, and predictable behavior when connectivity is interrupted.

**Status: mobile shell launched on an iPhone through Expo Go.** The iOS client includes a disconnected home screen, a connection guide, and an interactive remote preview. Home and preview execution, the preview layout, and timer preset selection have been manually checked on an iPhone. Preview actions update local UI state only; no Mac is connected or controlled. Formatting, ESLint, TypeScript checks, Git hooks, GitHub Actions, and the protection ruleset for `main` are configured. Two upstream ESLint peer-dependency warnings remain documented in an ADR. A custom native build, signing, live Mac control, pairing, and the browser extension remain pending. The architecture below describes the planned connected product.

## Contents

- [Features and Status](#features-and-status)
- [Design and Interaction](#design-and-interaction)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Development Environment](#development-environment)
- [Getting Started](#getting-started)
- [Code Quality](#code-quality)
- [Security Model](#security-model)
- [State and Connection Recovery](#state-and-connection-recovery)
- [Platform Limitations](#platform-limitations)
- [Documentation](#documentation)
- [Implementation Roadmap](#implementation-roadmap)
- [Demo and Screenshots](#demo-and-screenshots)
- [References](#references)

## Features and Status

| Feature                | Scope                                                                      | Status                                               |
| ---------------------- | -------------------------------------------------------------------------- | ---------------------------------------------------- |
| Mobile client          | React Native, TypeScript, Expo Router                                      | Launched on an iPhone through Expo Go                |
| Interactive preview    | Volume, mute, playback state, seeking, and timer preset selection          | Implemented with local sample state only             |
| Pairing                | Add an iPhone using a QR code and confirmation on the Mac                  | Planned for MVP                                      |
| Audio control          | Volume, mute, and current state                                            | Planned for MVP                                      |
| YouTube                | Play/pause, seeking, and tab selection                                     | Planned for MVP                                      |
| Timer                  | Pause the selected video after a custom duration                           | Planned for MVP; preview currently uses presets      |
| Localization           | System language, English, and Ukrainian                                    | Planned for the next preferences milestone           |
| Appearance             | System, light, and dark themes                                             | Planned for the next preferences milestone           |
| Video websites         | Playback controls and next episode                                         | After MVP; a separate site adapter is required       |
| Mac sleep and shutdown | Standard system actions                                                    | After API and permission validation                  |
| Brightness             | Hardware display brightness                                                | Experimental; requires testing on the target MacBook |
| Touchpad               | Pointer movement, clicking, and scrolling                                  | Later milestone                                      |
| Quality tooling        | ESLint, Prettier, Husky, and lint-staged                                   | Configured; pre-commit and pre-push verified         |
| CI                     | Automated formatting, lint, and type checks through GitHub Actions         | Verified on pushes and pull requests                 |
| Branch protection      | Pull requests, required CI, deletion protection, and force-push protection | Active for `main`                                    |

The first target configuration is a physical iPhone, an Apple Silicon MacBook, and Chrome. Support for additional devices and browsers will follow validation of the primary workflow.

The mobile configuration explicitly targets iPhone and uses a dark interface. Expo demo routes, starter UI components, CSS, and unused images have been removed. Existing app-icon and splash assets remain placeholders until the branding milestone. The legacy reset script remains outside the new UI and will be reviewed separately. Browser packages remain in the dependency manifest for a separate lockfile-aware cleanup; there is no mobile web target or web UI. The Chrome extension is a separate application and remains part of the product architecture.

## Design and Interaction

Visual quality is a product requirement.

The first mobile shell uses dark graphite surfaces, a soft lime accent, system typography, SF Symbols, rounded controls, and generous spacing. The Mac illustration is built from native views rather than a downloaded image. The interface scrolls on smaller screens and keeps text scaling enabled. The preview layout has been reviewed on an iPhone. Further device checks will cover larger text sizes, contrast, VoiceOver behavior, and one-handed use.

The current shell contains the home, connection guide, and interactive preview screens. Planned connected-product screens include:

- Mac discovery and pairing.
- A remote with current media, volume, and timer controls.
- A touchpad at the corresponding implementation milestone.
- Settings, device access, and diagnostics.

Required UI states include discovery, connection, denied permissions, a missing media target, connection loss, and synchronization after reconnecting. Action feedback must reflect the result on the Mac.

Animations and haptics should support user actions. Contrast, text scaling, accessible control labels, and adequate touch targets will be checked during UI development.

## Architecture

The product has three planned application components:

1. **Mobile client:** the user interface, connection management, and presentation of confirmed state.
2. **macOS Agent:** a local command server, system API integration, timer execution, and permission enforcement.
3. **Chrome Extension:** media-player selection within a tab and execution of media commands.

```mermaid
flowchart TD
    Phone["iPhone: React Native"] <-->|"WSS + authentication"| Agent["macOS Agent: Swift"]
    Agent --> OS["macOS System Adapters"]
    Agent <--> Bridge["Native Messaging Bridge"]
    Bridge <--> Extension["Chrome Extension"]
    Extension <--> Player["Media Player in Browser Tab"]
```

The first version does not require a separate cloud backend. The macOS Agent provides the server role on the computer being controlled. Commands should travel over the local network without depending on an internet service. Video websites may still require internet access.

The Agent runs in the current macOS user session. Docker is not part of the baseline architecture: a Linux container does not provide the macOS environment required by SwiftUI, Accessibility, and the relevant system APIs.

### Agent Layers

| Layer          | Responsibility                         | Examples                                                |
| -------------- | -------------------------------------- | ------------------------------------------------------- |
| Domain         | Command and state rules                | Valid values, permissions, and retry policies           |
| Application    | Use-case execution                     | Set volume or create a timer                            |
| Infrastructure | Integration with external systems      | CoreAudio, Keychain, networking, and the browser bridge |
| Presentation   | Menu, settings, and state explanations | SwiftUI                                                 |

These names describe the intended organization. Concrete files and interfaces will be introduced alongside their implementation.

## Repository Structure

| Path                                       | Responsibility                                             | Status                          |
| ------------------------------------------ | ---------------------------------------------------------- | ------------------------------- |
| `apps/mobile/`                             | React Native mobile application                            | Created                         |
| `apps/mobile/src/app/`                     | Root navigator and thin route entry points                 | Implemented                     |
| `apps/mobile/src/components/`              | Shared UI primitives                                       | Implemented                     |
| `apps/mobile/src/design-system/`           | Colors, spacing, radii, and layout tokens                  | Implemented                     |
| `apps/mobile/src/features/connection/`     | Disconnected home, Mac illustration, and connection guide  | Implemented; networking planned |
| `apps/mobile/src/features/remote-preview/` | Preview screen, cards, timer picker, and isolated UI state | Implemented; local preview only |
| `apps/mobile/modules/remote-network/`      | Swift Expo Module for networking                           | Planned                         |
| `apps/macos/`                              | Agent, SwiftUI interface, and system adapters              | Planned                         |
| `apps/browser-extension/`                  | Chrome extension and media adapters                        | Planned                         |
| `packages/protocol/`                       | Command schemas, TypeScript models, and fixtures           | Planned                         |
| `packages/remote-core/`                    | Shared Swift package                                       | Planned                         |
| `docs/`                                    | Technical explanations and guides                          | Added incrementally             |
| `package.json`                             | Root commands and tooling configuration                    | Configured                      |
| `pnpm-workspace.yaml`                      | pnpm workspace boundaries                                  | Configured                      |
| `pnpm-lock.yaml`                           | Resolved dependency tree                                   | Created                         |
| `.nvmrc`                                   | Selected Node.js version                                   | Configured                      |
| `.husky/`                                  | Pre-commit and pre-push commands                           | Both hooks verified             |
| `apps/mobile/eslint.config.cjs`            | Expo lint rules and compatibility adapter                  | Configured                      |
| `.prettierrc.json`                         | Shared formatting policy                                   | Configured                      |
| `.github/workflows/ci.yml`                 | GitHub Actions formatting, lint, and type checks           | Implemented and verified        |

The pnpm workspace manages JavaScript and TypeScript packages with their own `package.json` files. Swift projects can live in the same Git repository, while Swift Package Manager and Xcode manage their dependencies and builds.

YAML is a structured data format. pnpm reads `pnpm-workspace.yaml` to determine which directories belong to the workspace. Other YAML files may configure CI or Docker Compose; their purpose depends on the consuming tool and schema.

## Development Environment

The initial development environment is:

| Tool    | Version           |
| ------- | ----------------- |
| Node.js | 24.22.3           |
| pnpm    | 11.28.11          |
| Xcode   | 27.2, build 27B52 |
| Swift   | 6.4.2, arm64      |
| Git     | 2.41.0            |

The mobile starter was requested using `--template default@sdk-58`. Refer to `apps/mobile/package.json` and the lockfile for the actual application dependencies.

Contributors should use the selected Node.js and pnpm versions and install dependencies from the lockfile. Apple application targets require macOS and a compatible Xcode installation.

## Getting Started

Run the following commands from the repository root to select Node.js:

```bash
nvm install
nvm use
```

These commands apply when Node.js is managed through nvm. The root `package.json` specifies the pnpm version in its `packageManager` field. If pnpm is not installed yet, install the pinned version:

```bash
npm install --global pnpm@11.28.11
```

Install dependencies:

```bash
pnpm install --frozen-lockfile
```

For the first Expo startup:

```bash
pnpm --dir apps/mobile exec expo start --offline
```

Expo generates environment types during startup. Once Metro is ready, stop it with Ctrl+C and run the TypeScript check:

```bash
pnpm typecheck
```

The `--offline` flag disables external network checks in the Expo CLI. It does not produce a standalone release build.

For subsequent Metro development sessions:

```bash
pnpm dev:mobile
```

The shell can be opened on an iPhone through Expo Go. Installation of a custom development build and signing remain pending. Commands for running the macOS Agent and browser extension will be added when those components exist.

### Initial Setup Notes

The initial TypeScript check reported missing CSS declarations and an incompatible `ref` type in starter web components. A subsequent local check completed without errors.

The latest combined local check passes: formatting, ESLint, and TypeScript. The home and preview screens have been opened on a physical iPhone through Expo Go, and timer preset selection has been manually verified. A custom native build has not yet been compiled or installed.

After installing dependencies in a clean checkout, generate the required Expo types before running `pnpm check`:

```bash
pnpm --dir apps/mobile exec expo customize tsconfig.json
```

GitHub Actions performs this step automatically before running the quality checks.

## Code Quality

Local quality checks and GitHub Actions are configured and verified. Automated tests and native build checks will be added alongside their implementation.

| Mechanism                    | Responsibility                                                  | Current Status                                           |
| ---------------------------- | --------------------------------------------------------------- | -------------------------------------------------------- |
| TypeScript strict mode       | Application type consistency                                    | Passing locally and in CI                                |
| ESLint flat config           | JavaScript/TypeScript, React, and hooks rules                   | Passing locally and in CI with the compatibility adapter |
| Prettier                     | Consistent TS/JS/JSON/YAML/Markdown formatting                  | Passing locally and in CI                                |
| Husky pre-commit             | Run lint-staged during a commit                                 | Verified during the initial commit                       |
| lint-staged                  | Lint and format staged files using their nearest configuration  | Verified during the initial commit                       |
| Husky pre-push               | Run the full local check before a push                          | Verified during pushes and with a restricted PATH        |
| GitHub Actions               | Run quality checks on pushes and pull requests targeting `main` | Implemented and verified                                 |
| Unit and contract tests      | Business rules and command contracts                            | Planned                                                  |
| Swift formatting and linting | Swift code consistency                                          | Planned when Swift targets exist                         |
| Native build checks          | Compilation of actual Apple targets                             | Planned                                                  |
| Required status checks       | Successful CI checks before merging                             | Active for `main`; `Quality checks` is required          |

### Local Commands

Run these commands from the repository root:

| Command             | Behavior                                          |
| ------------------- | ------------------------------------------------- |
| `pnpm lint`         | Check mobile code; fail on warnings or errors     |
| `pnpm lint:fix`     | Apply available ESLint fixes                      |
| `pnpm typecheck`    | Check mobile TypeScript without emitting files    |
| `pnpm format`       | Apply formatting to supported repository files    |
| `pnpm format:check` | Check formatting without rewriting files          |
| `pnpm check`        | Run format:check, lint, and typecheck in sequence |

The lint and typecheck commands currently cover the mobile package. Extend their scope when shared TypeScript packages and the browser extension are added.

ESLint and Prettier have separate responsibilities. The Prettier compatibility preset disables conflicting lint formatting rules. The mobile lint configuration rejects explicit `any` and enforces type-only imports. Additional type-aware rules can be introduced with the relevant tsconfig and performance considerations.

### ESLint Compatibility

The current environment uses ESLint 10.14.0 with `@eslint/compat` 2.1.1.

The Expo preset includes `eslint-plugin-react` 7.37.5 and `eslint-plugin-import` 2.32.0. Their declared peer ranges stop at ESLint 9. The configuration wraps the Expo preset with `fixupConfigRules` to adapt the plugin APIs.

The current source passes linting, but this does not establish compatibility for every plugin rule. The two peer-dependency warnings remain visible. No peer-range suppression or override is configured.

See [ADR 0001: ESLint Plugin Compatibility](docs/adr/0001-eslint-compatibility.md) for the temporary decision, validation limits, and removal conditions.

### Git Hooks

The root owns Husky and lint-staged. The root lint-staged configuration formats supported staged files. The mobile configuration runs ESLint and Prettier for mobile source files and formats its supported configuration and documentation files.

lint-staged selects the configuration nearest to each file; it does not merge the root configuration into the mobile one. Files rewritten by the tasks are staged automatically.

The pre-commit hook completed successfully during the initial commit. During a first commit, lint-staged cannot create a backup stash against an existing commit; subsequent commits have a previous commit available.

The pre-push hook runs `pnpm check`. It has completed successfully during actual pushes and when invoked with a restricted `PATH` to verify the GUI environment setup. The local Husky startup file loads nvm and selects the Node.js version from `.nvmrc`; this machine-specific setup is not committed.

Local hooks provide early feedback. GitHub Actions independently runs the checks, and the active ruleset requires a successful `Quality checks` result before a pull request can merge into `main`.

### Continuous Integration

The workflow is defined in [`.github/workflows/ci.yml`](.github/workflows/ci.yml). It runs on pushes, pull requests targeting `main`, and manual dispatches when the workflow is available on the default branch.

The `Quality checks` job runs on Ubuntu 24.04 and performs the following steps:

1. Check out the repository without persisting Git credentials.
2. Install the pnpm version declared in the root `package.json` and the Node.js version from `.nvmrc`.
3. Install dependencies with `pnpm install --frozen-lockfile`.
4. Generate Expo types with `pnpm --dir apps/mobile exec expo customize tsconfig.json`.
5. Run `pnpm check`: formatting, ESLint, and TypeScript checks.

The workflow has read-only repository contents permissions, disables Husky on the runner, caches the pnpm store, and limits job execution to 15 minutes. Newer runs cancel older runs in the same concurrency group. Third-party actions are pinned to full commit hashes.

This job validates the current JavaScript and TypeScript setup. Automated tests and native Apple builds are planned separately.

### Main Branch Protection

The active `Protect main` ruleset targets the default branch, currently `main`, and requires:

- A pull request before merging.
- A successful `Quality checks` status check.
- Protection against branch deletion.
- Protection against force pushes.

Required approvals are set to zero for the current solo-maintainer workflow. These rules are configured in GitHub repository settings; the workflow YAML defines the CI job, while the ruleset makes its successful result a merge requirement.

### Testing Plan

Tests should cover behavior where failures matter: authentication, access revocation, timers, reconnection, stale commands, and site adapters. Coverage targets should reflect meaningful scenarios; a single percentage does not establish product correctness.

### Development Workflow

1. Give each change a concrete purpose and clear scope.
2. Run local checks before committing.
3. Update documentation when behavior or setup changes.
4. Review the staged changes; pre-commit may apply formatting or lint fixes.
5. Describe the result and validation in the pull request.
6. Wait for `Quality checks` to pass, then use Squash and merge to integrate the pull request into `main`.
7. Record physical-device checks separately from automated checks.

## Security Model

Planned properties include:

- QR pairing with a short-lived, single-use secret and confirmation on the Mac.
- TLS with Mac identity verification before secrets are transmitted.
- A separate token for each trusted phone.
- Keychain storage for secrets, access revocation, and active-session termination.
- An explicit command allowlist with argument and permission validation.
- Separate media, audio, input, and power permissions as needed.
- Message-size and command-rate limits.
- Narrow browser-extension permissions.
- Separation between media integration and system input/power commands.
- No arbitrary shell commands or scripts in the network protocol.
- Logs that exclude tokens, pairing secrets, and entered text.

Bonjour provides discovery, not proof of trust. Sharing the same Wi-Fi network does not automatically grant access.

The iPhone and Mac must have a reachable network path. Guest-network isolation and firewalls can block communication.

These mechanisms must be implemented and validated before remote control is enabled.

## State and Connection Recovery

The Mac is the source of system state, while the extension supplies the state of the selected media player. The phone displays a received snapshot and subsequent updates.

After a connection is interrupted:

1. The client displays the connection loss.
2. Stale input events are discarded.
3. Bounded reconnection attempts are made.
4. The session authenticates again.
5. A current state snapshot is loaded.

Next-episode actions, clicks, and shutdown commands are not retried automatically. Commands require request identifiers, timeouts, and explicit idempotency rules.

The timer runs on the Mac and does not depend on the iPhone screen remaining open. Agent restart and Mac wake policies will be documented alongside the timer implementation.

## Platform Limitations

- Volume control depends on the capabilities of the current audio output.
- Hardware brightness control requires testing on the specific display.
- Touchpad input requires Accessibility permission and physical-device latency testing.
- Next-episode behavior depends on the structure of the video website.
- Cross-origin players require the relevant browser host permissions.
- Browser policies may restrict play and fullscreen requests.
- iOS may suspend the application in the background; returning to the foreground requires synchronization.
- Unsaved-file dialogs may delay or cancel a normal Mac shutdown.
- A native development build requires initial signing configuration.
- TestFlight builds have a limited availability period; distribution will be configured separately.

## Documentation

Documentation is updated in the same change that modifies functionality, architecture, or setup.

README is the entry point: purpose, current status, getting started, the main architecture diagram, repository structure, checks, and links to detailed documentation.

Existing documentation:

- [Development Setup](docs/development-setup.md): the initial iOS and tooling setup guide. Read ADR 0001 for the subsequent ESLint compatibility addition.
- [ADR 0001](docs/adr/0001-eslint-compatibility.md): the temporary ESLint plugin compatibility decision.
- [Mobile Shell](docs/mobile-shell.md): screen responsibilities, preview behavior, design tokens, validation, and remaining work.

Planned documents:

| Document                           | Contents                                                 |
| ---------------------------------- | -------------------------------------------------------- |
| `docs/architecture.md`             | Components, layers, data flows, and ownership boundaries |
| `docs/protocol.md`                 | Commands, responses, errors, versions, and compatibility |
| `docs/security.md`                 | Threat model, pairing, secret storage, and permissions   |
| `docs/development.md`              | Environment, startup, debugging, and troubleshooting     |
| `docs/testing.md`                  | Test strategy and physical-device matrix                 |
| `docs/adr/`                        | Decisions, alternatives, rationale, and consequences     |
| `docs/Remote_Control_Explained.md` | Learning notes and interview questions                   |

This table is a documentation plan; it does not imply that all listed files already exist.

Each module should document its responsibility and relationships. Complex public functions and contracts should also be documented near the code: arguments, results, errors, and important constraints. README should not manually duplicate the implementation of every internal function.

Planned diagrams cover components, pairing, the command path, connection recovery, and timer lifecycle. Each diagram is added once the corresponding behavior is defined.

### Project Language

English is the language of documentation, code comments, docstrings, developer-facing errors and logs, test descriptions, commit messages, and pull request descriptions. Identifiers and file names use clear English names. User-facing copy, errors, and accessibility labels will support English and Ukrainian through translation resources; English is the fallback language. The preferences milestone will add language selection and system-language detection.

Comments should explain intent, constraints, or non-obvious decisions rather than restating the code.

## Implementation Roadmap

1. Completed: baseline local quality tooling, verified Git hooks, GitHub Actions, and the active protection ruleset for `main`.
2. Implemented: the mobile shell and local remote preview; unused starter UI and images removed. Review the legacy reset script and remaining browser dependencies separately.
3. Add persistent preferences for system/English/Ukrainian language selection and system/light/dark appearance.
4. Configure a custom development build and install it on a physical iPhone.
5. Create the macOS Agent and validate system APIs.
6. Implement pairing, a secure command, and confirmed volume state.
7. Add the Chrome extension and YouTube integration.
8. Add the Mac-hosted timer with arbitrary minute-based duration selection, reconnection, and device-access revocation.
9. Extend site integrations, power actions, and validated brightness control.
10. Implement and measure the touchpad.
11. Prepare a stable demo, installation guide, and distribution workflow.

## Demo and Screenshots

Demo footage and screenshots will be added after the screens and first working scenario are implemented. They should show the actual interface and behavior of the corresponding version.

The planned demonstration covers connecting to a Mac, changing volume, controlling a selected tab, using the timer, and recovering from a connection loss.

## References

- [Expo: monorepos](https://docs.expo.dev/guides/monorepos/)
- [Expo: TypeScript](https://docs.expo.dev/guides/typescript/)
- [Expo: generated types](https://docs.expo.dev/router/reference/typed-routes/)
- [Expo: ESLint and Prettier](https://docs.expo.dev/guides/using-eslint/)
- [Expo: platform-specific modules](https://docs.expo.dev/router/advanced/platform-specific-modules/)
- [pnpm: workspaces](https://pnpm.io/workspaces)
- [Husky: getting started](https://typicode.github.io/husky/get-started.html)
- [lint-staged: documentation](https://github.com/lint-staged/lint-staged)
- [GitHub: required status checks](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches)
- [Apple: local network privacy](https://developer.apple.com/documentation/technotes/tn3179-understanding-local-network-privacy)
- [Chrome: Native Messaging](https://developer.chrome.com/docs/extensions/develop/concepts/native-messaging)
