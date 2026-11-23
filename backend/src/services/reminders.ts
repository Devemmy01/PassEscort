/**
 * Evening streak reminders (PRD §5.4 + §4 push). Schedule `npm run
 * push:reminders` hourly; it only acts from REMINDER_HOUR (WAT) and messages
 * each student at most once a day:
 *  - streak alive but not yet extended today → "ends at midnight";
 *  - streak broken and still repairable → "repair before midnight".
 */
import { addDays, dayKey, watHour } from "../../../shared/clock";
import { STREAK_REPAIR_GEMS } from "../../../shared/pricing";
import User from "../models/User";
import { notify } from "./push";

export const REMINDER_HOUR = 18;

export async function sendStreakReminders(now = new Date()): Promise<{ pending: number; repairable: number }> {
  if (watHour(now) < REMINDER_HOUR) return { pending: 0, repairable: 0 };
  const today = dayKey(now);
  const yesterday = addDays(today, -1);
  const base = { "notify.reminders": { $ne: false }, "pushTokens.0": { $exists: true }, lastReminderDay: { $ne: today }, "streak.days": { $gt: 0 } };

  const pending = await User.find({ ...base, "streak.lastActiveDay": yesterday }, { streak: 1 }).lean();
  for (const u of pending) {
    const n = u.streak.days;
    await notify([String(u._id)], "reminders", {
      title: `🔥 Your ${n}-day streak ends at midnight`,
      body: "One quick practice keeps it alive. Five minutes is enough.",
      data: { type: "streak" },
    });
  }
  const repairable = await User.find({ ...base, "streak.lastActiveDay": addDays(today, -2) }, { streak: 1 }).lean();
  for (const u of repairable) {
    await notify([String(u._id)], "reminders", {
      title: `Your ${u.streak.days}-day streak broke yesterday`,
      body: `You can still repair it before midnight (${STREAK_REPAIR_GEMS} gems).`,
      data: { type: "streak-repair" },
    });
  }
  const ids = [...pending, ...repairable].map((u) => u._id);
  if (ids.length) await User.updateMany({ _id: { $in: ids } }, { $set: { lastReminderDay: today } });
  return { pending: pending.length, repairable: repairable.length };
}
