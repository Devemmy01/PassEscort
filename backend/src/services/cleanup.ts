import { MASTERY_WINDOW } from "../../../shared/mastery";
import Attempt from "../models/Attempt";
import PracticeSession from "../models/PracticeSession";
import User from "../models/User";

/**
 * Keeps the database small enough for MongoDB Atlas's free tier (512 MB)
 * without losing anything the app still reads. Run nightly (scripts/cleanupData.ts).
 *
 * Every answer is kept for KEEP_RECENT_DAYS. The sync uses recent answers to
 * ignore an outbox batch the phone re-sends after a lost response, to award
 * XP once per question per day, and to count a session's answers when it
 * completes. After that window a student keeps only their newest
 * MASTERY_WINDOW answers per subject, which is all mastery reads. Totals,
 * streaks, badges and leaderboards live on the user document and are
 * untouched; payments, commissions and payouts are never deleted.
 */
// Matches the sync's own limit (practice.ts MAX_AGE_MS): answers dated earlier are treated as 30 days old.
export const KEEP_RECENT_DAYS = 30;
/** Practice sessions are small; kept long enough for any offline answers that reference them to sync. */
export const KEEP_SESSIONS_DAYS = 120;

const DAY_MS = 24 * 60 * 60 * 1000;

export interface CleanupResult {
  users: number;
  attemptsDeleted: number;
  sessionsDeleted: number;
}

export async function cleanupOldData(now = new Date()): Promise<CleanupResult> {
  const attemptCutoff = new Date(now.getTime() - KEEP_RECENT_DAYS * DAY_MS);
  const sessionCutoff = new Date(now.getTime() - KEEP_SESSIONS_DAYS * DAY_MS);
  const result: CleanupResult = { users: 0, attemptsDeleted: 0, sessionsDeleted: 0 };

  // Accounts newer than the window can't have anything old. Each query below
  // starts with the user, so it runs on the existing (user, …) indexes.
  const users = User.find({ createdAt: { $lt: attemptCutoff } }, { _id: 1 }).lean().cursor();
  for await (const u of users) {
    result.users += 1;
    for (const subject of await Attempt.distinct("subject", { user: u._id, answeredAt: { $lt: attemptCutoff } })) {
      const keep = await Attempt.find({ user: u._id, subject, selectedKey: { $ne: null } }, { _id: 1 })
        .sort({ answeredAt: -1, _id: -1 })
        .limit(MASTERY_WINDOW)
        .lean();
      const r = await Attempt.deleteMany({ user: u._id, subject, answeredAt: { $lt: attemptCutoff }, _id: { $nin: keep.map((k) => k._id) } });
      result.attemptsDeleted += r.deletedCount;
    }
    const s = await PracticeSession.deleteMany({ user: u._id, startedAt: { $lt: sessionCutoff } });
    result.sessionsDeleted += s.deletedCount;
  }
  return result;
}
