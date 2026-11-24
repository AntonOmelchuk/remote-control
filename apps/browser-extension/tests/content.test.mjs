import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import test from 'node:test';
import { build } from 'esbuild';
const bundle = await build({
  entryPoints: [fileURLToPath(new URL('../src/content.ts', import.meta.url))],
  bundle: true,
  write: false,
  format: 'iife',
  platform: 'browser',
});
function event() {
  const listeners = [];
  return {
    addListener(fn) {
      listeners.push(fn);
    },
    fire(...args) {
      for (const fn of listeners) fn(...args);
    },
  };
}
function setup() {
  const ports = [],
    intervals = new Map(),
    hooks = {};
  let counter = 0;
  const runtime = {
    id: 'test-extension',
    onMessage: event(),
    connect() {
      const port = {
        messages: [],
        onMessage: event(),
        onDisconnect: event(),
        postMessage(m) {
          this.messages.push(JSON.parse(JSON.stringify(m)));
        },
        disconnect() {
          this.onDisconnect.fire();
        },
      };
      ports.push(port);
      return port;
    },
  };
  const state = {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    video: {
      currentTime: 10,
      duration: 100,
      readyState: 4,
      paused: false,
      ended: false,
      pause() {
        this.paused = true;
      },
      async play() {
        this.paused = false;
      },
    },
  };
  const document = {
    title: 'Sample - YouTube',
    querySelector(selector) {
      if (selector === 'video.html5-main-video') return state.video;
      if (selector === '.html5-video-player') return { classList: { contains: () => false } };
      return { textContent: 'Sample' };
    },
  };
  vm.runInNewContext(bundle.outputFiles[0].text, {
    chrome: { runtime },
    document,
    location: {
      get href() {
        return state.url;
      },
    },
    window: {
      addEventListener(name, fn) {
        hooks[name] = fn;
      },
    },
    URL,
    crypto: { randomUUID: () => crypto.randomUUID() },
    TextEncoder,
    setTimeout,
    clearTimeout,
    setInterval(fn) {
      intervals.set(++counter, fn);
      return counter;
    },
    clearInterval(id) {
      intervals.delete(id);
    },
  });
  return {
    state,
    ports,
    intervals,
    hooks,
    select() {
      runtime.onMessage.fire({ type: 'selectYouTube' }, { id: runtime.id }, () => {});
    },
    pulse() {
      for (const fn of intervals.values()) fn();
    },
  };
}
test('content selection stays stable across next-video navigation and changes on explicit reselection', () => {
  const h = setup();
  assert.equal(h.ports.length, 0);
  h.select();
  const first = h.ports[0].messages.at(-1);
  assert.ok(first.selectionID);
  assert.equal(first.snapshot.availability, 'ready');
  h.state.url = 'https://www.youtube.com/watch?v=abcdefghijk';
  h.pulse();
  const next = h.ports[0].messages.at(-1);
  assert.equal(next.selectionID, first.selectionID);
  assert.notEqual(next.snapshot.targetID, first.snapshot.targetID);
  h.select();
  const reselected = h.ports[1].messages.at(-1);
  assert.notEqual(reselected.selectionID, first.selectionID);
  assert.notEqual(reselected.snapshot.targetID, next.snapshot.targetID);
  assert.equal(h.intervals.size, 1);
  h.hooks.pagehide();
  assert.equal(h.intervals.size, 0);
});
