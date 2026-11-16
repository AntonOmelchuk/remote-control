# Development Setup

This guide describes the current Remote Control workspace. Run commands from the repository root unless a step explicitly says otherwise. For local iOS compilation, signing, and device troubleshooting, see [iOS Development Build](ios-development-build.md).

## Verified Baseline

The existing workflow includes shared formatting, mobile ESLint and TypeScript checks, 13 platform-independent unit tests, Git hooks, GitHub Actions, and a protection ruleset for `main`.

On November 16, 2026, the maintainer compiled, installed, and opened a development build on an iPhone XR running iOS 18.7.12. The current shell, preview, and preferences were reported working in that build. This is a manual device check. The existing CI job does not compile iOS. Run the quality checks again before committing changes.

Live Mac control, discovery, pairing, the macOS Agent, and the browser extension remain planned.

## Toolchain

| Tool      | Selected or verified version | Source of truth                          |
| --------- | ---------------------------- | ---------------------------------------- |
| Node.js   | 24.22.3                      | `.nvmrc` and the root engine requirement |
| pnpm      | 11.28.11                     | Root `package.json` `packageManager`     |
| Expo      | SDK 58                       | Mobile manifest and lockfile             |
| Xcode     | 27.2, build 27B52            | Local Apple toolchain                    |
| Swift     | 6.4.2, arm64                 | Selected Xcode toolchain                 |
| CocoaPods | 1.17.0                       | Verified with `pod --version`            |
| Git       | 2.41.0                       | Local Git installation                   |

The manifests declare dependencies; `pnpm-lock.yaml` records their resolved versions. Use the project's pins rather than upgrading tools in response to an update banner during unrelated work.

## Prepare a Checkout

With nvm installed, select the project Node.js version:

```bash
source "$HOME/.nvm/nvm.sh"
nvm install
nvm use
```

If pnpm is missing under that Node.js installation, install the version declared by the repository:

```bash
npm install --global pnpm@11.28.11
```

Install the existing workspace and generate Expo's local type declarations:

```bash
pnpm install --frozen-lockfile
pnpm --dir apps/mobile exec expo customize tsconfig.json
pnpm check
```

The install runs the root `prepare` script to configure Husky. Do not run `husky init` on an existing checkout: the repository already contains its hooks and configuration.

## Daily Mobile Development

With the development build already installed on the iPhone:

```bash
pnpm --dir apps/mobile exec expo start --dev-client
```

Open Remote Control using the development-server QR code. Keep Metro running and the phone on a network that can reach the Mac. JavaScript and TypeScript UI edits do not require recompiling the native app.

For a first device installation or a native dependency change, follow the [native build guide](ios-development-build.md). Starting Metro alone cannot install a native module into an existing binary.

## Configuration Ownership

| Path                             | Responsibility                                                |
| -------------------------------- | ------------------------------------------------------------- |
| `package.json`                   | Shared commands, tool versions, and package-manager selection |
| `pnpm-workspace.yaml`            | JavaScript/TypeScript workspace boundaries                    |
| `pnpm-lock.yaml`                 | Resolved dependency tree                                      |
| `.nvmrc`                         | Project Node.js version                                       |
| `.editorconfig`                  | Editor-independent text settings                              |
| `.prettierrc.json`               | Shared formatting policy                                      |
| `.prettierignore`                | Formatting exclusions                                         |
| `.lintstagedrc.json`             | Formatting for staged root and documentation files            |
| `.husky/pre-commit`              | Run lint-staged before a commit                               |
| `.husky/pre-push`                | Run `pnpm check` before a push                                |
| `apps/mobile/.lintstagedrc.json` | ESLint and formatting for staged mobile files                 |
| `apps/mobile/eslint.config.cjs`  | Expo lint preset, compatibility adapter, and project rules    |
| `apps/mobile/tsconfig.json`      | Strict TypeScript configuration and aliases                   |
| `apps/mobile/app.json`           | Declarative iOS configuration and config plugins              |
| `apps/mobile/package.json`       | Mobile dependencies and package-level commands                |
| `apps/mobile/src/package.json`   | ESM scope for source modules imported by Node-based tests     |
| `.github/workflows/ci.yml`       | Automated quality checks                                      |

