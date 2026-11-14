import assert from 'node:assert/strict';
import test from 'node:test';
import { createInstance } from 'i18next';

import { translationConfig } from '../src/localization/config.ts';

const { en, uk } = translationConfig.resources;

function interpolationKeys(text) {
  return [...text.matchAll(/{{\s*(\w+)\s*}}/g)].map((match) => match[1]).sort();
}

test('translation dictionaries have the same keys and interpolation arguments', () => {
  assert.deepEqual(Object.keys(uk.translation).sort(), Object.keys(en.translation).sort());
  for (const key of Object.keys(en.translation)) {
    assert.ok(en.translation[key].trim().length > 0, key);
    assert.ok(uk.translation[key].trim().length > 0, key);
    assert.deepEqual(
      interpolationKeys(uk.translation[key]),
      interpolationKeys(en.translation[key]),
      key,
    );
  }
});

test('bundled translations switch deterministically and unknown languages fall back to English', async () => {
  const instance = createInstance();
  await instance.init(translationConfig);
  assert.equal(instance.getFixedT('en')('navigation.settings'), 'Settings');
  assert.equal(instance.getFixedT('uk')('navigation.settings'), 'Налаштування');
  assert.equal(instance.getFixedT('de')('navigation.settings'), 'Settings');
  assert.equal(instance.getFixedT('uk')('time.minutesShort', { count: 45 }), '45 хв');
  assert.equal(instance.getFixedT('en')('time.minutesShort', { count: 45 }), '45 min');
  for (const language of ['en', 'uk']) {
    const t = instance.getFixedT(language);
    for (const key of Object.keys(en.translation)) assert.notEqual(t(key), key, key);
  }
});
