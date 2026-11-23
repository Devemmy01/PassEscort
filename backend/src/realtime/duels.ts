/**
 * Realtime 1v1 duels (PRD §5.6) on Socket.io, namespace "/duels".
 * The server owns the clock, the questions and the scoring; clients only send
 * which option they picked. Contract: shared/duel.ts.
 *
 *   queue:join {subject} / invite:join {code}
 *     → match:found → round:start ×7 (opponent:answered, round:reveal) → duel:end
 *
 * A dropped player pauses the round clock for both; they have
 * DUEL_RECONNECT_GRACE_MS to come back (any new socket for the same student
 * re-attaches) before forfeiting. Single-instance state: with several API
 * instances, add the Socket.io Redis adapter and sticky sessions.
 */
import type { Namespace, Server, Socket } from "socket.io";
import {
  DUEL_BOT_NAME,
  DUEL_COUNTDOWN_MS,
  DUEL_LEVEL_RANGE,
  DUEL_RECONNECT_GRACE_MS,
  DUEL_REVEAL_MS,
  DUEL_ROUNDS,
  DUEL_SECONDS_PER_QUESTION,
  DUEL_WIDEN_AFTER_MS,
  duelResult,
  roundPoints,
  type DuelClientEvents,
  type DuelPlayerView,
  type DuelServerEvents,
  DUEL_REACTION_COOLDOWN_MS,
  DUEL_REACTION_LIMIT,
  isDuelReaction,
} from "../../../shared/duel";
import { levelFromXp, XP_RULES } from "../../../shared/levels";
import { env } from "../config/env";
import { withLock } from "../lib/lock";
import { verifyToken } from "../middleware/auth";
import Duel from "../models/Duel";
import DuelInvite from "../models/DuelInvite";
import Question, { type QuestionDoc } from "../models/Question";
import User from "../models/User";
import { notify } from "../services/push";
import { addXp, awardBadges, getOrCreateUser } from "../services/users";

type DuelSocket = Socket<DuelClientEvents, DuelServerEvents, Record<string, never>, { userId: string; name: string; level: number }>;

interface Player {
  userId: string | null;
  name: string;
  level: number;
  bot: boolean;
  skill: number;
  socket: DuelSocket | null;
  answers: ({ key: string | null; ms: number } | null)[];
  points: number[];
  reactions: { sent: number; lastAt: number };
}

interface LiveDuel {
  id: string;
  subject: string;
  source: "matchmaking" | "invite";
  players: [Player, Player];
  questions: QuestionDoc[];
  round: number;
  phase: "countdown" | "answering" | "reveal" | "paused" | "ended";
  roundStartedAt: number;
  /** ms already spent in the current round before a pause. */
  spentBeforePause: number;
  deadline: number;
  timer: NodeJS.Timeout | null;
  botTimer: NodeJS.Timeout | null;
  graceTimer: NodeJS.Timeout | null;
  startedAt: Date;
}

interface Waiting {
  socket: DuelSocket;
  subject: string;
  joinedAt: number;
  botTimer: NodeJS.Timeout | null;
}

const ROUND_MS = DUEL_SECONDS_PER_QUESTION * 1000;

export class DuelServer {
  private queue: Waiting[] = [];
  private inviteHosts = new Map<string, DuelSocket>();
  private live = new Map<string, LiveDuel>();
  private byUser = new Map<string, LiveDuel>();
  private nextId = 1;
  readonly ns: Namespace<DuelClientEvents, DuelServerEvents>;

  constructor(io: Server) {
    this.ns = io.of("/duels");
    this.ns.use(async (socket, next) => {
      try {
        const token = String((socket.handshake.auth as { token?: string })?.token ?? "");
        const user = await getOrCreateUser(await verifyToken(token));
        Object.assign(socket.data, { userId: String(user._id), name: user.name || "Student", level: levelFromXp(user.xp).level });
        next();
      } catch {
        next(new Error("unauthorized"));
      }
    });
    this.ns.on("connection", (s) => this.onConnect(s as DuelSocket));
  }

  /** For tests and graceful shutdown. */
  close(): void {
    for (const d of this.live.values()) this.clearTimers(d);
    for (const w of this.queue) if (w.botTimer) clearTimeout(w.botTimer);
    this.queue = [];
  }

