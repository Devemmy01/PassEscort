import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colors, TEXT_PAIRS, typography, UI_PAIRS } from '../tokens';
import { contrastRatio } from '../contrast';

test('contrastRatio matches known WCAG reference values', () => {
  assert.equal(Math.round(contrastRatio('#000000', '#FFFFFF') * 10) / 10, 21);
  assert.equal(contrastRatio('#777777', '#777777'), 1);
});

for (const [fg, bg] of TEXT_PAIRS) {
  test(`text pair ${fg} on ${bg} meets WCAG AA (4.5:1)`, () => {
    const ratio = contrastRatio(colors[fg], colors[bg]);
    assert.ok(ratio >= 4.5, `${fg} (${colors[fg]}) on ${bg} (${colors[bg]}) is ${ratio.toFixed(2)}:1`);
  });
}

for (const [fg, bg] of UI_PAIRS) {
  test(`UI boundary ${fg} on ${bg} meets WCAG 1.4.11 (3:1)`, () => {
    const ratio = contrastRatio(colors[fg], colors[bg]);
    assert.ok(ratio >= 3, `${fg} (${colors[fg]}) on ${bg} (${colors[bg]}) is ${ratio.toFixed(2)}:1`);
  });
}

test('type scale stays legible on low-DPI screens', () => {
  for (const [name, style] of Object.entries(typography)) {
    assert.ok(style.fontSize >= 12, `${name} is below the 12sp floor`);
    assert.ok(Number(style.fontWeight) >= 400, `${name} uses a hairline weight`);
    assert.ok(style.lineHeight >= style.fontSize * 1.2, `${name} line height is too tight`);
  }
  assert.ok(typography.body.fontSize >= 16, 'body copy must be at least 16sp');
});
