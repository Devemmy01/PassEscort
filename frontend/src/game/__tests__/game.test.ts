import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levelFromXp, levelTitle, MAX_LEVEL, totalXpForLevel, xpForAnswer, xpToNext } from '../levels';
import { BADGES } from '../badges';
import { formatNaira, perDay, PRODUCTS } from '../pricing';

test('level titles span Novice (1) to UTME Legend (50)', () => {
  assert.equal(levelTitle(1), 'Novice');
  assert.equal(levelTitle(4), 'Novice');
  assert.equal(levelTitle(9), 'Novice');
  assert.equal(levelTitle(10), 'Scholar');
  assert.equal(levelTitle(20), 'Strategist');
  assert.equal(levelTitle(30), 'Sharpshooter');
  assert.equal(levelTitle(49), 'Legend');
  assert.equal(levelTitle(MAX_LEVEL), 'UTME Legend');
});

test('xp curve is monotonic and capped at level 50', () => {
  for (let l = 1; l < MAX_LEVEL - 1; l++) assert.ok(xpToNext(l + 1) > xpToNext(l));
  assert.equal(xpToNext(MAX_LEVEL), 0);
  assert.equal(totalXpForLevel(MAX_LEVEL), 34300);
});

test('levelFromXp is the inverse of totalXpForLevel', () => {
  for (const level of [1, 2, 7, 25, 49, 50]) {
    const info = levelFromXp(totalXpForLevel(level));
    assert.equal(info.level, level);
    assert.equal(info.current, 0);
  }
  const mid = levelFromXp(totalXpForLevel(3) + 40);
  assert.deepEqual(mid, { level: 3, title: 'Novice', current: 40, needed: 150 });
  assert.equal(levelFromXp(10_000_000).level, MAX_LEVEL);
  assert.equal(levelFromXp(-5).level, 1);
});

test('xpForAnswer rewards correctness, difficulty and combos', () => {
  assert.equal(xpForAnswer(false, 'hard', 5), 0);
  assert.equal(xpForAnswer(true, 'easy', 1), 10);
  assert.equal(xpForAnswer(true, 'hard', 1), 15);
  assert.equal(xpForAnswer(true, 'easy', 5), 15);
});

test('badge ids are unique and targets positive', () => {
  assert.equal(new Set(BADGES.map((b) => b.id)).size, BADGES.length);
  for (const b of BADGES) assert.ok(b.target > 0, b.id);
});

test('naira formatting and per-day pricing', () => {
  assert.equal(formatNaira(800), '₦800');
  assert.equal(formatNaira(1250), '₦1,250');
  assert.equal(formatNaira(1000000), '₦1,000,000');
  assert.equal(perDay(PRODUCTS.monthly), 27);
  assert.equal(perDay(PRODUCTS.day), 100);
});
