import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { readSleepTimer, timerIsActive } from '@remote-control/remote-link/timer';
import {
  readAudioStatus,
  mergeAudioStatus,
} from '../src/features/remote-audio/model/audio-state.ts';
import {
  clampMinutes,
  durationParts,
  minutesAtPosition,
} from '../src/features/sleep-timer/model/duration.ts';
const fixture = JSON.parse(
  readFileSync(
    new URL(
      '../../../packages/remote-link/Tests/RemotePairingTests/Fixtures/sleep-timer-v1.json',
      import.meta.url,
    ),
    'utf8',
  ),
);
const status = () => structuredClone(fixture.status);
const read = (value) => readAudioStatus(JSON.stringify(value), fixture.status.owner);

test('Swift and phone share the 2h45m timer fixture independently of audio output', () => {
  const result = read(status());
  assert.equal(result.snapshot.timer.durationSeconds, 9900);
  assert.equal(result.snapshot.timer.selectionID, fixture.state.selectionID);
  assert.equal(result.snapshot.output, null);
  assert.equal(timerIsActive(result.snapshot.timer), true);
  assert.equal(result.timerFailure, null);
});
test('timer editor has exact minute endpoints and can express 2h45m without rounding to presets', () => {
  assert.deepEqual(durationParts(165), { hours: 2, minutes: 45 });
  assert.deepEqual(durationParts(720), { hours: 12, minutes: 0 });
  for (const [value, expected] of [
    [-10, 1],
    [0, 1],
    [165, 165],
    [719.7, 720],
    [1000, 720],
    [NaN, 30],
    [Infinity, 30],
  ])
    assert.equal(clampMinutes(value), expected);
  assert.equal(minutesAtPosition(-100, 320), 1);
  assert.equal(minutesAtPosition(1000, 320), 720);
  const x = 12 + ((320 - 24) * (165 - 1)) / (720 - 1);
  assert.equal(minutesAtPosition(x, 320), 165);
  for (let minute = 1; minute <= 720; minute++) {
    const position = 12 + ((320 - 24) * (minute - 1)) / (720 - 1);
    assert.equal(minutesAtPosition(position, 320), minute);
  }
});
test('malformed or inconsistent native timer state is rejected', () => {
  for (const mutate of [
    (t) => {
      t.durationSeconds = 59;
    },
    (t) => {
      t.durationSeconds = 43260;
    },
    (t) => {
      t.durationSeconds = 60.5;
    },
    (t) => {
      t.remainingSeconds = true;
    },
    (t) => {
      t.remainingSeconds = 0;
    },
    (t) => {
      t.remainingSeconds = 9901;
    },
    (t) => {
      t.id = 'invalid';
    },
    (t) => {
      t.selectionID = 'invalid';
    },
    (t) => {
      t.phase = 'shutdown';
    },
    (t) => {
      t.phase = 'completed';
    },
    (t) => {
      t.failure = 'blocked';
    },
    (t) => {
      t.cancellation = 'user';
    },
    (t) => {
      t.ownerToken = 'private';
    },
  ]) {
    const value = status();
    mutate(value.snapshot.timer);
    assert.throws(() => read(value));
  }
  const mismatch = status();
  mismatch.snapshot.selectionID = crypto.randomUUID();
  assert.throws(() => read(mismatch));
  const foreign = status();
  foreign.owner = 'another-session';
  assert.throws(() => read(foreign));
});
test('timer terminal reasons must match their phase and UUID case is normalized', () => {
  const timer = structuredClone(fixture.status.snapshot.timer);
  timer.id = timer.id.toUpperCase();
  timer.selectionID = timer.selectionID.toUpperCase();
  assert.equal(readSleepTimer(timer).id, fixture.cancel.timerID);
  timer.remainingSeconds = 0;
  timer.phase = 'failed';
  timer.failure = 'timedOut';
  assert.equal(readSleepTimer(timer).failure, 'timedOut');
  delete timer.failure;
  assert.throws(() => readSleepTimer(timer));
  timer.phase = 'cancelled';
  timer.cancellation = 'ownerRevoked';
  assert.equal(readSleepTimer(timer).cancellation, 'ownerRevoked');
  delete timer.cancellation;
  assert.throws(() => readSleepTimer(timer));
  assert.equal(readSleepTimer({ phase: 'idle', durationSeconds: 0, remainingSeconds: 0 }).id, null);
});
test('timer failure cannot hide audio/media state and old readback cannot reset a newer countdown', () => {
  const original = read(status());
  const older = status();
  older.snapshot.revision--;
  older.snapshot.timer.remainingSeconds++;
  older.timerFailure = 'timerChanged';
  older.commandFailure = 'volumeUnavailable';
  older.mediaFailure = 'blocked';
  const merged = mergeAudioStatus(original, read(older));
  assert.equal(merged.snapshot, original.snapshot);
  assert.equal(merged.timerFailure, 'timerChanged');
  assert.equal(merged.commandFailure, 'volumeUnavailable');
  assert.equal(merged.mediaFailure, 'blocked');
});
test('older Mac snapshot remains readable with timer support unavailable', () => {
  const value = status();
  delete value.snapshot.timer;
  delete value.snapshot.selectionID;
  assert.equal(read(value).snapshot.timer, null);
  assert.equal(read(value).snapshot.selectionID, null);
});