  private onConnect(socket: DuelSocket): void {
    const { userId } = socket.data;
    const active = this.byUser.get(userId);
    if (active) this.reattach(active, socket);

    socket.on("queue:join", ({ subject }) => void this.joinQueue(socket, String(subject ?? "")));
    socket.on("queue:leave", () => this.leaveQueue(socket));
    socket.on("invite:join", ({ code }) => void this.joinInvite(socket, String(code ?? "").toUpperCase()));
    socket.on("answer:submit", ({ index, key }) => this.answer(socket, Number(index), String(key ?? "")));
    socket.on("forfeit", () => {
      const d = this.byUser.get(userId);
      if (d) void this.end(d, "forfeit", userId);
    });
    socket.on("duel:rejoin", () => {
      const d = this.byUser.get(userId);
      if (d) this.reattach(d, socket);
    });
    socket.on("reaction:send", ({ emoji }) => this.react(socket, emoji));
    socket.on("disconnect", () => this.onDisconnect(socket));
  }

  /** Relay a reaction to the opponent (bots don't listen). Unknown emoji and spam are dropped silently. */
  private react(socket: DuelSocket, emoji: unknown): void {
    const d = this.byUser.get(socket.data.userId);
    if (!d || !isDuelReaction(emoji)) return;
    const p = d.players.find((x) => x.userId === socket.data.userId)!;
    const now = Date.now();
    if (p.reactions.sent >= DUEL_REACTION_LIMIT || now - p.reactions.lastAt < DUEL_REACTION_COOLDOWN_MS) return;
    p.reactions = { sent: p.reactions.sent + 1, lastAt: now };
    d.players.find((x) => x !== p)!.socket?.emit("opponent:reaction", { emoji });
  }

  /* ---------------- Matchmaking ---------------- */

  private async joinQueue(socket: DuelSocket, subject: string): Promise<void> {
    if (!subject || this.byUser.has(socket.data.userId)) return;
    this.leaveQueue(socket);
    const now = Date.now();
    const opponent = this.queue.find(
      (w) =>
        w.subject === subject &&
        w.socket.data.userId !== socket.data.userId &&
        (Math.abs(w.socket.data.level - socket.data.level) <= DUEL_LEVEL_RANGE || now - w.joinedAt >= DUEL_WIDEN_AFTER_MS),
    );
    if (opponent) {
      this.removeWaiting(opponent);
      await this.start(subject, "matchmaking", this.human(opponent.socket), this.human(socket));
      return;
    }
    const w: Waiting = { socket, subject, joinedAt: now, botTimer: null };
    const botAfter = env().DUEL_BOT_AFTER_MS;
    if (botAfter > 0) {
      w.botTimer = setTimeout(() => {
        if (!this.queue.includes(w)) return;
        this.removeWaiting(w);
        void this.start(subject, "matchmaking", this.human(socket), this.bot(socket.data.level));
      }, botAfter);
    }
    this.queue.push(w);
    socket.emit("match:waiting", { subject, elapsedMs: 0 });
  }

  private leaveQueue(socket: DuelSocket): void {
    for (const w of this.queue.filter((x) => x.socket.data.userId === socket.data.userId)) this.removeWaiting(w);
  }

  private removeWaiting(w: Waiting): void {
    if (w.botTimer) clearTimeout(w.botTimer);
    this.queue = this.queue.filter((x) => x !== w);
  }

  private async joinInvite(socket: DuelSocket, code: string): Promise<void> {
    const invite = await DuelInvite.findOne({ code });
    if (!invite || invite.expiresAt.getTime() < Date.now() || invite.acceptedBy) {
      socket.emit("duel:error", { code: "invite_unavailable", message: "This duel link has expired or was already used." });
      return;
    }
    const isHost = String(invite.from) === socket.data.userId;
    const waiting = this.inviteHosts.get(code);
    if (!waiting || waiting.disconnected || waiting.data.userId === socket.data.userId) {
      // First of the two to arrive waits (host or guest — whoever opens it first).
      this.inviteHosts.set(code, socket);
      socket.emit("match:waiting", { subject: invite.subject, elapsedMs: 0 });
      // The friend is here but the host left the invite screen: call them back.
      if (!isHost) {
        void notify([String(invite.from)], "duels", {
          title: `${socket.data.name.split(" ")[0]} accepted your ${invite.subject} duel ⚔️`,
          body: "They're waiting — tap to play now.",
          data: { type: "duel-invite", code, subject: invite.subject },
        });
      }
      return;
    }
    this.inviteHosts.delete(code);
    const guest = isHost ? waiting : socket;
    invite.acceptedBy = (await User.findById(guest.data.userId))!._id;
    await invite.save();
    await this.start(invite.subject, "invite", this.human(waiting), this.human(socket));
  }

