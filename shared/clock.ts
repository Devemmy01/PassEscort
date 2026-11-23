/**
 * Calendar days in Nigeria (West Africa Time, UTC+1, no daylight saving).
 * Streaks, daily goals and the free AI quota all reset at local midnight,
 * whatever timezone the server or phone is set to.
 */
export const WAT_OFFSET_MS = 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** "2026-11-21" for the WAT calendar day containing `at`. */
export function dayKey(at: Date | number): string {
  const t = (typeof at === 'number' ? at : at.getTime()) + WAT_OFFSET_MS;
  return new Date(t).toISOString().slice(0, 10);
}

/** Whole calendar days from `from` to `to` (both day keys). */
export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS);
}

export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** Local (WAT) hour 0–23 of an instant — for the Early Bird / Night Owl badges. */
export function watHour(at: Date | number): number {
  const t = (typeof at === 'number' ? at : at.getTime()) + WAT_OFFSET_MS;
  return new Date(t).getUTCHours();
}

/** "2026-11" — the month a Monthly plan's free streak repairs are counted in. */
export function monthKey(at: Date | number): string {
  return dayKey(at).slice(0, 7);
}

/** "2026-W47": the WAT week (Monday–Sunday) containing `at` — weekly leaderboards reset Monday 00:00 in Lagos. */
export function weekKey(at: Date | number): string {
  // ISO-8601 week of the Lagos calendar day: weeks start Monday; week 1 holds the year's first Thursday.
  const d = new Date(Date.parse(`${dayKey(at)}T00:00:00Z`));
  d.setUTCDate(d.getUTCDate() + 3 - ((d.getUTCDay() + 6) % 7)); // this week's Thursday
  const year = d.getUTCFullYear();
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const week = 1 + Math.round(((d.getTime() - jan4.getTime()) / DAY_MS - 3 + ((jan4.getUTCDay() + 6) % 7)) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}
