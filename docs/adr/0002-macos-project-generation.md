# ADR 0002: Generate the macOS Xcode Project from a Specification

- **Status:** Accepted; local native verification passed on 2026-11-18. CI execution pending.
- **Date:** 2026-11-16

## Context

Remote Control needs a macOS application bundle with a SwiftUI lifecycle, a menu-bar scene, localized resources, bundle metadata, and explicit build settings. The repository already uses generation for its iOS project through Expo. The native macOS target is independent of the Expo application.

## Decision

Keep `apps/macos/project.yml`, application sources, resources, and build commands in Git. Use XcodeGen 2.46.0 or later to generate `RemoteControlAgent.xcodeproj`. Ignore the generated project and build artifacts. Local development and the new macOS CI job invoke the same Makefile targets.

Use Swift 6 language mode with main-actor UI isolation, strict concurrency checking, and warnings treated as errors. Use the formatter bundled with the selected Xcode toolchain. The first target uses ad hoc signing for local development. Distribution signing and notarization are separate decisions.

## Alternatives

| Alternative                            | Assessment                                                                                                                      |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Commit an Xcode-generated project      | Standard and valid, but project-file changes add another source of review and merge work                                        |
| Generate with XcodeGen                 | Keeps this single-target build configuration readable and rebuildable using one small tool                                      |
| Use a more extensive project framework | Additional abstraction is not justified by the current single-target shell                                                      |
| Use only a Swift package executable    | Useful for reusable libraries and tools, but does not by itself define the complete Mac application-bundle workflow needed here |

## Consequences

Durable build changes must be made in `project.yml`; manual edits only to the generated project can be overwritten. Contributors need XcodeGen in addition to Xcode. The project specification records a minimum generator version, while the tested local version is 2.46.0. Homebrew installation in CI is not an exact generator-version pin, and Xcode's bundled formatter can change with the selected toolchain.

This is an explicit source-of-truth decision, not a claim of byte-identical output across arbitrary tool versions. Review generation changes when upgrading tools. If the project grows enough to require more target composition, plugins, or dependency constraints, reassess the generator using the actual requirements.

## Verification

On November 18, 2026, the maintainer ran `make -C apps/macos check` successfully and reported `BUILD SUCCEEDED`. The command checks Swift lint, generates the Xcode project, and compiles the application. Manual checks confirmed menu-bar launch, Quit and relaunch, both appearance modes, and English/Ukrainian language selection. The first macOS CI execution remains pending; local validation does not establish hosted-runner success or wider deployment-target coverage.

## References

- [XcodeGen](https://github.com/yonaskolb/XcodeGen)
- [Apple Swift packages](https://developer.apple.com/documentation/xcode/swift-packages)
- [Apple MenuBarExtra](https://developer.apple.com/documentation/swiftui/menubarextra)
