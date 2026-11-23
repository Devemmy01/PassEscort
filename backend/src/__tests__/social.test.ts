import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { io as connect, type Socket } from "socket.io-client";
import type { DuelClientEvents, DuelServerEvents } from "../../../shared/duel";
import type { LeaderboardDTO, MeDTO } from "../../../shared/api";
import { addDays, dayKey } from "../../../shared/clock";
import ExplanationModel from "../models/Explanation";
import Question from "../models/Question";
import User from "../models/User";
import { pushLog } from "../services/push";
import { sendStreakReminders } from "../services/reminders";
import { startStack, uid, type Stack } from "./harness";

let s: Stack;
before(async () => {
  s = await startStack();
});
after(async () => {
  await s?.stop();
});

const token = (n: string) => `ExponentPushToken[${n}xxxxxxxxxxxx]`;

async function practise(user: string, n = 5, subject = "Mathematics") {
  const qs = await Question.find({ subject, examBody: "JAMB" }).sort({ _id: 1 }).limit(n).lean();
  const sessionId = uid("s");
  const at = new Date().toISOString();
  return s.api
    .post("/practice/sync")
    .set(s.auth(user))
    .send({
      sessions: [{ id: sessionId, mode: "objective", subject, examBody: "JAMB", startedAt: at, completedAt: at, questionCount: qs.length }],
      attempts: qs.map((q, i) => ({ id: `${sessionId}-${i}`, sessionId, questionId: q._id, selectedKey: q.answerKey, answeredAt: at })),
    })
    .expect(200);
}

describe("leaderboards & streak calendar", () => {
  test("weekly and all-time boards rank by XP; names are shortened; you always see your rank", async () => {
    const a = uid("lb");
    const b = uid("lb");
    await s.api.patch("/users/me").set(s.auth(a)).send({ name: "Amaka Nwosu" });
    await s.api.patch("/users/me").set(s.auth(b)).send({ name: "Bola Ade" });
    await practise(a, 10);
    await practise(b, 5);
    const week = (await s.api.get("/leaderboard?scope=week").set(s.auth(b)).expect(200)).body as LeaderboardDTO;
    const ia = week.entries.findIndex((e) => e.name === "Amaka N.");
    const ib = week.entries.findIndex((e) => e.name === "Bola A." && e.me);
    assert.ok(ia >= 0 && ib > ia, "more XP ranks higher");
    assert.match(week.week, /^\d{4}-W\d{2}$/);
    assert.ok(Date.parse(week.resetsAt) > Date.now());
    const all = (await s.api.get("/leaderboard?scope=all").set(s.auth(a)).expect(200)).body as LeaderboardDTO;
    assert.ok(all.entries.some((e) => e.me));
    // Push b out of the top 50 of a fresh board: their own row still comes back.
    await User.updateMany({ firebaseUid: { $ne: b } }, { $set: { xp: 1_000_000 } });
    const many = Array.from({ length: 55 }, (_, i) => ({ firebaseUid: uid("bulk"), referralCode: `BULK${i}XX${Date.now() % 1000}`, name: `Bulk ${i}`, xp: 900_000 + i }));
    await User.insertMany(many);
    const ranked = (await s.api.get("/leaderboard?scope=all").set(s.auth(b)).expect(200)).body as LeaderboardDTO;
    assert.equal(ranked.entries.length, 50);
    assert.ok(ranked.me && ranked.me.rank > 50 && ranked.me.me);
  });

  test("friends board: people linked by codes", async () => {
    const host = uid("fh");
    const friend = uid("ff");
    const stranger = uid("fs");
    const me = (await s.api.get("/users/me").set(s.auth(host)).expect(200)).body as MeDTO;
    await s.api.get("/users/me").set(s.auth(friend));
    await s.api.post("/referrals/redeem").set(s.auth(friend)).send({ code: me.profile.referralCode }).expect(200);
    for (const u of [host, friend, stranger]) await practise(u, 5, "Physics");
    const board = (await s.api.get("/leaderboard?scope=friends").set(s.auth(host)).expect(200)).body as LeaderboardDTO;
    assert.equal(board.entries.length, 2, "you and the friend, not the stranger");
  });

  test("activity: practice days for the calendar", async () => {
    const u = uid("cal");
    await practise(u, 5);
    const act = (await s.api.get("/leaderboard/activity").set(s.auth(u)).expect(200)).body;
    assert.deepEqual(act.days, [{ day: dayKey(new Date()), answered: 5 }]);
    assert.equal(act.streak.state, "active");
  });
});

