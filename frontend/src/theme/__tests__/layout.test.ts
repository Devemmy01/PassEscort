import assert from 'node:assert/strict';
import { test } from 'node:test';
import { contentWidthFor, layout } from '../tokens';

test('phones and iPad Split View use the phone column; full-screen iPads get the tablet column', () => {
  assert.equal(contentWidthFor(390), 480, 'iPhone');
  assert.equal(contentWidthFor(507), 480, 'iPad landscape, half Split View');
  assert.equal(contentWidthFor(744), 480, 'iPad mini portrait');
  assert.equal(contentWidthFor(820), 720, 'iPad Air portrait');
  assert.equal(contentWidthFor(1366), 720, 'iPad Pro landscape');
  // The tablet column always leaves the 16dp gutters.
  assert.ok(layout.tabletContentWidth + 2 * layout.screenGutter <= layout.tabletBreakpoint);
});
