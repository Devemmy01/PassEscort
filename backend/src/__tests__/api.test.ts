import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { after, before, describe, test } from "node:test";
import type { MeDTO, SyncResponse } from "../../../shared/api";
import { addDays, dayKey } from "../../../shared/clock";
import { XP_RULES } from "../../../shared/levels";
import { FREE_AI_EXPLAINS_PER_DAY, STREAK_REPAIR_GEMS } from "../../../shared/pricing";
import { AMBASSADOR_RULES } from "../../../shared/referral";
import type { ExamBody } from "../../../shared/types";
import { parseEnv } from "../config/env";
import Commission from "../models/Commission";
import Question from "../models/Question";
import User from "../models/User";
import { mockAccountNames } from "../services/paystack";
import { startStack, uid, type Stack } from "./harness";

let s: Stack;
before(async () => {
  s = await startStack();
});
after(async () => {
  await s?.stop();
});

async function questions(subject = "Mathematics", examBody: ExamBody = "JAMB", n = 10) {
  return Question.find({ subject, examBody }).sort({ _id: 1 }).limit(n).lean();
}

/** One practice session: answers the first `correct` right and the rest wrong. */
async function practise(user: string, opts: { n?: number; correct?: number; complete?: boolean; subject?: string; at?: Date; sessionId?: string } = {}) {
  const qs = await questions(opts.subject ?? "Mathematics", "JAMB", opts.n ?? 10);
  const at = opts.at ?? new Date();
  const sessionId = opts.sessionId ?? uid("s");
  const correct = opts.correct ?? qs.length;
  const body = {
    sessions: [
      {
        id: sessionId,
        mode: "objective",
        subject: opts.subject ?? "Mathematics",
        examBody: "JAMB",
        startedAt: at.toISOString(),
        ...(opts.complete === false ? {} : { completedAt: at.toISOString() }),
        questionCount: qs.length,
      },
    ],
    attempts: qs.map((q, i) => ({
      id: `${sessionId}-${i}`,
      sessionId,
      questionId: q._id,
      selectedKey: i < correct ? q.answerKey : q.options.find((o) => o.key !== q.answerKey)!.key,
      answeredAt: new Date(at.getTime() + i * 1000 - qs.length * 1000).toISOString(),
    })),
  };
  const res = await s.api.post("/practice/sync").set(s.auth(user)).send(body).expect(200);
  return { res: res.body as SyncResponse, body, qs };
}

describe("auth & profile", () => {
  test("browsers on other origins can read responses (CORS + CORP)", async () => {
    const r = await s.api.get("/health").set("Origin", "http://127.0.0.1:8765").expect(200);
    assert.equal(r.headers["cross-origin-resource-policy"], "cross-origin");
    assert.ok(r.headers["access-control-allow-origin"]);
  });

  test("health is public; everything else needs a token", async () => {
    await s.api.get("/health").expect(200);
    const r = await s.api.get("/users/me").expect(401);
    assert.equal(r.body.code, "missing_token");
    await s.api.get("/users/me").set({ Authorization: "Bearer nonsense" }).expect(401);
  });

  test("first call creates the profile with a personal code and 50 starting gems", async () => {
    const u = uid();
    const me = (await s.api.get("/users/me").set(s.auth(u)).expect(200)).body as MeDTO;
    assert.match(me.profile.referralCode, /^[A-Z]{2,6}[A-Z2-9]{2}$/);
    assert.equal(me.progress.gems, 50);
    assert.equal(me.progress.level.level, 1);
    assert.equal(me.entitlement.plan, "free");
    assert.equal(me.entitlement.aiExplainsLeft, FREE_AI_EXPLAINS_PER_DAY);
    assert.equal(me.profile.onboarded, false);
  });

  test("onboarding saves exams, subjects and daily target; bad input is a 400", async () => {
    const u = uid();
    const me = (
      await s.api
        .patch("/users/me")
        .set(s.auth(u))
        .send({ name: "Adaeze Okafor", exams: ["JAMB", "WAEC"], subjects: ["English", "Mathematics"], dailyMinutes: 20, onboarded: true })
        .expect(200)
    ).body as MeDTO;
    assert.deepEqual(me.profile.exams, ["JAMB", "WAEC"]);
    assert.equal(me.progress.goalQuestions, 25);
    assert.equal(me.profile.onboarded, true);
    const bad = await s.api.patch("/users/me").set(s.auth(u)).send({ exams: ["GCE"] }).expect(400);
    assert.equal(bad.body.code, "invalid_request");
  });
});

