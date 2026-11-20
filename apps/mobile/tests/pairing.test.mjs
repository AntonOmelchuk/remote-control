import assert from 'node:assert/strict';
import test from 'node:test';
import { readPairedMac, readPreparation } from '../src/features/pairing/model/native-summary.ts';

test('native pairing summaries expose only display metadata to JavaScript', () => {
  const id = 'd8ab1f33-dbd8-4b2b-ae62-fd3d1ebf266a';
  assert.deepEqual(readPairedMac(JSON.stringify({ name: 'My Mac', id, token: 'never-exported' })), {
    name: 'My Mac',
    id,
  });
  assert.deepEqual(readPreparation('{"name":"Mac","comparison":"000123"}'), {
    name: 'Mac',
    comparison: '000123',
  });
});

test('malformed native summaries cannot become a paired UI state', () => {
  for (const value of ['null', '[]', '{}', '{"name":"","id":"x"}', 'invalid']) {
    assert.throws(() => readPairedMac(value));
  }
  for (const comparison of ['123', '1234567', 'ABCDEF', 123456]) {
    assert.throws(() => readPreparation(JSON.stringify({ name: 'Mac', comparison })));
  }
});
