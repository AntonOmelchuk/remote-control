import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  realpath,
  rename,
  stat,
  writeFile,
} from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';

const source = await realpath(process.argv[2] ?? '');
if (!(await stat(source)).isFile()) throw new Error('Build the native host first');
const config = JSON.parse(
  await readFile(new URL('../../browser-extension/browser.config.json', import.meta.url), 'utf8'),
);
if (!/^[a-p]{32}$/.test(config.extensionID)) throw new Error('Invalid extension identity');
const directory = path.join(
  os.homedir(),
  'Library/Application Support/RemoteControl/NativeMessaging',
);
await mkdir(directory, { recursive: true, mode: 0o700 });
const executable = path.join(directory, 'remote-control-browser-host');
const temporary = path.join(directory, `${randomUUID()}.tmp`);
await copyFile(source, temporary);
await chmod(temporary, 0o700);
await rename(temporary, executable);
const manifestDirectory = path.join(
  os.homedir(),
  'Library/Application Support/Google/Chrome/NativeMessagingHosts',
);
await mkdir(manifestDirectory, { recursive: true });
const manifest = {
  name: config.nativeHost,
  description: 'Remote Control YouTube bridge',
  path: executable,
  type: 'stdio',
  allowed_origins: [`chrome-extension://${config.extensionID}/`],
};
const manifestPath = path.join(manifestDirectory, `${config.nativeHost}.json`);
await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n', { mode: 0o600 });
console.log(`Installed Chrome native host: ${manifestPath}`);
