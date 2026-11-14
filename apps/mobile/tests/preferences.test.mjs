import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decodePreferences,
  defaultPreferences,
  encodePreferences,
  resolveLanguage,
  resolveTheme,
} from '../src/preferences/model.ts';
import { createPreferencesRepository, preferencesStorageKey } from '../src/preferences/storage.ts';

test('first launch and malformed data restore safe defaults', () => {
  for (const raw of [null, '', '{bad', 'null', '[]', 'true', '42', '{}']) {
    assert.deepEqual(decodePreferences(raw), defaultPreferences);
  }
});

test('stored preferences round-trip without resolved system values', () => {
  const preferences = { language: 'uk', appearance: 'dark' };
  assert.deepEqual(decodePreferences(encodePreferences(preferences)), preferences);
  assert.deepEqual(decodePreferences(encodePreferences(defaultPreferences)), defaultPreferences);
});

test('invalid fields fall back independently and unsupported versions are ignored', () => {
  assert.deepEqual(decodePreferences('{"version":1,"language":"de","appearance":"dark"}'), {
    language: 'system',
    appearance: 'dark',
  });
  assert.deepEqual(decodePreferences('{"version":1,"language":"uk","appearance":true}'), {
    language: 'uk',
    appearance: 'system',
  });
  assert.deepEqual(
    decodePreferences('{"version":2,"language":"uk","appearance":"dark"}'),
    defaultPreferences,
  );
});

test('system language uses the first supported preferred locale, with English fallback', () => {
  assert.equal(resolveLanguage('system', ['uk-UA', 'en-US']), 'uk');
  assert.equal(resolveLanguage('system', ['de-DE', 'UK_ua']), 'uk');
  assert.equal(resolveLanguage('system', ['en-GB', 'uk-UA']), 'en');
  assert.equal(resolveLanguage('system', [null, 'de-DE']), 'en');
  assert.equal(resolveLanguage('system', []), 'en');
});

test('explicit language overrides the system and system appearance follows the current device value', () => {
  assert.equal(resolveLanguage('en', ['uk']), 'en');
  assert.equal(resolveLanguage('uk', ['en']), 'uk');
  assert.equal(resolveTheme('system', 'dark'), 'dark');
  assert.equal(resolveTheme('system', 'light'), 'light');
  assert.equal(resolveTheme('system', null), 'light');
  assert.equal(resolveTheme('dark', 'light'), 'dark');
  assert.equal(resolveTheme('light', 'dark'), 'light');
});

test('storage read errors allow the app to start with defaults and an error status', async () => {
  const repository = createPreferencesRepository({
    getItem: async () => {
      throw new Error('unavailable');
    },
    setItem: async () => {},
  });
  assert.deepEqual(await repository.load(), { preferences: defaultPreferences, failed: true });
});

test('valid stored data is restored from the application-specific key', async () => {
  const preferences = { language: 'uk', appearance: 'light' };
  const repository = createPreferencesRepository({
    getItem: async (key) => {
      assert.equal(key, preferencesStorageKey);
      return encodePreferences(preferences);
    },
    setItem: async () => {},
  });
  assert.deepEqual(await repository.load(), { preferences, failed: false });
});

test('rapid changes are written sequentially so an older write cannot finish last', async () => {
  let releaseFirst;
  const firstGate = new Promise((resolve) => {
    releaseFirst = resolve;
  });
  const started = [];
  let saved = null;
  const repository = createPreferencesRepository({
    getItem: async () => saved,
    setItem: async (_key, value) => {
      started.push(JSON.parse(value));
      if (started.length === 1) await firstGate;
      saved = value;
    },
  });
  const first = repository.save({ language: 'uk', appearance: 'system' });
  const latest = repository.save({ language: 'uk', appearance: 'dark' });
  await Promise.resolve();
  assert.equal(started.length, 1);
  releaseFirst();
  await Promise.all([first, latest]);
  assert.equal(started.length, 2);
  assert.deepEqual(decodePreferences(saved), { language: 'uk', appearance: 'dark' });
});

test('a failed write is reported and does not prevent a later save', async () => {
  let writes = 0;
  let saved = null;
  const repository = createPreferencesRepository({
    getItem: async () => saved,
    setItem: async (_key, value) => {
      if (++writes === 1) throw new Error('unavailable');
      saved = value;
    },
  });
  await assert.rejects(repository.save({ language: 'uk', appearance: 'system' }), /unavailable/);
  await repository.save({ language: 'en', appearance: 'light' });
  assert.deepEqual(decodePreferences(saved), { language: 'en', appearance: 'light' });
});
