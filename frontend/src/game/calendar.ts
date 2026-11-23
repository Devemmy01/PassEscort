import { addDays } from '../../../shared/clock';

export interface CalendarDay {
  day: string;
  /** Day of the month, 1–31. */
  date: number;
  answered: number;
  goalMet: boolean;
  today: boolean;
  future: boolean;
}

/** "2026-11" → weeks (Mon–Sun rows) of the month, padded with nulls. */
export function monthGrid(month: string, answeredByDay: Record<string, number>, today: string, goal: number): (CalendarDay | null)[][] {
  const first = `${month}-01`;
  const lead = (new Date(`${first}T00:00:00Z`).getUTCDay() + 6) % 7; // Monday-first
  const cells: (CalendarDay | null)[] = Array.from({ length: lead }, () => null);
  for (let d = first; d.startsWith(month); d = addDays(d, 1)) {
    const answered = answeredByDay[d] ?? 0;
    cells.push({ day: d, date: Number(d.slice(8)), answered, goalMet: answered >= goal, today: d === today, future: d > today });
  }
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, i) => cells.slice(i * 7, i * 7 + 7));
}

export function shiftMonth(month: string, by: number): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-NG', { month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** Summary for a month: days practised and days the daily goal was met. */
export function monthSummary(grid: (CalendarDay | null)[][]): { practised: number; goalDays: number } {
  const days = grid.flat().filter((d): d is CalendarDay => d !== null);
  return { practised: days.filter((d) => d.answered > 0).length, goalDays: days.filter((d) => d.goalMet && d.answered > 0).length };
}