describe("push notifications", () => {
  test("a device token belongs to whoever signed in on it last; preferences are saved", async () => {
    const a = uid("pa");
    const b = uid("pb");
    await s.api.post("/users/me/push-token").set(s.auth(a)).send({ token: token("shared"), platform: "android" }).expect(204);
    await s.api.post("/users/me/push-token").set(s.auth(b)).send({ token: token("shared"), platform: "android" }).expect(204);
    assert.equal((await User.findOne({ firebaseUid: a }))!.pushTokens.length, 0);
    assert.equal((await User.findOne({ firebaseUid: b }))!.pushTokens.length, 1);
    const me = (await s.api.patch("/users/me").set(s.auth(b)).send({ notify: { reminders: false } }).expect(200)).body as MeDTO;
    assert.deepEqual(me.profile.notify, { reminders: false, duels: true, social: true });
    await s.api.delete("/users/me/push-token").set(s.auth(b)).send({ token: token("shared") }).expect(204);
    assert.equal((await User.findOne({ firebaseUid: b }))!.pushTokens.length, 0);
    await s.api.post("/users/me/push-token").set(s.auth(b)).send({ token: "short", platform: "android" }).expect(400);
  });

  test("evening reminders: streaks ending tonight and repairable ones, once a day, respecting opt-outs", async () => {
    const today = dayKey(new Date());
    const mk = async (name: string, lastActiveDay: string, reminders = true) => {
      const u = uid(name);
      await s.api.post("/users/me/push-token").set(s.auth(u)).send({ token: token(u), platform: "android" }).expect(204);
      await User.updateOne({ firebaseUid: u }, { $set: { streak: { days: 6, best: 6, lastActiveDay }, "notify.reminders": reminders } });
      return u;
    };
    const ending = await mk("rem-end", addDays(today, -1));
    const broken = await mk("rem-brk", addDays(today, -2));
    const optedOut = await mk("rem-off", addDays(today, -1), false);
    const safe = await mk("rem-ok", today);
    const evening = new Date(`${today}T19:00:00Z`); // 20:00 in Lagos
    pushLog.length = 0;
    assert.deepEqual(await sendStreakReminders(new Date(`${today}T08:00:00Z`)), { pending: 0, repairable: 0 }, "not in the morning");
    const r = await sendStreakReminders(evening);
    const sentTo = new Set(pushLog.map((p) => p.token));
    assert.ok(sentTo.has(token(ending)) && sentTo.has(token(broken)));
    assert.ok(!sentTo.has(token(optedOut)) && !sentTo.has(token(safe)));
    assert.ok(r.pending >= 1 && r.repairable >= 1);
    assert.match(pushLog.find((p) => p.token === token(ending))!.message.title, /6-day streak ends at midnight/);
    pushLog.length = 0;
    await sendStreakReminders(evening);
    assert.ok(!pushLog.some((p) => p.token === token(ending)), "only once a day");
  });

  test("referral: the inviter is told when a friend joins", async () => {
    const inviter = uid("ri");
    const me = (await s.api.get("/users/me").set(s.auth(inviter)).expect(200)).body as MeDTO;
    await s.api.post("/users/me/push-token").set(s.auth(inviter)).send({ token: token(inviter), platform: "ios" }).expect(204);
    const friend = uid("rf");
    await s.api.patch("/users/me").set(s.auth(friend)).send({ name: "Kemi Ola" });
    await s.api.post("/referrals/redeem").set(s.auth(friend)).send({ code: me.profile.referralCode }).expect(200);
    pushLog.length = 0;
    await practise(friend);
    const msg = pushLog.find((p) => p.token === token(inviter));
    assert.ok(msg);
    assert.match(msg.message.title, /Kemi joined with your code/);
    assert.equal(msg.message.data.type, "referral");
  });

  test("duel link: a friend accepting while the host is away pushes the host", { timeout: 20_000 }, async () => {
    const host = uid("dh");
    const guest = uid("dg");
    await s.api.patch("/users/me").set(s.auth(guest)).send({ name: "Tunde Bakare" });
    await s.api.post("/users/me/push-token").set(s.auth(host)).send({ token: token(host), platform: "android" }).expect(204);
    const inv = await s.api.post("/duels/invites").set(s.auth(host)).send({ subject: "Biology" }).expect(201);
    pushLog.length = 0;
    const c: Socket<DuelServerEvents, DuelClientEvents> = connect(`http://127.0.0.1:${s.port}/duels`, { auth: { token: `dev:${guest}` }, transports: ["websocket"], forceNew: true, reconnection: false });
    const waiting = new Promise((r) => c.once("match:waiting", r));
    c.emit("invite:join", { code: inv.body.code });
    await waiting;
    await new Promise((r) => setTimeout(r, 200));
    c.close();
    const msg = pushLog.find((p) => p.token === token(host));
    assert.ok(msg);
    assert.match(msg.message.title, /Tunde accepted your Biology duel/);
    assert.deepEqual(msg.message.data, { type: "duel-invite", code: inv.body.code, subject: "Biology" });
  });
});