describe("practice sync (server is the source of truth)", () => {
  test("re-marks answers and awards XP, combo, completion and streak", async () => {
    const u = uid();
    const { res } = await practise(u, { n: 10, correct: 10 });
    const qs = await questions("Mathematics", "JAMB", 10);
    const perAnswer = qs.reduce((a, q, i) => a + XP_RULES.correct + (q.difficulty === "hard" ? XP_RULES.hardBonus : 0) + ((i + 1) % 5 === 0 ? XP_RULES.comboBonus : 0), 0);
    assert.equal(res.xpAwarded, perAnswer + XP_RULES.sprintComplete);
    assert.equal(res.me.progress.questionsAnswered, 10);
    assert.equal(res.me.progress.streak.days, 1);
    assert.equal(res.me.progress.streak.state, "active");
    assert.ok(res.newBadges.includes("first-steps"));
    assert.ok(res.levelUps.length >= 1, "a 10/10 first session levels up");
    assert.ok(res.me.progress.mastery.Mathematics! > 0.9);
  });

  test("a client can't award itself points: wrong answers earn nothing", async () => {
    const u = uid();
    const { res } = await practise(u, { n: 6, correct: 0 });
    assert.equal(res.xpAwarded, XP_RULES.sprintComplete);
    assert.ok(res.results.every((r) => !r.correct && r.xp === 0));
  });

  test("resending the outbox is a no-op, and a question earns XP once a day", async () => {
    const u = uid();
    const first = await practise(u, { n: 5 });
    const again = await s.api.post("/practice/sync").set(s.auth(u)).send(first.body).expect(200);
    assert.equal(again.body.xpAwarded, 0);
    assert.equal(again.body.me.progress.questionsAnswered, 5);
    const second = await practise(u, { n: 5 }); // same questions, new session, same day
    assert.equal(second.res.xpAwarded, XP_RULES.sprintComplete, "only the completion bonus");
  });

  test("completion needs real answers: an empty 'completed' session earns nothing", async () => {
    const u = uid();
    const r = await s.api
      .post("/practice/sync")
      .set(s.auth(u))
      .send({ sessions: [{ id: uid("s"), mode: "cbt", subject: "Physics", examBody: "JAMB", startedAt: new Date().toISOString(), completedAt: new Date().toISOString(), questionCount: 40 }], attempts: [] })
      .expect(200);
    assert.equal(r.body.xpAwarded, 0);
    assert.equal(r.body.me.progress.streak.days, 0);
  });

  test("streak: consecutive days grow it; a missed day breaks it and gems repair it", async () => {
    const u = uid();
    const today = new Date();
    await practise(u, { n: 5, at: new Date(today.getTime() - 3 * 86400000) });
    const r = await practise(u, { n: 5, at: new Date(today.getTime() - 2 * 86400000), subject: "Physics" });
    assert.equal(r.res.me.progress.streak.days, 2);
    // Yesterday was missed → broken but repairable today.
    const me = (await s.api.get("/users/me").set(s.auth(u)).expect(200)).body as MeDTO;
    assert.equal(me.progress.streak.state, "broken");
    assert.equal(me.progress.streak.repairable, true);
    await User.updateOne({ firebaseUid: u }, { $set: { gems: STREAK_REPAIR_GEMS } });
    const fixed = (await s.api.post("/practice/streak/repair").set(s.auth(u)).send({ method: "gems" }).expect(200)).body as MeDTO;
    assert.equal(fixed.progress.streak.state, "pending");
    assert.equal(fixed.progress.streak.days, 2);
    assert.equal(fixed.progress.gems, 0);
    assert.ok(fixed.progress.earnedBadges.includes("comeback"));
    const lastActive = (await User.findOne({ firebaseUid: u }))!.streak.lastActiveDay;
    assert.equal(lastActive, addDays(dayKey(today), -1));
    await s.api.post("/practice/streak/repair").set(s.auth(u)).send({ method: "gems" }).expect(400);
  });

  test("answers are marked by option text, so a stale app with old option order still scores right", async () => {
    const u = uid();
    const [q] = await questions("Biology", "JAMB", 1);
    const right = q!.options.find((o) => o.key === q!.answerKey)!;
    const staleKey = q!.options.find((o) => o.key !== q!.answerKey)!.key; // the letter the old build showed it under
    const sessionId = uid("s");
    const at = new Date().toISOString();
    const r = await s.api
      .post("/practice/sync")
      .set(s.auth(u))
      .send({
        sessions: [{ id: sessionId, mode: "objective", subject: "Biology", examBody: "JAMB", startedAt: at, questionCount: 1 }],
        attempts: [{ id: `${sessionId}-0`, sessionId, questionId: q!._id, selectedKey: staleKey, selectedText: right.text, answeredAt: at }],
      })
      .expect(200);
    assert.equal(r.body.results[0].correct, true);
  });

  test("future timestamps are clamped to now", async () => {
    const u = uid();
    const { res } = await practise(u, { n: 5, at: new Date(Date.now() + 10 * 86400000) });
    assert.equal(res.me.progress.todayAnswered, 5);
  });
});

