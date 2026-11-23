/**
 * Daily streak (PRD §5.4). The streak grows on the first *completed* session
 * of a WAT calendar day.
 *
 *   active   practised today
 *   pending  practised yesterday — alive, practise today to keep it
 *   broken   missed a day. Repairable for 48 hours: while exactly one day was
 *            missed (the day before yesterday was the last active day), the
 *            student can pay 200 gems — or use a Monthly plan repair — to
 *            restore it. Missing two days or more starts over.
 */
import { addDays, daysBetween } from './clock';

export type StreakState = 'active' | 'pending' | 'broken';

export interface Streak {
  days: number;
  best: number;
  /** WAT day of the last completed session, or null if never. */
  lastActiveDay: string | null;
}

export const NEW_STREAK: Streak = { days: 0, best: 0, lastActiveDay: null };

export interface StreakView {
  state: StreakState;
  /** Days to display. A broken streak shows the days it had, so the repair screen can name what is at stake. */
  days: number;
  repairable: boolean;
}

export function streakView(s: Streak, today: string): StreakView {
  if (!s.lastActiveDay) return { state: 'pending', days: 0, repairable: false };
  const gap = daysBetween(s.lastActiveDay, today);
  if (gap <= 0) return { state: 'active', days: s.days, repairable: false };
  if (gap === 1) return { state: 'pending', days: s.days, repairable: false };
  if (gap === 2 && s.days > 0) return { state: 'broken', days: s.days, repairable: true };
  return { state: 'broken', days: 0, repairable: false };
}

/** Record a completed session on `today`. Returns the new streak and whether it grew. */
export function completeSessionStreak(s: Streak, today: string): { streak: Streak; grew: boolean } {
  if (s.lastActiveDay === today) return { streak: s, grew: false };
  const gap = s.lastActiveDay ? daysBetween(s.lastActiveDay, today) : Infinity;
  const days = gap === 1 ? s.days + 1 : 1;
  return { streak: { days, best: Math.max(s.best, days), lastActiveDay: today }, grew: true };
}

/** Repair a repairable broken streak: it counts as if yesterday was practised. */
export function repairStreak(s: Streak, today: string): Streak | null {
  if (!streakView(s, today).repairable) return null;
  return { ...s, lastActiveDay: addDays(today, -1) };
}

/** Questions per day implied by a daily-minutes target (~1 question / 45s), rounded to 5. */
export function dailyGoalQuestions(minutes: number): number {
  return Math.max(5, Math.round((minutes * 60) / 45 / 5) * 5);
}
