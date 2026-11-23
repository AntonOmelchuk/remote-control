import { build } from 'esbuild';
import { cp, mkdir, readFile, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const config = JSON.parse(await readFile(path.join(root, 'browser.config.json'), 'utf8'));
const id = [
  ...createHash('sha256').update(Buffer.from(config.publicKey, 'base64')).digest().subarray(0, 16),
]
  .map((byte) => String.fromCharCode(97 + (byte >> 4)) + String.fromCharCode(97 + (byte & 15)))
  .join('');
if (id !== config.extensionID) throw new Error('Extension identity mismatch');
const swift = await readFile(
  path.join(root, '../../packages/remote-link/Sources/RemotePairing/BrowserBridgeIdentity.swift'),
  'utf8',
);
if (!swift.includes(`"chrome-extension://${id}/"`)) throw new Error('Native origin mismatch');
const manifest = JSON.parse(await readFile(path.join(root, 'public/manifest.json'), 'utf8'));
if (manifest.key !== config.publicKey) throw new Error('Manifest public key mismatch');
const dist = path.join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(path.join(root, 'public'), dist, { recursive: true });
const result = await build({
  absWorkingDir: root,
  entryPoints: ['src/background.ts', 'src/content.ts', 'src/popup.ts'],
  outdir: dist,
  bundle: true,
  format: 'iife',
  platform: 'browser',
  target: 'chrome120',
  sourcemap: true,
  metafile: true,
  logLevel: 'silent',
});
if (Object.keys(result.metafile.inputs).some((name) => name.endsWith('remote-link/src/index.ts'))) {
  throw new Error('Browser bundles must not import the native Expo facade');
}
console.log(`Built unpacked extension ${id} at ${dist}`);
