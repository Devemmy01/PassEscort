import type { Difficulty } from './types';

/**
 * Level curve: Level 1 "Novice" → Level 50 "UTME Legend".
 * XP needed to clear level n is 100 + 25·(n−1), so early levels pop quickly
 * (first level-up inside the first practice session) and the full climb is
 * 34,300 XP — roughly one exam-prep season of daily practice.
 */
export const MAX_LEVEL = 50;

/**
 * Titles (decided 2026-11-21): Figma's five tier shields (Novice, Scholar,
 * Strategist, Sharpshooter, Legend — "Levels & Badges") every ten levels, and
 * the PRD's summit, Level 50 "UTME Legend", which wears the Legend shield.
 */
export const LEVEL_TIERS: ReadonlyArray<{ from: number; title: string }> = [
  { from: 1, title: 'Novice' },
  { from: 10, title: 'Scholar' },
  { from: 20, title: 'Strategist' },
  { from: 30, title: 'Sharpshooter' },
  { from: 40, title: 'Legend' },
  { from: 50, title: 'UTME Legend' },
];

export const XP_RULES = {
  correct: 10,
  hardBonus: 5,
  /** Every 5 consecutive correct answers adds this on top. */
  comboBonus: 5,
  sprintComplete: 25,
  dailyGoal: 20,
  duelWin: 30,
  duelDraw: 15,
  duelLoss: 10,
} as const;

export function xpToNext(level: number): number {
  if (level >= MAX_LEVEL) return 0;
  return 100 + 25 * (Math.max(1, level) - 1);
}

/** Total XP required to *reach* `level` from zero. */
export function totalXpForLevel(level: number): number {
  const target = Math.min(Math.max(1, level), MAX_LEVEL);
  let sum = 0;
  for (let l = 1; l < target; l++) sum += xpToNext(l);
  return sum;
}

export function levelTitle(level: number): string {
  let title = LEVEL_TIERS[0].title;
  for (const tier of LEVEL_TIERS) if (level >= tier.from) title = tier.title;
  return title;
}

export interface LevelInfo {
  level: number;
  title: string;
  /** XP earned inside the current level. */
  current: number;
  /** XP needed to clear the current level (0 at max level). */
  needed: number;
}

export function levelFromXp(totalXp: number): LevelInfo {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  while (level < MAX_LEVEL && remaining >= xpToNext(level)) {
    remaining -= xpToNext(level);
    level++;
  }
  return { level, title: levelTitle(level), current: level === MAX_LEVEL ? 0 : remaining, needed: xpToNext(level) };
}

export function xpForAnswer(correct: boolean, difficulty: Difficulty, combo: number): number {
  if (!correct) return 0;
  let xp = XP_RULES.correct;
  if (difficulty === 'hard') xp += XP_RULES.hardBonus;
  if (combo > 0 && combo % 5 === 0) xp += XP_RULES.comboBonus;
  return xp;
}
