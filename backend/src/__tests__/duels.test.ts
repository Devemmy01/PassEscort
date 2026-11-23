import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { io as connect, type Socket } from "socket.io-client";
import { DUEL_ROUNDS, DUEL_SECONDS_PER_QUESTION, type DuelClientEvents, type DuelServerEvents } from "../../../shared/duel";
import { XP_RULES } from "../../../shared/levels";
import { env, setEnv } from "../config/env";
import Question from "../models/Question";
import User from "../models/User";
import { startStack, uid, type Stack } from "./harness";

type Client = Socket<DuelServerEvents, DuelClientEvents>;

let s: Stack;
before(async () => {
  s = await startStack();
});
after(async () => {
  await s?.stop();
});

const sockets: Client[] = [];
function client(user: string): Client {
  const c: Client = connect(`http://127.0.0.1:${s.port}/duels`, { auth: { token: `dev:${user}` }, transports: ["websocket"], forceNew: true, reconnection: false });
  sockets.push(c);
  return c;
}
after(() => sockets.forEach((c) => c.close()));

function once<E extends keyof DuelServerEvents>(c: Client, event: E, timeoutMs = 20_000): Promise<Parameters<DuelServerEvents[E]>[0]> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${String(event)}`)), timeoutMs);
    c.once(event as never, ((p: unknown) => {
      clearTimeout(t);
      resolve(p as never);
    }) as never);
  });
}

/** Answer every round: `right` decides whether this player picks the correct key. */
function autoplay(c: Client, right: (index: number) => boolean) {
  c.on("round:start", async ({ index, question }) => {
    const q = (await Question.findById(question.id).lean())!;
    const key = right(index) ? q.answerKey : q.options.find((o) => o.key !== q.answerKey)!.key;
    c.emit("answer:submit", { index, key });
  });
}

describe("realtime duels", () => {
  test("two students are matched, play 7 server-timed rounds, and get XP and W–L", { timeout: 60_000 }, async () => {
    const a = uid("a");
    const b = uid("b");
    await s.api.patch("/users/me").set(s.auth(a)).send({ name: "Ada Obi" });
    await s.api.patch("/users/me").set(s.auth(b)).send({ name: "Tunde Bakare" });
    const ca = client(a);
    const cb = client(b);
    const waitingA = once(ca, "match:waiting");
    ca.emit("queue:join", { subject: "Mathematics" });
    await waitingA;
    const [fa, fb] = await Promise.all([once(ca, "match:found"), (cb.emit("queue:join", { subject: "Mathematics" }), once(cb, "match:found"))]);
    assert.equal(fa.duelId, fb.duelId);
    assert.equal(fa.opponent.name, "Tunde Bakare");
    assert.equal(fb.opponent.name, "Ada Obi");

    const first = await once(ca, "round:start");
    assert.equal(first.total, DUEL_ROUNDS);
    assert.equal(first.deadline - first.serverNow <= DUEL_SECONDS_PER_QUESTION * 1000, true);
    assert.ok(!("answerKey" in first.question), "answer keys are never sent before the reveal");
    // Round 0 is already in flight for both; answer it, then autoplay the rest.
    const q0 = (await Question.findById(first.question.id).lean())!;
    ca.emit("answer:submit", { index: 0, key: q0.answerKey });
    cb.emit("answer:submit", { index: 0, key: q0.options.find((o) => o.key !== q0.answerKey)!.key });
    const reveal = await once(ca, "round:reveal");
    assert.equal(reveal.correctKey, q0.answerKey);
    assert.ok(reveal.you.points >= 100 && reveal.opponent.points === 0);

    autoplay(ca, () => true);
    autoplay(cb, (i) => i % 2 === 0);
    const [endA, endB] = await Promise.all([once(ca, "duel:end", 45_000), once(cb, "duel:end", 45_000)]);
    assert.equal(endA.result, "win");
    assert.equal(endB.result, "loss");
    assert.equal(endA.rounds.length, DUEL_ROUNDS);
    assert.equal(endA.xp, XP_RULES.duelWin);
    assert.equal(endB.xp, XP_RULES.duelLoss);
    assert.equal(endA.practice, false);
    const ua = (await User.findOne({ firebaseUid: a }))!;
    assert.equal(ua.stats.duelsWon, 1);
    assert.ok(ua.badges.some((x) => x.id === "duelist"));
    const recent = await s.api.get("/duels/recent").set(s.auth(a)).expect(200);
    assert.equal(recent.body[0].result, "win");
  });

  test("invite link: friend joins by code; a drop pauses the clock; forfeit after reconnect", { timeout: 60_000 }, async () => {
    const host = uid("h");
    const guest = uid("g");
    const inv = await s.api.post("/duels/invites").set(s.auth(host)).send({ subject: "Physics" }).expect(201);
    assert.match(inv.body.code, /^[A-HJ-NP-Z2-9]{6}$/);
    assert.equal(inv.body.status, "open");
    const ch = client(host);
    ch.emit("invite:join", { code: inv.body.code });
    await once(ch, "match:waiting");
    const cg = client(guest);
    cg.emit("invite:join", { code: inv.body.code.toLowerCase() });
    await Promise.all([once(ch, "match:found"), once(cg, "match:found")]);
    await once(cg, "round:start");
    const accepted = await s.api.get(`/duels/invites/${inv.body.code}`).set(s.auth(guest)).expect(200);
    assert.equal(accepted.body.status, "accepted");

    // Host drops mid-round: the guest is told the clock is paused.
    const paused = once(cg, "duel:paused");
    ch.disconnect();
    assert.equal((await paused).reason, "opponent-disconnected");
    // Host comes back on a new socket: the round resumes.
    const ch2 = client(host);
    const [resumed] = await Promise.all([once(cg, "duel:resumed"), once(ch2, "round:start")]);
    assert.ok(resumed.deadline > Date.now());

    // Reactions: relayed to the opponent; unknown emoji and spam are dropped.
    const got: string[] = [];
    ch2.on("opponent:reaction", ({ emoji }) => got.push(emoji));
    cg.emit("reaction:send", { emoji: "🔥" });
    cg.emit("reaction:send", { emoji: "👏" }); // inside the cooldown
    cg.emit("reaction:send", { emoji: "<script>" });
    await new Promise((r) => setTimeout(r, 300));
    assert.deepEqual(got, ["🔥"]);

    const ends = Promise.all([once(ch2, "duel:end"), once(cg, "duel:end")]);
    cg.emit("forfeit");
    const [endHost, endGuest] = await ends;
    assert.equal(endHost.result, "win");
    assert.equal(endHost.reason, "opponent-forfeit");
    assert.equal(endGuest.reason, "forfeit");
    assert.equal(endGuest.xp, 0, "forfeiting earns no duel XP");
  });

  test("with nobody around, Passy Bot steps in — practice: XP but no W–L", { timeout: 60_000 }, async () => {
    setEnv({ ...env(), DUEL_BOT_AFTER_MS: 300 });
    try {
      const u = uid("solo");
      const c = client(u);
      c.emit("queue:join", { subject: "Chemistry" });
      const found = await once(c, "match:found", 5000);
      assert.equal(found.opponent.bot, true);
      assert.equal(found.opponent.name, "Passy Bot");
      await once(c, "round:start");
      const end = once(c, "duel:end");
      c.emit("forfeit");
      const e = await end;
      assert.equal(e.practice, true);
      const me = (await User.findOne({ firebaseUid: u }))!;
      assert.equal(me.stats.duelsLost + me.stats.duelsWon + me.stats.duelsDrawn, 0);
    } finally {
      setEnv({ ...env(), DUEL_BOT_AFTER_MS: 0 });
    }
  });

  test("sockets need a valid token", async () => {
    const c: Client = connect(`http://127.0.0.1:${s.port}/duels`, { auth: { token: "nope" }, transports: ["websocket"], forceNew: true, reconnection: false });
    sockets.push(c);
    const err = await new Promise<Error>((r) => c.once("connect_error", r));
    assert.equal(err.message, "unauthorized");
  });
});