  private human(socket: DuelSocket): Player {
    const { userId, name, level } = socket.data;
    return { userId, name, level, bot: false, skill: 0, socket, answers: [], points: [], reactions: { sent: 0, lastAt: 0 } };
  }

  private bot(level: number): Player {
    return { userId: null, name: DUEL_BOT_NAME, level: Math.max(1, level), bot: true, skill: 0.55 + Math.min(0.25, level / 200), socket: null, answers: [], points: [], reactions: { sent: 0, lastAt: 0 } };
  }

  /* ---------------- Duel lifecycle ---------------- */

  private async pickQuestions(subject: string): Promise<QuestionDoc[]> {
    let qs = await Question.aggregate<QuestionDoc>([{ $match: { subject, examBody: { $in: ["JAMB", "WAEC"] } } }, { $sample: { size: DUEL_ROUNDS } }]);
    if (qs.length < DUEL_ROUNDS) qs = await Question.aggregate<QuestionDoc>([{ $match: { subject } }, { $sample: { size: DUEL_ROUNDS } }]);
    return qs;
  }

  private async start(subject: string, source: LiveDuel["source"], a: Player, b: Player): Promise<void> {
    const questions = await this.pickQuestions(subject);
    if (questions.length < 3) {
      for (const p of [a, b]) p.socket?.emit("duel:error", { code: "no_questions", message: `Not enough ${subject} questions for a duel yet.` });
      return;
    }
    const d: LiveDuel = {
      id: `d${Date.now().toString(36)}${this.nextId++}`,
      subject,
      source,
      players: [a, b],
      questions,
      round: -1,
      phase: "countdown",
      roundStartedAt: 0,
      spentBeforePause: 0,
      deadline: 0,
      timer: null,
      botTimer: null,
      graceTimer: null,
      startedAt: new Date(),
    };
    this.live.set(d.id, d);
    for (const p of d.players) if (p.userId) this.byUser.set(p.userId, d);
    const view = (p: Player): DuelPlayerView => ({ id: p.userId ?? "bot", name: p.name, level: p.level, ...(p.bot ? { bot: true } : {}) });
    a.socket?.emit("match:found", { duelId: d.id, subject, you: view(a), opponent: view(b), startsInMs: DUEL_COUNTDOWN_MS });
    b.socket?.emit("match:found", { duelId: d.id, subject, you: view(b), opponent: view(a), startsInMs: DUEL_COUNTDOWN_MS });
    d.timer = setTimeout(() => this.startRound(d, 0), DUEL_COUNTDOWN_MS);
  }

  private startRound(d: LiveDuel, index: number): void {
    if (d.phase === "ended") return;
    if (d.players.some((p) => !p.bot && !p.socket)) {
      d.round = index;
      this.pause(d, ROUND_MS);
      return;
    }
    d.round = index;
    d.phase = "answering";
    d.spentBeforePause = 0;
    d.roundStartedAt = Date.now();
    d.deadline = d.roundStartedAt + ROUND_MS;
    this.emitRound(d);
    d.timer = setTimeout(() => this.reveal(d), ROUND_MS);
    this.scheduleBot(d, ROUND_MS);
  }

  private emitRound(d: LiveDuel, to?: Player): void {
    const q = d.questions[d.round]!;
    const payload = {
      index: d.round,
      total: d.questions.length,
      question: { id: q._id, prompt: q.prompt, options: q.options.map((o) => ({ key: o.key, text: o.text })) },
      deadline: d.deadline,
      serverNow: Date.now(),
    };
    for (const p of to ? [to] : d.players) p.socket?.emit("round:start", payload);
  }

  private scheduleBot(d: LiveDuel, remainingMs: number): void {
    const bot = d.players.find((p) => p.bot);
    if (!bot || bot.answers[d.round]) return;
    const q = d.questions[d.round]!;
    const at = Math.min(remainingMs - 200, 2500 + Math.random() * 8000);
    if (d.botTimer) clearTimeout(d.botTimer);
    d.botTimer = setTimeout(() => {
      const wrong = q.options.filter((o) => o.key !== q.answerKey);
      const key = Math.random() < bot.skill || !wrong.length ? q.answerKey : wrong[Math.floor(Math.random() * wrong.length)]!.key;
      this.record(d, bot, key);
    }, Math.max(300, at));
  }