The application targets iPhone. The previous Expo demo routes, web components, CSS, and unused images have been replaced by the current shell. App-icon and splash assets remain placeholders. Remaining browser dependencies and the legacy reset script are a separate cleanup task; their presence does not create a web target.

## Quality Commands

| Command             | Purpose                                                 | Rewrites application files? |
| ------------------- | ------------------------------------------------------- | --------------------------- |
| `pnpm format`       | Format supported repository files                       | Yes                         |
| `pnpm format:check` | Verify formatting                                       | No                          |
| `pnpm lint`         | Run mobile ESLint with zero warnings allowed            | No                          |
| `pnpm lint:fix`     | Apply available mobile lint fixes                       | Yes                         |
| `pnpm typecheck`    | Check mobile TypeScript without emitting files          | No                          |
| `pnpm test:unit`    | Run the Node.js unit tests                              | No                          |
| `pnpm check`        | Run formatting, lint, types, and unit tests in sequence | No                          |

The unit tests cover preference recovery, storage ordering and failure recovery, translation consistency, language resolution, and selected palette contrast relationships. They do not replace native builds, device checks, or a complete accessibility audit.

Before a commit:

```bash
pnpm check
git diff --check
git status --short
```

Review changes produced by formatter and lint fixes before staging them. Extend the lint, type, and test commands when additional packages are implemented.

## ESLint Compatibility

The current mobile configuration adapts the Expo preset using `fixupConfigRules` from `@eslint/compat`. ESLint 10.14.0 currently passes the project checks, but `eslint-plugin-react` 7.37.5 and `eslint-plugin-import` 2.32.0 still declare peer ranges ending at ESLint 9.

The two peer warnings are an accepted temporary compatibility constraint, not a resolved dependency mismatch. See [ADR 0001](adr/0001-eslint-compatibility.md) for the rationale and removal conditions. Do not suppress the warnings merely to make the dependency report appear clean.

## Git Hooks and GUI Applications

Check the hook path:

```bash
git config --get core.hooksPath
```

Expected result: `.husky/_`.

The pre-commit hook runs lint-staged. Its nearest configuration determines which tasks apply to each staged file; root and mobile configurations are not merged. Files rewritten by tasks are staged automatically. The pre-push hook runs the complete `pnpm check` command.

GUI Git applications can inherit a different `PATH` from an interactive terminal. If a hook reports `pnpm: command not found`, configure the local Husky startup file at `${XDG_CONFIG_HOME:-$HOME/.config}/husky/init.sh` to load nvm:

```sh
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"

if [ -s "$NVM_DIR/nvm.sh" ]; then
  . "$NVM_DIR/nvm.sh" --no-use
  if [ -f .nvmrc ]; then
    nvm use --silent
  fi
fi
```

This is user-specific machine configuration and is not committed. Test it through Husky's wrapper, which loads that startup file:

```bash
env PATH="/usr/bin:/bin:/usr/sbin:/sbin" sh .husky/_/pre-push
```

A direct `sh .husky/pre-push` tests the check command without exercising the wrapper's environment initialization.

## CI and Pull Requests

The existing `Quality checks` job installs the pinned toolchain, installs dependencies with a frozen lockfile, generates Expo types, and runs `pnpm check`. It runs on Ubuntu with read-only repository contents permissions, bounded execution time, and action dependencies pinned to commit hashes.

The active `Protect main` ruleset requires a pull request and a successful `Quality checks` result, blocks force pushes, and protects the branch from deletion. Required review approvals are zero for the current solo-maintainer workflow.

Use focused branches, review staged changes, update documentation alongside setup or behavior changes, and squash merge once required checks pass. Record physical-device validation separately: a green Ubuntu job does not demonstrate iOS compilation or installation.

## Project Language

Use English for documentation, code comments, developer-facing messages, tests, commits, and pull requests. User-facing copy and accessibility labels use the bundled English and Ukrainian translation resources.

## References

- [Expo CLI](https://docs.expo.dev/more/expo-cli/)
- [Expo typed routes and generated declarations](https://docs.expo.dev/router/reference/typed-routes/)
- [Expo ESLint and Prettier](https://docs.expo.dev/guides/using-eslint/)
- [Husky startup files](https://typicode.github.io/husky/how-to.html)
- [lint-staged](https://github.com/lint-staged/lint-staged)
- [iOS development build and troubleshooting](ios-development-build.md)
