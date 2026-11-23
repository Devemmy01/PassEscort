import { addDays, dayKey, WAT_OFFSET_MS } from './clock';

/** Leaderboards show first name + last initial only ("Adaeze O."). */
export function shortName(name: string): string {
  const [first, last] = name.trim().split(/\s+/);
  return first ? `${first}${last ? ` ${last[0]}.` : ''}` : 'Student';
}

/** When the weekly board resets: next Monday 00:00 in Lagos. */
export function weekResetsAt(now: Date): Date {
  const today = dayKey(now);
  const weekday = (new Date(`${today}T00:00:00Z`).getUTCDay() + 6) % 7;
  return new Date(Date.parse(`${addDays(today, 7 - weekday)}T00:00:00Z`) - WAT_OFFSET_MS);
}

/** "Resets in 2 days" / "Resets in 5 hours". */
export function resetsInLabel(resetsAt: string | Date, now: Date): string {
  const ms = new Date(resetsAt).getTime() - now.getTime();
  const hours = Math.max(1, Math.ceil(ms / 3_600_000));
  if (hours < 24) return `Resets in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return `Resets in ${days} day${days === 1 ? '' : 's'}`;
}
