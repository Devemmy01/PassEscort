import type { LeaderboardDTO, LeaderboardEntry, LeaderboardScope } from '../../../shared/api';
import { weekKey } from '../../../shared/clock';
import { shortName, weekResetsAt } from '../../../shared/leaderboard';
import { levelFromXp } from '../../../shared/levels';

export { resetsInLabel, shortName } from '../../../shared/leaderboard';

/** Prototype classmates (demo mode only — live boards come from GET /leaderboard). */
const CLASSMATES: [name: string, weekXp: number, totalXp: number][] = [
  ['Chioma Eze', 2140, 18400],
  ['Tunde Bakare', 1880, 9200],
  ['Funmi Adeyemi', 1610, 12800],
  ['Ibrahim Musa', 1420, 7600],
  ['Ngozi Obi', 1185, 21300],
  ['Emeka Nwosu', 960, 5400],
  ['Aisha Bello', 820, 6100],
  ['Kunle Ade', 640, 3900],
  ['Zainab Yusuf', 455, 2800],
  ['David Okon', 310, 1500],
];
const FRIENDS = new Set(['Tunde Bakare', 'Funmi Adeyemi', 'Ibrahim Musa']);

/** A demo board with the student ranked among the classmates, shaped exactly like the API's. */
export function demoLeaderboard(scope: LeaderboardScope, me: { name: string; totalXp: number; weekXp: number }, now = new Date()): LeaderboardDTO {
  const weekly = scope !== 'all';
  const pool = CLASSMATES.filter(([n]) => scope !== 'friends' || FRIENDS.has(n)).map(([name, w, t]) => ({ name, xp: weekly ? w : t, total: t, me: false }));
  const myXp = weekly ? me.weekXp : me.totalXp;
  if (myXp > 0 || scope === 'friends') pool.push({ name: me.name || 'You', xp: myXp, total: me.totalXp, me: true });
  const entries: LeaderboardEntry[] = pool
    .filter((p) => p.xp > 0 || p.me)
    .sort((a, b) => b.xp - a.xp)
    .map((p, i) => ({ rank: i + 1, name: shortName(p.name), level: levelFromXp(p.total).level, xp: p.xp, me: p.me }));
  return { scope, week: weekKey(now), resetsAt: weekResetsAt(now).toISOString(), entries, me: null };
}

/** XP gap to the next rank up (the nudge under the student's row), or null at #1 / off the board. */
export function gapToNext(board: LeaderboardDTO): { xp: number; name: string } | null {
  const mine = board.entries.find((e) => e.me) ?? board.me;
  if (!mine || mine.rank === 1) return null;
  const ahead = board.entries.find((e) => e.rank === mine.rank - 1) ?? board.entries[board.entries.length - 1];
  if (!ahead || ahead.me) return null;
  return { xp: Math.max(1, ahead.xp - mine.xp + 1), name: ahead.name };
}