describe("AI pre-generation", () => {
  test("fills the cache in a resumable batch", async () => {
    const { pregenerate } = await import("../scripts/pregenerateExplanations");
    const before = await ExplanationModel.countDocuments();
    const r = await pregenerate({ limit: 5, subject: "Economics", delayMs: 0, log: () => undefined });
    assert.equal(r.made, 5);
    assert.equal((await ExplanationModel.countDocuments()) - before, 5);
    const again = await pregenerate({ limit: 5, subject: "Economics", delayMs: 0, log: () => undefined });
    assert.equal(again.made, 5, "the next batch, not the same five");
    assert.equal(again.left, r.left - 5);
  });
});

describe("nightly cleanup (free-tier storage)", () => {
  test("keeps 30 days of answers, then the newest 50 per subject; drops sessions after 120 days", async () => {
    const { default: Attempt } = await import("../models/Attempt");
    const { default: PracticeSession } = await import("../models/PracticeSession");
    const { cleanupOldData } = await import("../services/cleanup");
    const now = new Date("2026-11-23T12:00:00Z");
    const daysAgo = (d: number, minutes = 0) => new Date(now.getTime() - d * 86_400_000 - minutes * 60_000);

    const veteran = uid("old");
    await s.api.get("/users/me").set(s.auth(veteran)).expect(200);
    const u = (await User.findOne({ firebaseUid: veteran }))!;
    await User.collection.updateOne({ _id: u._id }, { $set: { createdAt: daysAgo(400) } });
    const newcomer = uid("new");
    await s.api.get("/users/me").set(s.auth(newcomer)).expect(200);
    const n = (await User.findOne({ firebaseUid: newcomer }))!;

    const row = (user: typeof u._id, subject: string, at: Date, i: number, answered = true) => ({
      user, clientId: `${subject}-${i}-${at.getTime()}`, session: "s", question: `q${i}`, subject, difficulty: "medium" as const,
      selectedKey: answered ? "A" : null, correct: answered && i % 2 === 0, xp: 0, answeredAt: at, day: dayKey(at),
    });
    await Attempt.insertMany([
      ...Array.from({ length: 120 }, (_, i) => row(u._id, "Physics", daysAgo(40, i), i)), // old, answered
      ...Array.from({ length: 10 }, (_, i) => row(u._id, "Physics", daysAgo(35, i), 500 + i, false)), // old, skipped
      ...Array.from({ length: 20 }, (_, i) => row(u._id, "Physics", daysAgo(5, i), 900 + i)), // recent
      ...Array.from({ length: 30 }, (_, i) => row(u._id, "Chemistry", daysAgo(60, i), i)), // old, under 50
      ...Array.from({ length: 5 }, (_, i) => row(n._id, "Physics", daysAgo(45, i), i)), // newcomer's (backdated) answers
    ]);
    const masteryInput = async () =>
      (await Attempt.find({ user: u._id, subject: "Physics", selectedKey: { $ne: null } }).sort({ answeredAt: -1, _id: -1 }).limit(50).lean()).map((a) => String(a._id));
    const before = await masteryInput();
    await PracticeSession.create([
      { user: u._id, clientId: "ancient", mode: "objective", subject: "Physics", examBody: "JAMB", startedAt: daysAgo(150), questionCount: 10 },
      { user: u._id, clientId: "recent", mode: "objective", subject: "Physics", examBody: "JAMB", startedAt: daysAgo(10), questionCount: 10 },
    ]);

    const r = await cleanupOldData(now);
    assert.equal(r.attemptsDeleted, 100, "120 + 10 old Physics answers, minus the 30 needed to make the newest 50");
    assert.equal(r.sessionsDeleted, 1);
    assert.equal(await Attempt.countDocuments({ user: u._id, subject: "Physics" }), 50);
    assert.equal(await Attempt.countDocuments({ user: u._id, subject: "Physics", answeredAt: { $gte: daysAgo(30) } }), 20, "recent answers all kept");
    assert.equal(await Attempt.countDocuments({ user: u._id, subject: "Physics", selectedKey: null }), 0, "old skipped answers go");
    assert.equal(await Attempt.countDocuments({ user: u._id, subject: "Chemistry" }), 30, "a subject under 50 answers is untouched");
    assert.deepEqual(await masteryInput(), before, "mastery reads exactly the same answers");
    assert.equal(await Attempt.countDocuments({ user: n._id }), 5, "accounts younger than 30 days are skipped");
    assert.deepEqual((await PracticeSession.find({ user: u._id }).lean()).map((x) => x.clientId), ["recent"]);

    const again = await cleanupOldData(now);
    assert.equal(again.attemptsDeleted + again.sessionsDeleted, 0, "a second run changes nothing");
  });
});
