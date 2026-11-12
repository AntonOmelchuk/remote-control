# ADR 0001: ESLint Plugin Compatibility

Status: Accepted as a temporary compatibility measure.

## Context

The project uses ESLint 10.14.0.

The Expo preset includes eslint-plugin-react 7.37.5 and
eslint-plugin-import 2.32.0. Both declare support only through ESLint 9.

## Decision

Use the official @eslint/compat adapter through fixupConfigRules.

Keep peer dependency warnings visible. Do not override the plugins'
declared compatibility ranges.

## Validation and Limitations

Formatting, linting, and TypeScript checks pass on the current source.

This confirms the current configuration works for the project.
It does not establish compatibility for every plugin rule.

## Follow-up

Revisit this decision when the Expo preset includes plugin versions
that officially support ESLint 10.

Remove the adapter after verifying the updated dependency chain.
