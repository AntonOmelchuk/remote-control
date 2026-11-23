# Remote Control for Chrome

A Manifest V3 development extension for one explicitly selected YouTube watch tab. The popup, background worker and isolated content script are TypeScript. Standard HTML video APIs provide play/pause and actual playback state. English/Ukrainian popup copy follows Chrome's UI language; light/dark styles follow the system.

## Build and Check

From the repository root:

```bash
pnpm install --frozen-lockfile
pnpm check
```

`pnpm build:extension` writes the unpacked extension to `apps/browser-extension/dist`. Enable Developer mode in `chrome://extensions`, Load unpacked from that directory, then reload the YouTube page. Chrome runs compiled files in `dist`, which is ignored by Git.

The expected development ID is `okbfaijmikpjghbdljpjoealcdhbahfi`. `browser.config.json` and the manifest contain a public key, not a private signing key. The build verifies its derived ID and the native helper's exact origin. Do not change only one of these values.

Chrome also needs the local native host:

```bash
make -C apps/macos install-browser-host
```

Start connections and Enable YouTube in the signed Agent, then use the extension popup on a YouTube watch page to select that tab. Reconnect is explicit after bridge failures. The helper install, iOS rebuild, full source map, security design and step-by-step verification are documented in [YouTube control](../../docs/youtube-control.md).

## Source Map

| Path                     | Responsibility                                                                        |
| ------------------------ | ------------------------------------------------------------------------------------- |
| `src/background.ts`      | Selected document ownership, popup authorization, native channel, command correlation |
| `src/content.ts`         | Selected content port and page-state publication                                      |
| `src/youtube-adapter.ts` | Video identity, sanitized metadata and HTML play/pause                                |
| `src/protocol.ts`        | Pure packet and origin/watch-page validation                                          |
| `src/popup.ts`           | Localized setup/selection feedback with text-only metadata                            |
| `public/`                | Manifest, popup, styles and Chrome EN/UK message catalogs                             |
| `scripts/build.mjs`      | esbuild bundle, identity consistency checks and native-facade import guard            |
| `tests/`                 | Protocol, video adapter and fake-Chrome service-worker behavior tests                 |

## Boundaries

Only the YouTube host and Native Messaging are requested. Incognito, Shorts, embeds, seeking and other sites are unsupported. Unselected content scripts do not poll players or publish titles. A selected script sends current state every second; titles and video IDs are not persisted. The extension receives no phone credentials, TLS private key, cookies, history, shell access or system audio authority.

Automated checks use fake Chrome ports and video elements. On November 23, the maintainer verified native-host installation, Chrome connection/selection, phone Pause/Play, browser-to-phone synchronization, changing videos in one selected watch tab, and media clearing with audio still usable after closing that tab. The UUID-casing fix passed 14 extension tests. Earlier stale-tab and popup-opening reports were not independently root-caused; long-running/background recovery and broader failure coverage remain pending. See [the validation matrix](../../docs/youtube-control.md#validation-checklist).
