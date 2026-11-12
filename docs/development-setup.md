# Development Setup: iOS and Code Quality

This guide applies to the existing Remote Control pnpm workspace with `apps/mobile` on Expo SDK 58.

**Status:** configuration files are prepared. Dependency installation, actual ESLint execution, hooks, and native builds must be verified in the development repository. Source syntax checks on this configuration pack do not replace those checks.

All commands below run from the repository root.

## 1. Install Dependencies

Run these commands before copying the configuration files:

```bash
pnpm add --workspace-root --save-dev --save-exact prettier husky lint-staged
pnpm --dir apps/mobile exec expo install eslint eslint-config-expo --dev
pnpm --dir apps/mobile add --save-dev --save-exact eslint-config-prettier
pnpm exec husky init
```

The root owns shared formatting and Git-hook tools. The mobile package owns ESLint and the Expo preset. Expo selects compatible ESLint dependencies. Exact root tool versions are recorded in package.json, and the resolved dependency tree is recorded in pnpm-lock.yaml.

Husky init adds a root prepare script and a default pre-commit hook. The configuration pack replaces that default hook with lint-staged.

Keep one ESLint configuration in the mobile package: `eslint.config.cjs`. If the Expo command generates an additional `eslint.config.js`, replace it with the supplied configuration rather than keeping both.

## 2. Copy the Prepared Configuration

Copy the pack's contents into the repository root, preserving relative paths and including dotfiles. Its files are:

| Path                           | Purpose                                            |
| ------------------------------ | -------------------------------------------------- |
| .prettierrc.json               | Shared formatting policy                           |
| .prettierignore                | Generated/native build output exclusions           |
| .editorconfig                  | Editor-independent text settings                   |
| .lintstagedrc.json             | Formatting for staged root and documentation files |
| .husky/pre-commit              | Check staged files before committing               |
| .husky/pre-push                | Run the full local check before pushing            |
| apps/mobile/.lintstagedrc.json | Mobile linting and formatting                      |
| apps/mobile/eslint.config.cjs  | Expo ESLint preset and project rules               |
| apps/mobile/app.json           | iPhone-focused Expo configuration                  |
| docs/development-setup.md      | This guide                                         |

The supplied app.json:

- targets iOS;
- names the application Remote Control;
- uses the remotecontrol URL scheme;
- retains the supplied version and existing icon/splash asset paths;
- retains typed routes and the React Compiler setting;
- removes Android and web configuration;
- sets supportsTablet to false.

The existing asset files are not included in the pack. They must remain in apps/mobile/assets.

If using the downloaded ZIP, run the following after the commands in step 1:

```bash
unzip -o ~/Downloads/remote-control-config.zip -d .
chmod +x .husky/pre-commit .husky/pre-push
```

The unzip command replaces only the files listed in the archive. Review the supplied files before copying them if any of those paths already contain custom configuration.

## 3. Update Package Scripts

In apps/mobile/package.json, replace only the scripts object. Preserve dependencies and devDependencies added by the installation commands:

```json
{
  "start": "expo start",
  "lint": "eslint . --max-warnings=0",
  "lint:fix": "eslint . --fix --max-warnings=0",
  "typecheck": "tsc --noEmit"
}
```

This removes the starter's web, Android, reset-project, and simulator shortcut commands. A physical-device build command will be added with development-build configuration.

In the root package.json, merge the following scripts while preserving all other fields and installed devDependencies:

```json
{
  "dev:mobile": "pnpm --dir apps/mobile run start",
  "prepare": "husky",
  "lint": "pnpm --dir apps/mobile run lint",
  "lint:fix": "pnpm --dir apps/mobile run lint:fix",
  "typecheck": "pnpm --dir apps/mobile run typecheck",
  "format": "prettier --write .",
  "format:check": "prettier --check .",
  "check": "pnpm format:check && pnpm lint && pnpm typecheck"
}
```

Keep the existing packageManager pin and Node.js engine requirement.

The current lint and typecheck commands cover the mobile package. Extend them when protocol packages and the browser extension are created. The format commands already cover supported files throughout the repository.

## 4. Remove Unused Web Starter Code

Preserve the native implementations:

- apps/mobile/src/components/app-tabs.tsx;
- apps/mobile/src/components/animated-icon.tsx.

Remove their web variants if present:

- apps/mobile/src/components/app-tabs.web.tsx;
- apps/mobile/src/components/animated-icon.web.tsx.

