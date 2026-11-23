import type { EntitlementDTO, MeDTO } from "../../../shared/api";
import { badgeProgress, earnedBadges, type BadgeStats } from "../../../shared/badges";
import { addDays, dayKey, monthKey, weekKey } from "../../../shared/clock";
import { levelFromXp } from "../../../shared/levels";
import { FREE_AI_EXPLAINS_PER_DAY, MONTHLY_FREE_REPAIRS, type PlanId } from "../../../shared/pricing";
import { personalCode } from "../../../shared/referral";
import { dailyGoalQuestions, streakView } from "../../../shared/streak";
import { randomSeed } from "../lib/codes";
import type { AuthIdentity } from "../middleware/auth";
import User, { type UserDocument } from "../models/User";

/** The signed-in student's profile, created on first sign-in. */
export async function getOrCreateUser(id: AuthIdentity): Promise<UserDocument> {
  const existing = await User.findOne({ firebaseUid: id.uid });
  if (existing) {
    // Firebase owns email + verification; keep our copy current.
    if ((id.email && existing.email !== id.email) || existing.emailVerified !== id.emailVerified) {
      existing.email = id.email || existing.email;
      existing.emailVerified = id.emailVerified;
      await existing.save();
    }
    return existing;
  }
  for (let attempt = 0; attempt < 8; attempt++) {
    try {
      return await User.create({
        firebaseUid: id.uid,
        email: id.email,
        emailVerified: id.emailVerified,
        name: id.name ?? "",
        referralCode: personalCode(id.name ?? id.email.split("@")[0] ?? "", randomSeed()),
      });
    } catch (e) {
      if (!isDuplicateKey(e)) throw e;
      const raced = await User.findOne({ firebaseUid: id.uid });
      if (raced) return raced; // two first requests at once
      // otherwise the referral code collided — try another suffix
    }
  }
  throw new Error("Could not allocate a referral code");
}

export function isDuplicateKey(e: unknown): boolean {
  return Boolean(e && typeof e === "object" && "code" in e && (e as { code: number }).code === 11000);
}

/** Plan in force right now (an expired plan is free). */
export function activePlan(user: UserDocument, now: Date): PlanId {
  if (user.plan === "free" || !user.planExpiresAt || user.planExpiresAt <= now) return "free";
  return user.plan;
}

export function aiUsedToday(user: UserDocument, now: Date): number {
  return user.aiDay === dayKey(now) ? user.aiUsed : 0;
}

export function freeRepairsLeft(user: UserDocument, now: Date): number {
  if (activePlan(user, now) !== "monthly") return 0;
  const used = user.freeRepairsMonth === monthKey(now) ? user.freeRepairsUsed : 0;
  return Math.max(0, MONTHLY_FREE_REPAIRS - used);
}

export function entitlement(user: UserDocument, now: Date): EntitlementDTO {
  const plan = activePlan(user, now);
  const used = aiUsedToday(user, now);
  return {
    plan,
    expiresAt: plan === "free" ? null : user.planExpiresAt!.toISOString(),
    aiExplainsUsedToday: used,
    aiExplainsLeft: plan === "free" ? Math.max(0, FREE_AI_EXPLAINS_PER_DAY - used) : null,
    freeRepairsLeft: freeRepairsLeft(user, now),
  };
}

export function badgeStats(user: UserDocument): BadgeStats {
  const s = user.stats;
  return {
    sessionsCompleted: s.sessionsCompleted,
    questionsAnswered: s.questionsAnswered,
    bestCorrectRun: s.bestCorrectRun,
    fastSprints: s.fastSprints,
    perfectSprints: s.perfectSprints,
    bestStreak: user.streak.best,
    streakRepairs: s.streakRepairs,
    earlyDays: s.earlyDays,
    nightDays: s.nightDays,
    duelsWon: s.duelsWon,
    mastery: Object.fromEntries(user.mastery ?? new Map()),
    subjects: user.subjects,
    friendsJoined: s.friendsJoined,
    shares: s.shares,
  };
}

/** Award any newly earned badges; returns their ids. */
export function awardBadges(user: UserDocument, now: Date): string[] {
  const have = new Set(user.badges.map((b) => b.id));
  const fresh = earnedBadges(badgeStats(user)).filter((id) => !have.has(id));
  for (const id of fresh) user.badges.push({ id, earnedAt: now });
  return fresh;
}

export function answeredOn(user: UserDocument, day: string): number {
  return user.activity.find((a) => a.day === day)?.answered ?? 0;
}

export function buildMe(user: UserDocument, now = new Date()): MeDTO {
  const today = dayKey(now);
  const view = streakView(user.streak, today);
  return {
    profile: {
      name: user.name,
      email: user.email,
      emailVerified: user.emailVerified,
      exams: user.exams,
      subjects: user.subjects,
      dailyMinutes: user.dailyMinutes,
      referralCode: user.referralCode,
      referredBy: user.referredByCode,
      onboarded: user.onboarded,
      notify: { reminders: user.notify?.reminders !== false, duels: user.notify?.duels !== false, social: user.notify?.social !== false },
    },
    progress: {
      totalXp: user.xp,
      level: levelFromXp(user.xp),
      streak: { ...view, best: user.streak.best },
      gems: user.gems,
      questionsAnswered: user.stats.questionsAnswered,
      correctAnswers: user.stats.correctAnswers,
      todayAnswered: answeredOn(user, today),
      goalQuestions: dailyGoalQuestions(user.dailyMinutes),
      sessionsCompleted: user.stats.sessionsCompleted,
      duelsWon: user.stats.duelsWon,
      duelsLost: user.stats.duelsLost,
      duelsDrawn: user.stats.duelsDrawn,
      earnedBadges: user.badges.map((b) => b.id),
      badgeProgress: badgeProgress(badgeStats(user)),
      mastery: Object.fromEntries(user.mastery ?? new Map()),
      week: Array.from({ length: 7 }, (_, i) => answeredOn(user, addDays(today, i - 6))),
    },
    entitlement: entitlement(user, now),
    isAmbassador: Boolean(user.ambassador),
  };
}

/** Every XP award goes through here so the weekly leaderboard stays in step with total XP. */
export function addXp(user: UserDocument, amount: number, now: Date): void {
  if (amount <= 0) return;
  const week = weekKey(now);
  if (user.weekKey !== week) {
    user.weekKey = week;
    user.weekXp = 0;
  }
  user.xp += amount;
  user.weekXp += amount;
}
