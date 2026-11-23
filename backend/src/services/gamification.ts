import { dayKey, monthKey } from "../../../shared/clock";
import { STREAK_REPAIR_GEMS } from "../../../shared/pricing";
import { repairStreak } from "../../../shared/streak";
import { badRequest } from "../lib/http";
import { withLock } from "../lib/lock";
import User, { type UserDocument } from "../models/User";
import { awardBadges, freeRepairsLeft } from "./users";

/** Repair a broken streak within its 48-hour window (gems, or a Monthly plan's included repair). */
export async function repair(userId: string, method: "gems" | "plan", now = new Date()): Promise<UserDocument> {
  return withLock(userId, async () => {
    const user = (await User.findById(userId))!;
    const fixed = repairStreak(user.streak, dayKey(now));
    if (!fixed) throw badRequest("not_repairable", "There's no broken streak to repair right now.");
    if (method === "plan") {
      if (freeRepairsLeft(user, now) <= 0) throw badRequest("no_free_repairs", "No included repairs left this month.");
      const month = monthKey(now);
      user.freeRepairsUsed = user.freeRepairsMonth === month ? user.freeRepairsUsed + 1 : 1;
      user.freeRepairsMonth = month;
    } else {
      if (user.gems < STREAK_REPAIR_GEMS) throw badRequest("not_enough_gems", `You need ${STREAK_REPAIR_GEMS} gems.`);
      user.gems -= STREAK_REPAIR_GEMS;
    }
    user.streak = fixed;
    user.stats.streakRepairs += 1;
    awardBadges(user, now);
    await user.save();
    return user;
  });
}
