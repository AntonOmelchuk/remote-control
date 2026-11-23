import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  readAudioStatus,
  mergeAudioStatus,
} from '../src/features/remote-audio/model/audio-state.ts';
import { formatPlaybackTime } from '../src/shared/format-time.ts';
const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../../../packages/remote-link/Tests/RemotePairingTests/Fixtures/youtube-v1.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
test('phone reads the same YouTube fixture as Swift and Chrome without requiring an audio output', () => {
  const result = readAudioStatus(JSON.stringify(fixture.status), fixture.status.owner);
  assert.deepEqual(result.snapshot.media, fixture.state.snapshot);
  assert.equal(result.snapshot.output, null);
  assert.equal(result.mediaFailure, null);
});
test('media errors are independent of audio errors and older snapshots cannot roll media back', () => {
  const current = readAudioStatus(JSON.stringify(fixture.status), fixture.status.owner);
  const next = structuredClone(current);
  next.snapshot.revision--;
  next.snapshot.media = { availability: 'disconnected' };
  next.mediaFailure = 'targetChanged';
  const merged = mergeAudioStatus(current, next);
  assert.equal(merged.snapshot, current.snapshot);
  assert.equal(merged.mediaFailure, 'targetChanged');
  assert.equal(merged.commandFailure, null);
  next.mediaFailure = 'shutdown';
  assert.throws(() => readAudioStatus(JSON.stringify(next), fixture.status.owner));
});
test('unavailable media must clear stale title and target information', () => {
  const status = structuredClone(fixture.status);
  status.snapshot.media.availability = 'stale';
  assert.throws(() => readAudioStatus(JSON.stringify(status), status.owner));
  status.snapshot.media = { availability: 'stale' };
  assert.deepEqual(readAudioStatus(JSON.stringify(status), status.owner).snapshot.media, {
    availability: 'stale',
  });
});
test('fractional media times and hour-long videos have stable readable timestamps', () => {
  for (const [seconds, expected] of [
    [125.75, '2:05'],
    [3725.5, '1:02:05'],
    [0, '0:00'],
    [-5, '0:00'],
    [NaN, '0:00'],
    [Infinity, '0:00'],
  ])
    assert.equal(formatPlaybackTime(seconds), expected);
});

test('native uppercase target UUIDs use the same canonical identity as Chrome snapshots', () => {
  const status = structuredClone(fixture.status);
  status.snapshot.media.targetID = status.snapshot.media.targetID.toUpperCase();
  const decoded = readAudioStatus(JSON.stringify(status), status.owner);
  assert.equal(decoded.snapshot.media.targetID, fixture.state.snapshot.targetID);
  assert.equal(decoded.snapshot.media.videoID, fixture.state.snapshot.videoID);
});
