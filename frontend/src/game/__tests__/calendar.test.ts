import assert from 'node:assert/strict';
import { test } from 'node:test';
import { monthGrid, monthLabel, monthSummary, shiftMonth } from '../calendar';

test('month grid is Monday-first with padding', () => {
  // November 2026 starts on a Sunday → 6 blanks, 30 days, 5 or 6 rows
  const g = monthGrid('2026-11', { '2026-11-02': 3, '2026-11-20': 25 }, '2026-11-21', 25);
  assert.equal(g[0]!.filter((c) => c === null).length, 6);
  assert.equal(g[0]![6]!.date, 1);
  assert.ok(g.every((row) => row.length === 7));
  assert.equal(g.flat().filter(Boolean).length, 30);
  const cells = g.flat().filter((c) => c !== null);
  assert.equal(cells.find((c) => c.day === '2026-11-20')!.goalMet, true);
  assert.equal(cells.find((c) => c.day === '2026-11-02')!.goalMet, false);
  assert.equal(cells.find((c) => c.day === '2026-11-21')!.today, true);
  assert.equal(cells.find((c) => c.day === '2026-11-22')!.future, true);
  assert.deepEqual(monthSummary(g), { practised: 2, goalDays: 1 });
});

test('month navigation crosses years', () => {
  assert.equal(shiftMonth('2026-01', -1), '2025-12');
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.match(monthLabel('2026-11'), /November 2026/);
});