  private elapsed(d: LiveDuel): number {
    return d.spentBeforePause + (Date.now() - d.roundStartedAt);
  }

  private answer(socket: DuelSocket, index: number, key: string): void {
    const d = this.byUser.get(socket.data.userId);
    if (!d || d.phase !== "answering" || index !== d.round) return;
    const p = d.players.find((x) => x.userId === socket.data.userId)!;
    if (!d.questions[d.round]!.options.some((o) => o.key === key)) return;
    this.record(d, p, key);
  }

  private record(d: LiveDuel, p: Player, key: string): void {
    if (d.phase !== "answering" || p.answers[d.round]) return;
    const ms = Math.min(ROUND_MS, this.elapsed(d));
    p.answers[d.round] = { key, ms };
    const other = d.players.find((x) => x !== p)!;
    other.socket?.emit("opponent:answered", { index: d.round, ms });
    if (d.players.every((x) => x.answers[d.round])) this.reveal(d);
  }

  private reveal(d: LiveDuel): void {
    if (d.phase !== "answering") return;
    this.clearTimers(d);
    d.phase = "reveal";
    const q = d.questions[d.round]!;
    for (const p of d.players) {
      const a = p.answers[d.round] ?? null;
      p.points[d.round] = a ? roundPoints(a.key === q.answerKey, a.ms / 1000) : 0;
    }
    const total = (p: Player) => p.points.reduce((x, y) => x + (y ?? 0), 0);
    const side = (p: Player) => {
      const a = p.answers[d.round] ?? null;
      return { key: a?.key ?? null, ms: a?.ms ?? null, points: p.points[d.round]!, total: total(p) };
    };
    const [a, b] = d.players;
    a.socket?.emit("round:reveal", { index: d.round, correctKey: q.answerKey, you: side(a), opponent: side(b) });
    b.socket?.emit("round:reveal", { index: d.round, correctKey: q.answerKey, you: side(b), opponent: side(a) });
    d.timer = setTimeout(() => {
      if (d.round >= d.questions.length - 1) void this.end(d, "complete");
      else this.startRound(d, d.round + 1);
    }, DUEL_REVEAL_MS);
  }

  /* ---------------- Disconnects ---------------- */

  private onDisconnect(socket: DuelSocket): void {
    this.leaveQueue(socket);
    for (const [code, s] of this.inviteHosts) if (s === socket) this.inviteHosts.delete(code);
    const d = this.byUser.get(socket.data.userId);
    if (!d || d.phase === "ended") return;
    const p = d.players.find((x) => x.socket === socket);
    if (!p) return;
    p.socket = null;
    if (d.phase === "answering") {
      const remaining = Math.max(0, ROUND_MS - this.elapsed(d));
      this.clearTimers(d);
      d.spentBeforePause = ROUND_MS - remaining;
      this.pause(d, remaining);
    } else if (d.phase !== "paused") {
      // Countdown or reveal: the next round won't start until they're back (startRound checks).
      this.startGrace(d);
    }
  }

  private pause(d: LiveDuel, remainingMs: number): void {
    d.phase = "paused";
    d.deadline = Date.now() + remainingMs;
    for (const p of d.players) p.socket?.emit("duel:paused", { reason: "opponent-disconnected", graceMs: DUEL_RECONNECT_GRACE_MS });
    this.startGrace(d);
  }

  private startGrace(d: LiveDuel): void {
    if (d.graceTimer) return;
    d.graceTimer = setTimeout(() => {
      d.graceTimer = null;
      const gone = d.players.find((p) => !p.bot && !p.socket);
      if (gone) void this.end(d, "forfeit", gone.userId!);
    }, DUEL_RECONNECT_GRACE_MS);
  }

