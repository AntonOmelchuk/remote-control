import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import { build } from 'esbuild';

const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/background.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
});
const code = bundle.outputFiles[0].text;
const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../../../packages/remote-link/Tests/RemotePairingTests/Fixtures/youtube-v1.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
const extensionID = 'okbfaijmikpjghbdljpjoealcdhbahfi';
function event() {
  const handlers = [];
  return {
    addListener(fn) {
      handlers.push(fn);
    },
    fire(...args) {
      return handlers.map((fn) => fn(...args));
    },
  };
}
function port(sender = undefined) {
  return {
    name: 'remote-control-youtube-v1',
    sender,
    onMessage: event(),
    onDisconnect: event(),
    messages: [],
    disconnected: false,
    postMessage(value) {
      this.messages.push(JSON.parse(JSON.stringify(value)));
    },
    disconnect() {
      this.disconnected = true;
    },
  };
}
function setup() {
  const native = [];
  const chrome = {
    runtime: {
      id: extensionID,
      onMessage: event(),
      onConnect: event(),
      getURL: (name) => `chrome-extension://${extensionID}/${name}`,
      connectNative() {
        const result = port();
        native.push(result);
        return result;
      },
    },
    tabs: {
      async query() {
        return [{ id: 7, url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ', incognito: false }];
      },
      async sendMessage() {},
    },
  };
  const clock = { now: 0 };
  vm.runInNewContext(code, {
    chrome,
    URL,
    performance: { now: () => clock.now },
    setInterval: () => 1,
    clearInterval() {},
    setTimeout: () => 2,
    clearTimeout() {},
  });
  const popup = { id: extensionID, url: chrome.runtime.getURL('popup.html') };
  async function message(type, sender = popup) {
    let response;
    chrome.runtime.onMessage.fire({ type }, sender, (value) => {
      response = value;
    });
    await new Promise((resolve) => setImmediate(resolve));
    return response;
  }
  function page(overrides = {}) {
    const result = port({
      id: extensionID,
      frameId: 0,
      documentId: 'document-1',
      tab: { id: 7, incognito: false },
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      ...overrides,
    });
    chrome.runtime.onConnect.fire(result);
    return result;
  }
  return { chrome, native, message, page, clock };
}
test('only the real popup can select a tab or start a native connection', async () => {
  const app = setup();
  for (const sender of [
    { id: 'another-extension' },
    { id: extensionID, url: 'https://www.youtube.com/', tab: { id: 7 } },
    { id: extensionID, url: `chrome-extension://${extensionID}/other.html` },
  ])
    assert.equal(await app.message('select', sender), undefined);
  assert.equal(app.native.length, 0);
  assert.equal((await app.message('select')).ok, true);
  assert.equal(app.native.length, 1);
});
test('selected top-level document is required and command targets cannot switch silently', async () => {
  const app = setup();
  await app.message('select');
  for (const change of [
    { frameId: 1 },
    { documentId: undefined },
    { id: 'foreign' },
    { url: 'https://evil.test/' },
    { tab: { id: 8 } },
    { tab: { id: 7, incognito: true } },
  ])
    assert.equal(app.page(change).disconnected, true);
  const page = app.page();
  const native = app.native[0];
  page.onMessage.fire(fixture.state);
  assert.equal(native.messages.length, 0);
  native.onMessage.fire({ version: 1, sequence: 0, type: 'browserReady' });
  assert.deepEqual(native.messages[0], fixture.state);
  native.onMessage.fire(fixture.command);
  assert.deepEqual(page.messages[0], fixture.command);
  page.onMessage.fire({
    version: 1,
    sequence: 0,
    type: 'browserResult',
    requestID: fixture.command.requestID,
  });
  assert.equal(native.messages.at(-1).type, 'browserResult');
  const stale = {
    ...fixture.command,
    requestID: '4cab916a-27fd-44d2-a3e6-c707995d8fc9',
    targetID: 'f72896f0-1901-43af-a2a4-fb348990e766',
  };
  native.onMessage.fire(stale);
  assert.equal(native.messages.at(-1).failure, 'targetChanged');
  assert.equal(page.messages.length, 1);
  app.clock.now += 5000;
  native.onMessage.fire({ ...fixture.command, requestID: '259131c1-2af0-47f7-985a-8d69cc259a76' });
  assert.equal(native.messages.at(-1).failure, 'targetChanged');
  assert.equal(page.messages.length, 1);
});
test('unknown native actions disconnect and reconnect never replays an old command', async () => {
  const app = setup();
  await app.message('select');
  const page = app.page();
  const native = app.native[0];
  native.onMessage.fire({ version: 1, sequence: 0, type: 'browserReady' });
  page.onMessage.fire(fixture.state);
  native.onMessage.fire(fixture.command);
  native.onMessage.fire({ version: 1, sequence: 0, type: 'setVolume', volume: 1 });
  assert.equal(native.disconnected, true);
  assert.equal(app.native.length, 1);
  await app.message('connect');
  app.native[1].onMessage.fire({ version: 1, sequence: 0, type: 'browserReady' });
  assert.equal(page.messages.length, 1);
  assert.ok(app.native[1].messages.every((value) => value.type === 'browserState'));
});

test('Swift uppercase UUID commands reach the selected Chrome document and mixed-case replies complete', async () => {
  const app = setup();
  await app.message('select');
  const page = app.page();
  const native = app.native[0];
  native.onMessage.fire({ version: 1, sequence: 0, type: 'browserReady' });
  page.onMessage.fire(fixture.state);
  const command = {
    ...fixture.command,
    requestID: fixture.command.requestID.toUpperCase(),
    targetID: fixture.command.targetID.toUpperCase(),
  };
  native.onMessage.fire(command);
  assert.deepEqual(page.messages[0], fixture.command);
  page.onMessage.fire({
    version: 1,
    sequence: 0,
    type: 'browserResult',
    requestID: command.requestID,
  });
  assert.equal(native.messages.at(-1).requestID, fixture.command.requestID);
  assert.equal(native.messages.at(-1).failure, undefined);
  native.onMessage.fire({ ...command, requestID: 'EC95C7C3-5E07-4C89-ACB1-D084B577C2DD' });
  assert.equal(page.messages.length, 2);
  assert.equal(page.messages[1].requestID, 'ec95c7c3-5e07-4c89-acb1-d084b577c2dd');
});
