import { Router } from "express";
import { Types } from "mongoose";
import { z } from "zod";
import type { ActivityDTO, LeaderboardDTO, LeaderboardEntry, LeaderboardScope } from "../../../shared/api";
import { dayKey, weekKey } from "../../../shared/clock";
import { shortName, weekResetsAt } from "../../../shared/leaderboard";
import { levelFromXp } from "../../../shared/levels";
import { dailyGoalQuestions, streakView } from "../../../shared/streak";
import { parse } from "../lib/http";
import { identity, requireAuth, type AuthedRequest } from "../middleware/auth";
import Duel from "../models/Duel";
import User, { type UserDocument } from "../models/User";
import { getOrCreateUser } from "../services/users";

const router = Router();
router.use(requireAuth);

const TOP = 50;

/** Students connected to `user`: who they invited, who invited them, and their recent human duel opponents. */
async function friendIds(user: UserDocument): Promise<Types.ObjectId[]> {
  const ids = new Set<string>([String(user._id)]);
  if (user.referredByUser) ids.add(String(user.referredByUser));
  for (const f of await User.find({ referredByUser: user._id }, { _id: 1 }).lean()) ids.add(String(f._id));
  const duels = await Duel.find({ "players.user": user._id }, { players: 1 }).sort({ endedAt: -1 }).limit(50).lean();
  for (const d of duels) for (const p of d.players) if (p.user && !p.bot) ids.add(String(p.user));
  return [...ids].map((id) => new Types.ObjectId(id));
}

router.get("/", async (req: AuthedRequest, res) => {
  const { scope } = parse(z.object({ scope: z.enum(["week", "all", "friends"]).default("week") }), req.query);
  const me = await getOrCreateUser(identity(req));
  const now = new Date();
  const week = weekKey(now);
  const weekly = scope === "week" || scope === "friends";
  const field = weekly ? "weekXp" : "xp";
  const filter: Record<string, unknown> = weekly ? { weekKey: week, weekXp: { $gt: 0 } } : { xp: { $gt: 0 } };
  if (scope === "friends") filter._id = { $in: await friendIds(me) };

  const top = await User.find(filter, { name: 1, xp: 1, weekXp: 1 }).sort({ [field]: -1, _id: 1 }).limit(TOP).lean();
  const myScore = weekly ? (me.weekKey === week ? me.weekXp : 0) : me.xp;
  const entries: LeaderboardEntry[] = top.map((u, i) => ({
    rank: i + 1,
    name: shortName(u.name),
    level: levelFromXp(u.xp).level,
    xp: weekly ? u.weekXp : u.xp,
    me: String(u._id) === String(me._id),
  }));
  let mine: LeaderboardEntry | null = null;
  if (!entries.some((e) => e.me) && myScore > 0) {
    const ahead = await User.countDocuments({ ...filter, [field]: { $gt: myScore } });
    mine = { rank: ahead + 1, name: shortName(me.name), level: levelFromXp(me.xp).level, xp: myScore, me: true };
  }
  const body: LeaderboardDTO = { scope: scope as LeaderboardScope, week, resetsAt: weekResetsAt(now).toISOString(), entries, me: mine };
  res.json(body);
});

/** Practice days for the streak calendar. */
router.get("/activity", async (req: AuthedRequest, res) => {
  const me = await getOrCreateUser(identity(req));
  const view = streakView(me.streak, dayKey(new Date()));
  const body: ActivityDTO = {
    days: me.activity.map((a) => ({ day: a.day, answered: a.answered })),
    streak: { days: view.days, best: me.streak.best, state: view.state },
    goalQuestions: dailyGoalQuestions(me.dailyMinutes),
  };
  res.json(body);
});

export default router;