Review apps/mobile/src/constants/theme.ts. Remove this web stylesheet import if present:

```ts
import '@/global.css';
```

Search the mobile source for CSS imports. Once no imports reference them, remove unused starter stylesheets, including:

- apps/mobile/src/components/animated-icon.module.css;
- apps/mobile/src/global.css, if that is the stylesheet resolved by the @ alias.

Search for other .web files and remove only those confirmed to be unused by the retained native implementation. Setting platforms to ios does not automatically exclude files from TypeScript's include patterns.

Remove the direct web dependencies:

```bash
pnpm --dir apps/mobile remove react-dom react-native-web
```

These packages may still appear transitively in the dependency tree. That does not mean the application supports a web target.

Keep expo-web-browser while native components such as ExternalLink use it. It provides native iOS browser and authentication-session integration. A package supporting web is not by itself a reason to remove it.

Keep apps/mobile/tsconfig.json unchanged: strict mode, aliases, and Expo-generated type includes are already configured.

## 5. Run and Review Checks

Run:

```bash
pnpm --dir apps/mobile exec expo customize tsconfig.json
pnpm format
pnpm lint:fix
pnpm check
git diff --check
git status --short
```

Expo documents the customize command as the non-server setup step for generated types, including CI. Verify that it produces the required declarations on a clean checkout with the installed Expo version. If declarations remain missing, capture that output before changing tsconfig.

Formatting and lint:fix modify source files. Review those changes. The separate check command is read-only with respect to application source and fails on formatting issues, lint findings, or TypeScript errors. Dependency-manager policies may perform their own verification.

--max-warnings=0 makes lint warnings fail the command. The Expo preset provides the baseline React and hooks rules; project rules additionally reject explicit any and enforce type-only imports. The Prettier compatibility preset disables conflicting formatting rules.

Native builds and runtime behavior remain separate checks. A successful TypeScript/lint run does not prove that the application launches on an iPhone.

## 6. Verify Git Hooks

Inspect:

```bash
git config --get core.hooksPath
```

For this Husky setup, the expected value is .husky/_.

The pre-commit hook runs lint-staged on files staged in Git. Root and mobile configurations are intentionally separate. lint-staged uses the configuration nearest to each staged file; it does not merge the root configuration into the mobile one.

Stage reviewed changes before testing the hook:

```bash
git add .
pnpm exec lint-staged
git diff --cached --stat
```

If this is the first commit, lint-staged may report that it cannot create a backup stash because there is no initial commit. Review staged changes carefully.

A run with no staged files does not verify the lint or formatting tasks. Confirm that the output lists the intended tasks.

Test the full pre-push command without pushing:

```bash
sh .husky/pre-push
```

With reviewed changes and passing checks, the initial tooling commit can use:

```bash
git commit -m "chore: configure iOS tooling and quality checks"
```

Local hooks can be bypassed. GitHub Actions and required status checks will provide the repository-side checks after local configuration is verified. This pack does not include a CI workflow.

## 7. CI Follow-up

Once local checks pass, add a workflow that:

1. selects the repository's Node.js and pnpm versions;
2. installs dependencies with a frozen lockfile;
3. generates required Expo types;
4. runs pnpm check;
5. uses read-only repository permissions and bounded execution time.

Configure required status checks on the main branch after the workflow has run successfully. Add Swift build and test jobs when actual native targets exist. Maintain GitHub Actions dependency pins with an update workflow.

## Documentation Update

After applying the configuration and verifying it:

- mark ESLint, Prettier, Husky, and lint-staged as configured in README;
- keep CI marked as planned until the workflow exists and runs;
- record the exact installed tool versions in package.json and commit the lockfile;
- link this guide from README;
- record native startup as pending until a physical-device build is confirmed.

All source comments, configuration explanations, UI text, logs, test descriptions, documentation, and commit messages are written in English.

## References

- [Expo ESLint and Prettier](https://docs.expo.dev/guides/using-eslint/)
- [Expo generated types](https://docs.expo.dev/router/reference/typed-routes/)
- [Expo platform configuration](https://docs.expo.dev/versions/latest/config/app/)
- [Expo WebBrowser](https://docs.expo.dev/versions/latest/sdk/webbrowser/)
- [Prettier installation](https://prettier.io/docs/install/)
- [Husky setup](https://typicode.github.io/husky/get-started.html)
- [lint-staged monorepo configuration](https://github.com/lint-staged/lint-staged)