describe("content", () => {
  test("question sync pages through the bank with a cursor", async () => {
    const u = uid();
    const first = await s.api.get("/questions/sync").set(s.auth(u)).expect(200);
    assert.equal(first.body.questions.length, 500);
    const total = await Question.countDocuments();
    let seen = first.body.questions.length;
    let cursor = first.body.cursor;
    for (;;) {
      const page = await s.api.get("/questions/sync").query({ since: cursor }).set(s.auth(u)).expect(200);
      if (!page.body.questions.length) break;
      seen += page.body.questions.length;
      cursor = page.body.cursor;
    }
    assert.equal(seen, total);
  });

  test("full theory solutions are paid content", async () => {
    const u = uid();
    const r = await s.api.get("/questions/theory/waec-math-theory-1/solution").set(s.auth(u)).expect(402);
    assert.equal(r.body.code, "paywall");
  });
});

describe("AI explanations", () => {
  test(`${FREE_AI_EXPLAINS_PER_DAY} free a day, cached per question, then the paywall`, async () => {
    const u = uid();
    const [q1, q2, q3, q4] = await questions("Physics", "JAMB", 4);
    const a = await s.api.post("/ai/explain").set(s.auth(u)).send({ questionId: q1!._id }).expect(200);
    assert.equal(a.body.cached, false);
    assert.ok(a.body.explanation.steps.length >= 1);
    assert.ok(a.body.explanation.distractors.every((d: { key: string }) => d.key !== q1!.answerKey));
    assert.equal(a.body.aiExplainsLeft, FREE_AI_EXPLAINS_PER_DAY - 1);
    const other = uid();
    const b = await s.api.post("/ai/explain").set(s.auth(other)).send({ questionId: q1!._id }).expect(200);
    assert.equal(b.body.cached, true, "second student gets the cached one");
    await s.api.post("/ai/explain").set(s.auth(u)).send({ questionId: q2!._id }).expect(200);
    await s.api.post("/ai/explain").set(s.auth(u)).send({ questionId: q3!._id }).expect(200);
    const gate = await s.api.post("/ai/explain").set(s.auth(u)).send({ questionId: q4!._id }).expect(402);
    assert.equal(gate.body.code, "ai_quota");
  });
});

/** Run the mock checkout to the end, as the app + browser would. */
async function buy(user: string, product: string, extra: Record<string, unknown> = {}) {
  const co = await s.api.post("/payments/checkout").set(s.auth(user)).send({ product, ...extra }).expect(200);
  const url = new URL(co.body.authorizationUrl);
  await s.api.post(`${url.pathname}/success`).expect(303);
  return (await s.api.get(`/payments/${co.body.reference}`).set(s.auth(user)).expect(200)).body;
}

