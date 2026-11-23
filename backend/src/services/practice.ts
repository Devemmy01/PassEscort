/**
 * Practice sync — the server side of the app's offline outbox (PRD §6: the
 * server is the source of truth for anything that affects scores).
 *
 * The app answers questions offline against its on-device bank and queues
 * sessions + attempts. Here, the server re-marks every answer against its own
 * answer key and computes XP, combos, completion bonuses, streaks, daily goal,
 * mastery and badges. A tampered client can only send *answers*, never scores.
 *
 * Abuse guards:
 * - attempts are idempotent (client ids), so outbox retries never double-count;
 * - a question earns XP at most once per WAT day;
 * - timestamps are clamped to [now − 30 days, now];
 * - completion XP/streak need real answers in the session (≥ 5, or all of a shorter set).
 */
import type { SyncRequest, SyncResponse } from "../../../shared/api";
import { dayKey, watHour } from "../../../shared/clock";
import { levelFromXp, XP_RULES, xpForAnswer } from "../../../shared/levels";
import { mastery as masteryOf } from "../../../shared/mastery";
import { AMBASSADOR_RULES } from "../../../shared/referral";
import { completeSessionStreak, dailyGoalQuestions } from "../../../shared/streak";
import { withLock } from "../lib/lock";
import Attempt, { type AttemptDoc } from "../models/Attempt";
import PracticeSession from "../models/PracticeSession";
import Question from "../models/Question";
import User, { type UserDocument } from "../models/User";
import { notify } from "./push";
import { addXp, answeredOn, awardBadges, buildMe } from "./users";

const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const MIN_ANSWERS_FOR_COMPLETION = 5;
const FAST_SPRINT_SECONDS_LEFT = 5 * 60;
const CBT_SPRINT_SIZE = 40;

function clampTime(iso: string, now: Date): Date {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return now;
  return new Date(Math.min(now.getTime(), Math.max(now.getTime() - MAX_AGE_MS, t)));
}

function bumpActivity(user: UserDocument, day: string): void {
  const entry = user.activity.find((a) => a.day === day);
  if (entry) entry.answered += 1;
  else {
    user.activity.push({ day, answered: 1 });
    user.activity.sort((a, b) => a.day.localeCompare(b.day));
    // 120 days: enough for the streak calendar's current and previous months.
    while (user.activity.length > 120) user.activity.shift();
  }
}

