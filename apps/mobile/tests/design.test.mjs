import assert from 'node:assert/strict';
import test from 'node:test';

import { palettes } from '../src/design-system/tokens.ts';

function luminance(hex) {
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((part) => {
      const value = parseInt(part, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}

function contrast(a, b) {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

for (const [name, colors] of Object.entries(palettes)) {
  test(`${name} palette keeps normal text at WCAG AA contrast on the UI surfaces`, () => {
    for (const background of ['background', 'surface', 'surfaceRaised', 'accentSurface']) {
      for (const foreground of ['text', 'textSecondary', 'textMuted']) {
        assert.ok(
          contrast(colors[foreground], colors[background]) >= 4.5,
          `${foreground} on ${background}`,
        );
      }
    }
    assert.ok(contrast(colors.accent, colors.accentSurface) >= 4.5);
    assert.ok(contrast(colors.onAccent, colors.accent) >= 4.5);
  });
}
