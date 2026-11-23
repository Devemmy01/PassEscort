import assert from 'node:assert/strict';
import { test } from 'node:test';
import { demoLeaderboard, gapToNext } from '../leaderboard';

const now = new Date('2026-11-21T12:00:00Z');

test('demo board ranks the student among classmates, like the API', () => {
  const b = demoLeaderboard('week', { name: 'Adaeze Okafor', totalXp: 5000, weekXp: 1500 }, now);
  assert.equal(b.week, '2026-W47');
  assert.equal(b.resetsAt, '2026-11-22T23:00:00.000Z');
  const me = b.entries.find((e) => e.me)!;
  assert.equal(me.name, 'Adaeze O.');
  assert.equal(me.rank, 4);
  assert.deepEqual(b.entries.map((e) => e.rank), b.entries.map((_, i) => i + 1));
  assert.deepEqual(gapToNext(b), { xp: 111, name: 'Funmi A.' });
});

test('friends board is small; all-time uses total XP; no gap at #1', () => {
  const f = demoLeaderboard('friends', { name: 'Ada', totalXp: 0, weekXp: 0 }, now);
  assert.equal(f.entries.length, 4);
  const top = demoLeaderboard('all', { name: 'Ada', totalXp: 99999, weekXp: 0 }, now);
  assert.equal(top.entries[0]!.me, true);
  assert.equal(gapToNext(top), null);
});