export async function syncPractice(userId: string, req: SyncRequest, now = new Date()): Promise<SyncResponse> {
  const deferred: (() => Promise<void>)[] = [];
  const response = await withLock(userId, async () => {
    const user = await User.findById(userId);
    if (!user) throw new Error("user vanished during sync");
    const levelBefore = levelFromXp(user.xp).level;
    let xpAwarded = 0;

    /* 1. Sessions: create, or mark completed. */
    const acceptedSessions: string[] = [];
    for (const s of req.sessions) {
      const existing = await PracticeSession.findOne({ user: user._id, clientId: s.id });
      if (!existing) {
        await PracticeSession.create({
          user: user._id,
          clientId: s.id,
          mode: s.mode,
          subject: s.subject,
          examBody: s.examBody,
          startedAt: clampTime(s.startedAt, now),
          completedAt: s.completedAt ? clampTime(s.completedAt, now) : null,
          questionCount: s.questionCount,
          secondsAllowed: s.secondsAllowed ?? null,
          secondsUsed: s.secondsUsed ?? null,
        });
      } else if (s.completedAt && !existing.completedAt) {
        existing.completedAt = clampTime(s.completedAt, now);
        existing.secondsUsed = s.secondsUsed ?? existing.secondsUsed;
        await existing.save();
      }
      acceptedSessions.push(s.id);
    }

    /* 2. Attempts: re-mark against the server's answer key. */
    const attempts = [...req.attempts].sort((a, b) => Date.parse(a.answeredAt) - Date.parse(b.answeredAt));
    const ids = attempts.map((a) => a.id);
    const already = new Map((await Attempt.find({ user: user._id, clientId: { $in: ids } }).lean()).map((a) => [a.clientId, a]));
    const sessionIds = new Set(
      (await PracticeSession.find({ user: user._id, clientId: { $in: [...new Set(attempts.map((a) => a.sessionId))] } }, { clientId: 1 }).lean()).map((s) => s.clientId),
    );
    const questions = new Map((await Question.find({ _id: { $in: [...new Set(attempts.map((a) => a.questionId))] } }).lean()).map((q) => [q._id, q]));

    // Questions that already earned XP today (or earlier in this batch) don't earn it again.
    const days = [...new Set(attempts.map((a) => dayKey(clampTime(a.answeredAt, now))))];
    const earned = new Set(
      (await Attempt.find({ user: user._id, question: { $in: [...questions.keys()] }, day: { $in: days }, xp: { $gt: 0 } }, { question: 1, day: 1 }).lean()).map(
        (a) => `${a.question}|${a.day}`,
      ),
    );

    const fresh: AttemptDoc[] = [];
    const results: SyncResponse["results"] = [];
    const acceptedAttempts: string[] = [];
    const touchedSubjects = new Set<string>();
    for (const a of attempts) {
      const prior = already.get(a.id);
      if (prior) {
        results.push({ id: a.id, correct: prior.correct, xp: prior.xp });
        acceptedAttempts.push(a.id);
        continue;
      }
      const q = questions.get(a.questionId);
      if (!q || !sessionIds.has(a.sessionId)) {
        // Unknown question/session can't be scored. Accept it so the outbox doesn't retry forever.
        results.push({ id: a.id, correct: false, xp: 0 });
        acceptedAttempts.push(a.id);
        continue;
      }
      const at = clampTime(a.answeredAt, now);
      const day = dayKey(at);
      // Mark by the option's text when sent: an app built before the options were reordered still scores right.
      const byText = a.selectedText ? q.options.find((o) => o.text === a.selectedText) : undefined;
      const selectedKey = a.selectedKey === null ? null : (byText?.key ?? a.selectedKey);
      const answered = selectedKey !== null;
      const correct = answered && selectedKey === q.answerKey;
      let xp = 0;
      if (answered) {
        user.stats.questionsAnswered += 1;
        bumpActivity(user, day);
        touchedSubjects.add(q.subject);
        if (correct) {
          user.stats.correctAnswers += 1;
          user.stats.currentRun += 1;
          user.stats.bestCorrectRun = Math.max(user.stats.bestCorrectRun, user.stats.currentRun);
          const key = `${q._id}|${day}`;
          if (!earned.has(key)) {
            xp = xpForAnswer(true, q.difficulty, user.stats.currentRun);
            earned.add(key);
          }
        } else {
          user.stats.currentRun = 0;
        }
      }
      xpAwarded += xp;
      fresh.push({
        user: user._id,
        clientId: a.id,
        session: a.sessionId,
        question: q._id,
        subject: q.subject,
        difficulty: q.difficulty,
        selectedKey,
        correct,
        xp,
        answeredAt: at,
        day,
      });
      results.push({ id: a.id, correct, xp });
      acceptedAttempts.push(a.id);
    }
    if (fresh.length) await Attempt.insertMany(fresh, { ordered: false });

    /* 3. Completed sessions: completion XP, streak, sprint badges, referral reward. */
    const completed = await PracticeSession.find({ user: user._id, clientId: { $in: acceptedSessions }, completedAt: { $ne: null }, completionAwarded: false });
    for (const s of completed) {
      const answered = await Attempt.countDocuments({ user: user._id, session: s.clientId, selectedKey: { $ne: null } });
      s.completionAwarded = true;
      await s.save();
      if (answered < Math.min(MIN_ANSWERS_FOR_COMPLETION, s.questionCount)) continue;

      xpAwarded += XP_RULES.sprintComplete;
      user.stats.sessionsCompleted += 1;
      const at = s.completedAt!;
      const day = dayKey(at);
      if (!user.streak.lastActiveDay || day >= user.streak.lastActiveDay) {
        user.streak = completeSessionStreak(user.streak, day).streak;
      }
      const hour = watHour(at);
      if (hour < 7 && user.stats.lastEarlyDay !== day) {
        user.stats.earlyDays += 1;
        user.stats.lastEarlyDay = day;
      }
      if (hour >= 22 && user.stats.lastNightDay !== day) {
        user.stats.nightDays += 1;
        user.stats.lastNightDay = day;
      }
      if (s.mode === "cbt" && s.questionCount >= CBT_SPRINT_SIZE) {
        const correct = await Attempt.countDocuments({ user: user._id, session: s.clientId, correct: true });
        if (correct >= s.questionCount) user.stats.perfectSprints += 1;
        if (s.secondsAllowed != null && s.secondsUsed != null && s.secondsAllowed - s.secondsUsed >= FAST_SPRINT_SECONDS_LEFT) user.stats.fastSprints += 1;
      }
      if (user.referredByUser && !user.referralRewarded) {
        user.referralRewarded = true;
        user.gems += AMBASSADOR_RULES.inviteGems;
        const referrerId = String(user.referredByUser);
        const friend = user.name.split(" ")[0] || "A friend";
        deferred.push(() => rewardReferrer(referrerId, now));
        deferred.push(async () => {
          await notify([referrerId], "social", {
            title: `${friend} joined with your code 🎉`,
            body: `You both got ${AMBASSADOR_RULES.inviteGems} gems. Challenge them to a duel!`,
            data: { type: "referral" },
          });
        });
      }
    }

    /* 4. Daily goal bonus, once per day. */
    const today = dayKey(now);
    if (user.dailyGoalDay !== today && answeredOn(user, today) >= dailyGoalQuestions(user.dailyMinutes)) {
      user.dailyGoalDay = today;
      xpAwarded += XP_RULES.dailyGoal;
    }

    /* 5. Mastery for the subjects practised. */
    for (const subject of touchedSubjects) {
      const recent = await Attempt.find({ user: user._id, subject, selectedKey: { $ne: null } }, { correct: 1, difficulty: 1, answeredAt: 1 })
        .sort({ answeredAt: -1 })
        .limit(50)
        .lean();
      user.mastery.set(subject, masteryOf(recent.reverse()));
    }

    user.stats.shares += Math.min(Math.max(0, Math.floor(req.shares ?? 0)), 20);
    addXp(user, xpAwarded, now);
    const newBadges = awardBadges(user, now);
    await user.save();

    const levelAfter = levelFromXp(user.xp).level;
    const levelUps = Array.from({ length: Math.max(0, levelAfter - levelBefore) }, (_, i) => levelBefore + i + 1);
    return { acceptedAttempts, acceptedSessions, results, xpAwarded, levelUps, newBadges, me: buildMe(user, now) };
  });
  // Touch other students only after releasing this one's lock.
  for (const task of deferred) await task();
  return response;
}

/** The friend who invited this student gets their gems and Recruiter progress. */
async function rewardReferrer(referrerId: string, now: Date): Promise<void> {
  await withLock(referrerId, async () => {
    const referrer = await User.findById(referrerId);
    if (!referrer) return;
    referrer.gems += AMBASSADOR_RULES.inviteGems;
    referrer.stats.friendsJoined += 1;
    awardBadges(referrer, now);
    await referrer.save();
  });
}