describe("payments", () => {
  test("Day Pass: checkout → pay → verified → unlimited AI and full solutions", async () => {
    const u = uid();
    await s.api.get("/users/me").set(s.auth(u));
    const st = await buy(u, "day");
    assert.equal(st.status, "success");
    assert.equal(st.amount, 100);
    assert.equal(st.me.entitlement.plan, "day");
    assert.equal(st.me.entitlement.aiExplainsLeft, null);
    const sol = await s.api.get("/questions/theory/waec-math-theory-1/solution").set(s.auth(u)).expect(200);
    assert.ok(sol.body.parts[0].steps.length >= 2);
    // Re-checking is idempotent.
    const again = (await s.api.get(`/payments/${st.reference}`).set(s.auth(u)).expect(200)).body;
    assert.equal(again.me.entitlement.expiresAt, st.me.entitlement.expiresAt);
  });

  test("a declined payment grants nothing", async () => {
    const u = uid();
    const co = await s.api.post("/payments/checkout").set(s.auth(u)).send({ product: "monthly" }).expect(200);
    await s.api.post(`${new URL(co.body.authorizationUrl).pathname}/failed`).expect(303);
    const st = (await s.api.get(`/payments/${co.body.reference}`).set(s.auth(u)).expect(200)).body;
    assert.equal(st.status, "failed");
    assert.equal(st.me.entitlement.plan, "free");
  });

  test("gem packs add gems; one student can't read another's payment", async () => {
    const u = uid();
    const st = await buy(u, "gems-small");
    assert.equal(st.me.progress.gems, 50 + 250);
    await s.api.get(`/payments/${st.reference}`).set(s.auth(uid())).expect(404);
  });

  test("webhook: bad signature is rejected; a signed charge.success fulfils once", async () => {
    await s.api.post("/payments/webhook").set("Content-Type", "application/json").set("x-paystack-signature", "bad").send('{"event":"charge.success"}').expect(401);
    const u = uid();
    const co = await s.api.post("/payments/checkout").set(s.auth(u)).send({ product: "monthly" }).expect(200);
    const { settleMock } = await import("../services/paystack");
    settleMock(co.body.reference, "success");
    const raw = JSON.stringify({ event: "charge.success", data: { reference: co.body.reference } });
    const sig = createHmac("sha512", "sk_test_webhook_secret").update(raw).digest("hex");
    for (let i = 0; i < 2; i++) await s.api.post("/payments/webhook").set("Content-Type", "application/json").set("x-paystack-signature", sig).send(raw).expect(200);
    const me = (await s.api.get("/users/me").set(s.auth(u)).expect(200)).body as MeDTO;
    assert.equal(me.entitlement.plan, "monthly");
    const days = (Date.parse(me.entitlement.expiresAt!) - Date.now()) / 86400000;
    assert.ok(days > 29.9 && days <= 30, "granted exactly once");
    assert.equal(me.entitlement.freeRepairsLeft, 2);
  });
});

