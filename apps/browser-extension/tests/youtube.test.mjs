import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { packet, readPacket, watchVideoID, isYouTubeURL } from '../src/protocol.ts';
import { YouTubeAdapter } from '../src/youtube-adapter.ts';

const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../../../packages/remote-link/Tests/RemotePairingTests/Fixtures/youtube-v1.json',
      import.meta.url,
    ),
    'utf8',
  ),
);

test('shared fixture has distinct bounded upstream state and downstream playback command', () => {
  assert.deepEqual(readPacket(fixture.state, 'upstream'), fixture.state);
  assert.deepEqual(readPacket(fixture.command, 'downstream'), fixture.command);
  assert.throws(() => readPacket(fixture.command, 'upstream'));
  assert.throws(() => readPacket(fixture.state, 'downstream'));
});
test('only the exact YouTube origin and watch-page ID are accepted', () => {
  assert.equal(watchVideoID('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), 'dQw4w9WgXcQ');
  for (const url of [
    'http://www.youtube.com/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com.evil.test/watch?v=dQw4w9WgXcQ',
    'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    'https://www.youtube.com/watch?v=invalid',
    'invalid',
  ])
    assert.equal(watchVideoID(url), null);
  assert.equal(isYouTubeURL('https://www.youtube.com/'), true);
  assert.equal(isYouTubeURL('https://youtube.com/'), false);
});
test('protocol rejects extra actions, invalid Unicode, oversized titles, numbers, and synthetic fresh states', () => {
  for (const mutate of [
    (value) => {
      value.shell = 'no';
    },
    (value) => {
      value.version = 2;
    },
    (value) => {
      value.snapshot.position = Infinity;
    },
    (value) => {
      value.snapshot.duration = -1;
    },
    (value) => {
      value.snapshot.title = '\ud800';
    },
    (value) => {
      value.snapshot.title = '🙂'.repeat(51);
    },
    (value) => {
      value.snapshot.title = 'bad\u202ename';
    },
    (value) => {
      value.snapshot.targetID = 'invalid';
    },
    (value) => {
      value.snapshot = { availability: 'stale' };
    },
  ]) {
    const value = structuredClone(fixture.state);
    mutate(value);
    assert.throws(() => readPacket(value, 'upstream'));
  }
  assert.deepEqual(readPacket(packet('browserHeartbeat'), 'upstream'), packet('browserHeartbeat'));
});
function harness() {
  const state = {
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    ad: false,
    title: 'Evening',
    video: {
      currentTime: 10.25,
      duration: 100,
      readyState: 4,
      paused: true,
      ended: false,
      pause() {
        this.paused = true;
      },
      async play() {
        this.paused = false;
      },
    },
  };
  const page = {
    title: 'Fallback - YouTube',
    querySelector(selector) {
      if (selector === 'video.html5-main-video') return state.video;
      if (selector === '.html5-video-player') return { classList: { contains: () => state.ad } };
      return { textContent: state.title };
    },
  };
  return { state, adapter: new YouTubeAdapter(page, () => state.url) };
}
test('confirmed HTML media state drives idempotent play and pause', async () => {
  const { state, adapter } = harness();
  const first = adapter.read();
  assert.equal(adapter.read().targetID, first.targetID);
  assert.equal(await adapter.setPaused(first.targetID, false), null);
  assert.equal(state.video.paused, false);
  assert.equal(await adapter.setPaused(first.targetID, true), null);
  assert.equal(adapter.read().paused, true);
});
test('navigation and replaced video elements invalidate stale commands before they reach another video', async () => {
  const { state, adapter } = harness();
  const first = adapter.read();
  state.url = 'https://www.youtube.com/watch?v=abcdefghijk';
  assert.equal(await adapter.setPaused(first.targetID, false), 'targetChanged');
  assert.equal(state.video.paused, true);
  const second = adapter.read();
  state.video = { ...state.video };
  assert.notEqual(adapter.read().targetID, second.targetID);
});
test('ads and browser autoplay rejection stay failures rather than optimistic playback', async () => {
  const { state, adapter } = harness();
  const first = adapter.read();
  state.ad = true;
  assert.equal(await adapter.setPaused(first.targetID, false), 'notReady');
  assert.equal(state.video.paused, true);
  state.ad = false;
  state.video.play = async () => {
    throw new Error('NotAllowedError');
  };
  assert.equal(await adapter.setPaused(first.targetID, false), 'blocked');
  assert.equal(adapter.read().paused, true);
});
test('a page change during asynchronous play cannot produce success for the new target', async () => {
  const { state, adapter } = harness();
  const first = adapter.read();
  state.video.play = async () => {
    state.url = 'https://www.youtube.com/watch?v=abcdefghijk';
  };
  assert.equal(await adapter.setPaused(first.targetID, false), 'targetChanged');
});
test('live streams keep a missing duration and metadata is sanitized and byte-bounded', () => {
  const { state, adapter } = harness();
  state.video.duration = Infinity;
  state.title = 'a\n\u202e' + '🙂'.repeat(100);
  const snapshot = adapter.read();
  assert.equal(snapshot.duration, null);
  assert.ok(Buffer.byteLength(snapshot.title) <= 200);
  assert.ok(!/[\p{Cc}\p{Cf}]/u.test(snapshot.title));
  state.url = 'https://www.youtube.com/';
  assert.deepEqual(adapter.read(), { availability: 'unavailable' });
});

test('UUID casing from Swift normalizes without changing the case-sensitive YouTube video ID', () => {
  const command = {
    ...fixture.command,
    requestID: fixture.command.requestID.toUpperCase(),
    targetID: fixture.command.targetID.toUpperCase(),
  };
  assert.deepEqual(readPacket(command, 'downstream'), fixture.command);
  const state = structuredClone(fixture.state);
  state.snapshot.targetID = state.snapshot.targetID.toUpperCase();
  assert.deepEqual(readPacket(state, 'upstream'), fixture.state);
  assert.equal(readPacket(state, 'upstream').snapshot.videoID, 'dQw4w9WgXcQ');
});

test('the video adapter accepts the same UUID in either case and still rejects a different target', async () => {
  const { state, adapter } = harness();
  const target = adapter.read().targetID;
  state.video.paused = false;
  assert.equal(await adapter.setPaused(target.toUpperCase(), true), null);
  assert.equal(state.video.paused, true);
  assert.equal(await adapter.setPaused(crypto.randomUUID(), false), 'targetChanged');
  assert.equal(state.video.paused, true);
});
