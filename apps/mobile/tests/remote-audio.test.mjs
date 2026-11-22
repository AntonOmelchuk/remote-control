import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import {
  mergeAudioStatus,
  readAudioStatus,
} from '../src/features/remote-audio/model/audio-state.ts';

import {
  formatVolume,
  outputIsSilent,
  quantizeVolume,
  stepVolume,
  volumeAtPosition,
} from '../src/features/remote-audio/model/volume.ts';

const owner = 'test-session';
const fixture = () => ({
  owner,
  snapshot: {
    revision: 10,
    output: {
      id: '3E69701C-3BFE-46CF-A095-E54F2E8FAD54',
      name: 'Test speakers',
      volume: 0.42,
      canSetVolume: true,
      muted: false,
      canSetMute: false,
    },
  },
});
test('audio summaries preserve independent capabilities and omitted optional values', () => {
  const result = readAudioStatus(JSON.stringify(fixture()), owner);
  assert.equal(result.snapshot.output.volume, 0.42);
  assert.equal(result.snapshot.output.canSetMute, false);
  assert.equal(result.snapshot.failure, null);
  assert.equal(result.commandFailure, null);
});
test('audio summaries reject invalid levels, unsafe revisions, capabilities, and foreign owners', () => {
  for (const change of [
    (v) => {
      v.snapshot.output.volume = 1.1;
    },
    (v) => {
      v.snapshot.output.volume = null;
    },
    (v) => {
      v.snapshot.revision = Number.MAX_SAFE_INTEGER + 1;
    },
    (v) => {
      v.snapshot.output.name = 'bad\nname';
    },
    (v) => {
      v.snapshot.failure = 'hardwareFailure';
    },
    (v) => {
      v.snapshot.output.id = 'not-an-id';
    },
    (v) => {
      v.owner = 'previous-session';
    },
    (v) => {
      v.commandFailure = 'shutdown';
    },
  ]) {
    const value = fixture();
    change(value);
    assert.throws(() => readAudioStatus(JSON.stringify(value), owner));
  }
});
test('older readback never rolls back newer confirmed state and duplicate cache reads are stable', () => {
  const current = readAudioStatus(JSON.stringify(fixture()), owner);
  const next = structuredClone(current);
  next.snapshot.revision = 9;
  next.snapshot.output.volume = 0.1;
  next.commandFailure = 'outputChanged';
  const merged = mergeAudioStatus(current, next);
  assert.equal(merged.snapshot, current.snapshot);
  assert.equal(merged.commandFailure, 'outputChanged');
  assert.equal(mergeAudioStatus(current, structuredClone(current)), current);
  assert.throws(() => mergeAudioStatus(current, { ...current, owner: 'another-session' }));
});

test('Swift and TypeScript consume the same audio boundary fixture', () => {
  const fixture = JSON.parse(
    readFileSync(
      new URL(
        '../../../packages/remote-link/Tests/RemotePairingTests/Fixtures/remote-audio-v1.json',
        import.meta.url,
      ),
      'utf8',
    ),
  );
  const value = readAudioStatus(JSON.stringify(fixture.status), fixture.status.owner);
  assert.deepEqual(value.snapshot.output, fixture.welcome.snapshot.output);
  assert.equal(value.snapshot.revision, fixture.welcome.snapshot.revision);
  assert.equal(fixture.command.outputID, value.snapshot.output.id);
});

test('five-percent steps reach exact silence through Float32 readback', () => {
  assert.notEqual(Math.fround(0.05) - 0.05, 0);
  assert.equal(stepVolume(Math.fround(0.05), -1), 0);
  let volume = Math.fround(0.95);
  for (let index = 0; index < 19; index++) volume = Math.fround(stepVolume(volume, -1));
  assert.equal(volume, 0);
  assert.equal(stepVolume(volume, 1), 0.05);
});
test('volume steps and slider positions have exact bounded endpoints', () => {
  assert.equal(stepVolume(0.03, -1), 0);
  assert.equal(stepVolume(Math.fround(0.95), 1), 1);
  assert.equal(quantizeVolume(-0.3), 0);
  assert.equal(quantizeVolume(1.3), 1);
  assert.equal(quantizeVolume(0.426), 0.43);
  assert.equal(volumeAtPosition(12, 300), 0);
  assert.equal(volumeAtPosition(150, 300), 0.5);
  assert.equal(volumeAtPosition(288, 300), 1);
  assert.throws(() => quantizeVolume(NaN), RangeError);
});
test('silence presentation includes exact zero without changing the hardware mute flag', () => {
  assert.equal(outputIsSilent({ volume: 0, muted: false }), true);
  assert.equal(outputIsSilent({ volume: 0.42, muted: true }), true);
  assert.equal(outputIsSilent({ volume: 0.42, muted: false }), false);
  assert.equal(outputIsSilent({ volume: null, muted: null }), false);
});
test('positive fractional gain is never labelled exact zero', () => {
  assert.equal(formatVolume(0), '0%');
  assert.equal(formatVolume(Math.fround(0.05) - 0.05), '<1%');
  assert.equal(formatVolume(0.42), '42%');
  assert.equal(formatVolume(1), '100%');
  assert.equal(formatVolume(null), '—');
});