  private reattach(d: LiveDuel, socket: DuelSocket): void {
    const p = d.players.find((x) => x.userId === socket.data.userId);
    if (!p || d.phase === "ended") return;
    p.socket = socket;
    const other = d.players.find((x) => x !== p)!;
    const view = (x: Player): DuelPlayerView => ({ id: x.userId ?? "bot", name: x.name, level: x.level, ...(x.bot ? { bot: true } : {}) });
    socket.emit("match:found", { duelId: d.id, subject: d.subject, you: view(p), opponent: view(other), startsInMs: 0 });
    if (d.players.some((x) => !x.bot && !x.socket)) return; // still waiting for the other one
    if (d.graceTimer) {
      clearTimeout(d.graceTimer);
      d.graceTimer = null;
    }
    if (d.phase === "paused") {
      // Resume the round with the time that was left.
      const remaining = Math.max(1000, ROUND_MS - d.spentBeforePause);
      d.phase = "answering";
      d.roundStartedAt = Date.now();
      d.deadline = d.roundStartedAt + remaining;
      for (const x of d.players) x.socket?.emit("duel:resumed", { deadline: d.deadline, serverNow: Date.now() });
      this.emitRound(d);
      d.timer = setTimeout(() => this.reveal(d), remaining);
      this.scheduleBot(d, remaining);
    } else if (d.phase === "answering") {
      this.emitRound(d, p);
    }
  }

  private clearTimers(d: LiveDuel): void {
    for (const t of [d.timer, d.botTimer]) if (t) clearTimeout(t);
    d.timer = null;
    d.botTimer = null;
  }

  /* ---------------- End ---------------- */

  private async end(d: LiveDuel, reason: "complete" | "forfeit", forfeiterId?: string): Promise<void> {
    if (d.phase === "ended") return;
    d.phase = "ended";
    this.clearTimers(d);
    if (d.graceTimer) clearTimeout(d.graceTimer);
    this.live.delete(d.id);
    for (const p of d.players) if (p.userId) this.byUser.delete(p.userId);

    const totals = d.players.map((p) => p.points.reduce((x, y) => x + (y ?? 0), 0));
    const practice = d.players.some((p) => p.bot);
    const results = d.players.map((p, i) => {
      if (reason === "forfeit") return p.userId === forfeiterId ? "loss" : "win";
      return duelResult(totals[i]!, totals[1 - i]!);
    });
    const xpFor = (r: string, forfeited: boolean) => (forfeited ? 0 : r === "win" ? XP_RULES.duelWin : r === "draw" ? XP_RULES.duelDraw : XP_RULES.duelLoss);

    // Rounds that were actually revealed (a forfeit mid-round drops the unfinished one).
    const played = Math.max(...d.players.map((p) => p.points.length));
    const rounds = d.questions.slice(0, played).map((q, i) => ({
      question: q._id,
      answers: d.players.map((p) => ({ key: p.answers[i]?.key ?? null, ms: p.answers[i]?.ms ?? null, points: p.points[i] ?? 0 })),
    }));
    const now = new Date();
    const players = [];
    for (const [i, p] of d.players.entries()) {
      const result = results[i] as "win" | "loss" | "draw";
      const forfeited = p.userId === forfeiterId;
      const xp = p.bot ? 0 : xpFor(result, forfeited);
      let levelUps: number[] = [];
      if (p.userId) {
        levelUps = await withLock(p.userId, async () => {
          const u = await User.findById(p.userId);
          if (!u) return [];
          const before = levelFromXp(u.xp).level;
          addXp(u, xp, now);
          if (!practice) {
            if (result === "win") u.stats.duelsWon += 1;
            else if (result === "loss") u.stats.duelsLost += 1;
            else u.stats.duelsDrawn += 1;
            awardBadges(u, now);
          }
          await u.save();
          const after = levelFromXp(u.xp).level;
          return Array.from({ length: after - before }, (_, k) => before + k + 1);
        });
      }
      players.push({ user: p.userId ? (await User.findById(p.userId, { _id: 1 }))?._id ?? null : null, name: p.name, bot: p.bot, score: totals[i]!, xp, result });
      const other = 1 - i;
      p.socket?.emit("duel:end", {
        duelId: d.id,
        result,
        you: totals[i]!,
        opponent: totals[other]!,
        xp,
        levelUps,
        practice,
        reason: reason === "complete" ? "complete" : forfeited ? "forfeit" : "opponent-forfeit",
        rounds: rounds.map((r) => ({
          questionId: r.question,
          youCorrect: r.answers[i]!.points > 0,
          youMs: r.answers[i]!.ms,
          themCorrect: r.answers[other]!.points > 0,
          themMs: r.answers[other]!.ms,
        })),
      });
    }
    await Duel.create({
      subject: d.subject,
      source: d.source,
      players,
      questions: d.questions.map((q) => q._id),
      rounds,
      endReason: reason,
      startedAt: d.startedAt,
      endedAt: now,
    });
  }
}

export function attachDuels(io: Server): DuelServer {
  return new DuelServer(io);
}