describe("referrals & ambassadors", () => {
  test("friend joins with a code: both get gems after the friend's first practice; Recruiter badge", async () => {
    const inviter = uid("inv");
    const inviterMe = (await s.api.get("/users/me").set(s.auth(inviter)).expect(200)).body as MeDTO;
    const friend = uid("fr");
    await s.api.get("/users/me").set(s.auth(friend));
    await s.api.post("/referrals/redeem").set(s.auth(friend)).send({ code: inviterMe.profile.referralCode.toLowerCase() }).expect(200);
    await s.api.post("/referrals/redeem").set(s.auth(friend)).send({ code: inviterMe.profile.referralCode }).expect(409);
    const own = (await s.api.get("/users/me").set(s.auth(friend)).expect(200)).body as MeDTO;
    await s.api.post("/referrals/redeem").set(s.auth(uid())).send({ code: "NOPE99" }).expect(400);
    await s.api.post("/referrals/redeem").set(s.auth(friend)).send({ code: own.profile.referralCode }).expect(409);
    const { res } = await practise(friend, { n: 5 });
    assert.equal(res.me.progress.gems, 50 + AMBASSADOR_RULES.inviteGems);
    const after = (await s.api.get("/users/me").set(s.auth(inviter)).expect(200)).body as MeDTO;
    assert.equal(after.progress.gems, 50 + AMBASSADOR_RULES.inviteGems);
    assert.ok(after.progress.earnedBadges.includes("recruiter"));
  });

  test("ambassador: eligibility, commission on a friend's purchase, payout", async () => {
    const amb = uid("amb");
    await s.api.patch("/users/me").set(s.auth(amb)).send({ name: "Adaeze Okafor" }).expect(200);
    const blocked = await s.api.post("/ambassador/join").set(s.auth(amb)).expect(403);
    assert.equal(blocked.body.code, "not_eligible");
    for (const subject of ["Mathematics", "Physics", "Chemistry", "Biology", "Economics"]) await practise(amb, { n: 5, subject });
    const dash = (await s.api.post("/ambassador/join").set(s.auth(amb)).expect(200)).body;
    const code = dash.code as string;

    // Seven friends buy Monthly with the code → 7 × ₦160 = ₦1,120.
    for (let i = 0; i < 7; i++) {
      const f = uid("buyer");
      await s.api.get("/users/me").set(s.auth(f));
      await buy(f, "monthly", { ambassadorCode: code });
    }
    let d = (await s.api.get("/ambassador/dashboard").set(s.auth(amb)).expect(200)).body;
    assert.equal(d.earnings.pending, 7 * 160);
    assert.equal(d.earnings.available, 0);
    await s.api.post("/ambassador/payouts").set(s.auth(amb)).expect(400);

    // Fast-forward past the refund hold.
    const ambUser = (await User.findOne({ firebaseUid: amb }))!;
    await Commission.updateMany({ ambassador: ambUser._id }, { $set: { availableAt: new Date(Date.now() - 1000) } });
    d = (await s.api.get("/ambassador/dashboard").set(s.auth(amb)).expect(200)).body;
    assert.equal(d.earnings.available, 1120);

    // Bank account must be in the ambassador's own name.
    mockAccountNames.set("0123456789", "OKAFOR ADAEZE CHIOMA");
    mockAccountNames.set("0987654321", "SOMEONE ELSE");
    const res1 = await s.api.post("/ambassador/payout-account/resolve").set(s.auth(amb)).send({ bankCode: "058", accountNumber: "0123456789" }).expect(200);
    assert.equal(res1.body.matchesProfile, true);
    await s.api.put("/ambassador/payout-account").set(s.auth(amb)).send({ bankCode: "058", accountNumber: "0987654321" }).expect(403);
    await s.api.put("/ambassador/payout-account").set(s.auth(amb)).send({ bankCode: "058", accountNumber: "0123456789" }).expect(200);
    const po = await s.api.post("/ambassador/payouts").set(s.auth(amb)).expect(200);
    assert.equal(po.body.amount, 1120);
    assert.equal(po.body.dashboard.payoutInFlight.amount, 1120);
    assert.equal(po.body.dashboard.earnings.available, 0);
    await s.api.post("/ambassador/payouts").set(s.auth(amb)).expect(409);

    const { processRequestedPayouts } = await import("../services/payouts");
    assert.deepEqual(await processRequestedPayouts(), { sent: 1, failed: 0 });
    d = (await s.api.get("/ambassador/dashboard").set(s.auth(amb)).expect(200)).body;
    assert.equal(d.earnings.paid, 1120);
    assert.equal(d.payoutInFlight, null);
  });

  test("you can't use your own code at checkout; unknown codes are explained", async () => {
    const u = uid();
    const me = (await s.api.get("/users/me").set(s.auth(u)).expect(200)).body as MeDTO;
    const own = await s.api.post("/payments/checkout").set(s.auth(u)).send({ product: "day", ambassadorCode: me.profile.referralCode }).expect(400);
    assert.equal(own.body.code, "own_code");
    const unknown = await s.api.post("/payments/checkout").set(s.auth(u)).send({ product: "day", ambassadorCode: "ZZZZZZ22" }).expect(400);
    assert.equal(unknown.body.code, "unknown_code");
  });
});

describe("environment safety", () => {
  test("production refuses dev auth, mock payments and mock AI", () => {
    assert.throws(
      () => parseEnv({ NODE_ENV: "production", MONGODB_URI: "mongodb://x", AUTH_MODE: "dev", PAYMENTS_MODE: "mock", AI_PROVIDER: "mock" }),
      /AUTH_MODE must be firebase[\s\S]*PAYMENTS_MODE must be paystack[\s\S]*AI_PROVIDER cannot be mock/,
    );
    assert.throws(() => parseEnv({ MONGODB_URI: "mongodb://x", AUTH_MODE: "dev", PAYMENTS_MODE: "paystack", AI_PROVIDER: "mock" }), /PAYSTACK_SECRET_KEY is required/);
  });
});
