import { useSyncExternalStore } from 'react';
import { io, type Socket } from 'socket.io-client';
import {
  DUEL_COUNTDOWN_MS,
  DUEL_REACTION_COOLDOWN_MS,
  DUEL_REACTION_LIMIT,
  DUEL_REVEAL_MS,
  DUEL_ROUNDS,
  DUEL_SECONDS_PER_QUESTION,
  duelResult,
  isDuelReaction,
  roundPoints,
  type DuelClientEvents,
  type DuelPlayerView,
  type DuelQuestionView,
  type DuelReaction,
  type DuelServerEvents,
} from '../../../shared/duel';
import { auth } from '../auth';
import { config } from '../config';
import { XP_RULES } from '../game/levels';
import { pickQuestions } from '../practice/questions';
import { OPPONENTS } from '../practice/types';

/**
 * One live duel, shared by Matchmaking → Battle → Result (PRD §5.6).
 *
 * Live: a Socket.io connection to the API's "/duels" namespace; the server
 * owns the questions, clock and scoring. Demo (prototype, review links): a
 * local engine that emits the *same* contract events (shared/duel.ts), so
 * the screens have exactly one implementation.
 */
export type DuelPhase = 'idle' | 'connecting' | 'searching' | 'found' | 'round' | 'reveal' | 'paused' | 'ended' | 'error';

type EndPayload = Parameters<DuelServerEvents['duel:end']>[0];
type RevealPayload = Parameters<DuelServerEvents['round:reveal']>[0];

export interface DuelView {
  phase: DuelPhase;
  subject: string;
  you: DuelPlayerView | null;
  opponent: DuelPlayerView | null;
  /** Local clock time the countdown ends (found phase). */
  startsAt: number;
  searchStartedAt: number;
  round: { index: number; total: number; question: DuelQuestionView; deadline: number; myKey: string | null; myMs: number | null; opponentAnswered: boolean } | null;
  reveal: RevealPayload | null;
  scores: { you: number; opponent: number };
  /** Per round: did each side score? (header pips). */
  pips: { you: (boolean | null)[]; opponent: (boolean | null)[] };
  pausedForMs: number;
  end: EndPayload | null;
  error: string | null;
  /** Reactions on screen right now (each floats for REACTION_SHOW_MS). */
  reactions: { id: number; emoji: DuelReaction; from: 'you' | 'opponent' }[];
  /** Local time the reaction bar is usable again (mirrors the server's cooldown). */
  reactionReadyAt: number;
  reactionsSent: number;
}

/** How long a reaction bubble stays up. */
export const REACTION_SHOW_MS = 2200;

const INITIAL: DuelView = {
  phase: 'idle',
  subject: '',
  you: null,
  opponent: null,
  startsAt: 0,
  searchStartedAt: 0,
  round: null,
  reveal: null,
  scores: { you: 0, opponent: 0 },
  pips: { you: Array(DUEL_ROUNDS).fill(null), opponent: Array(DUEL_ROUNDS).fill(null) },
  pausedForMs: 0,
  end: null,
  error: null,
  reactions: [],
  reactionReadyAt: 0,
  reactionsSent: 0,
};

let reactionId = 0;
function showReaction(emoji: DuelReaction, from: 'you' | 'opponent'): void {
  const id = ++reactionId;
  set({ reactions: [...view.reactions.slice(-3), { id, emoji, from }] });
  setTimeout(() => set({ reactions: view.reactions.filter((r) => r.id !== id) }), REACTION_SHOW_MS);
}

interface Transport {
  emit<E extends keyof DuelClientEvents>(event: E, ...args: Parameters<DuelClientEvents[E]>): void;
  close(): void;
}

let view: DuelView = INITIAL;
let transport: Transport | null = null;
let roundStartedLocal = 0;
const listeners = new Set<() => void>();

function set(patch: Partial<DuelView>): void {
  view = { ...view, ...patch };
  listeners.forEach((l) => l());
}

/** Server-sent events → view state. Same handler for both transports. */
const handlers: { [E in keyof DuelServerEvents]: DuelServerEvents[E] } = {
  'match:waiting': ({ subject }) => set({ phase: 'searching', subject, searchStartedAt: view.searchStartedAt || Date.now() }),
  'match:found': ({ subject, you, opponent, startsInMs }) => {
    // startsInMs 0 = re-attached to a duel in progress; keep the current round view.
    if (startsInMs === 0 && view.round) return set({ you, opponent });
    set({ ...INITIAL, phase: 'found', subject, you, opponent, startsAt: Date.now() + startsInMs });
  },
  'round:start': ({ index, total, question, deadline, serverNow }) => {
    roundStartedLocal = Date.now();
    const same = view.round?.index === index;
    set({
      phase: 'round',
      reveal: null,
      round: {
        index,
        total,
        question,
        deadline: Date.now() + (deadline - serverNow),
        myKey: same ? view.round!.myKey : null,
        myMs: same ? view.round!.myMs : null,
        opponentAnswered: same ? view.round!.opponentAnswered : false,
      },
    });
  },
  'opponent:answered': ({ index }) => {
    if (view.round?.index === index) set({ round: { ...view.round, opponentAnswered: true } });
  },
  'opponent:reaction': ({ emoji }) => {
    if (isDuelReaction(emoji) && view.phase !== 'ended') showReaction(emoji, 'opponent');
  },
  'round:reveal': (r) => {
    const pips = { you: [...view.pips.you], opponent: [...view.pips.opponent] };
    pips.you[r.index] = r.you.points > 0;
    pips.opponent[r.index] = r.opponent.points > 0;
    set({ phase: 'reveal', reveal: r, scores: { you: r.you.total, opponent: r.opponent.total }, pips });
  },
  'duel:paused': ({ graceMs }) => set({ phase: 'paused', pausedForMs: graceMs }),
  'duel:resumed': ({ deadline, serverNow }) => {
    if (view.round) set({ phase: 'round', round: { ...view.round, deadline: Date.now() + (deadline - serverNow) } });
  },
  'duel:end': (end) => {
    set({ phase: 'ended', end, scores: { you: end.you, opponent: end.opponent } });
    transport?.close();
    transport = null;
  },
  'duel:error': ({ message }) => {
    set({ phase: 'error', error: message });
    transport?.close();
    transport = null;
  },
};

/* ------------------------------------------------------------------ */
/* Live transport                                                      */
/* ------------------------------------------------------------------ */

function liveTransport(onReady: (t: Transport) => void): Transport {
  const socket: Socket<DuelServerEvents, DuelClientEvents> = io(`${config.apiUrl}/duels`, {
    transports: ['websocket'],
    auth: (cb) => {
      auth()
        .getToken()
        .then((token) => cb({ token }))
        .catch(() => cb({ token: '' }));
    },
    reconnectionAttempts: 10,
  });
  for (const [event, handler] of Object.entries(handlers)) socket.on(event as keyof DuelServerEvents, handler as never);
  const t: Transport = {
    emit: (event, ...args) => socket.emit(event, ...args),
    close: () => socket.close(),
  };
  socket.on('connect', () => {
    // A reconnect mid-duel re-attaches (the server also does this automatically).
    if (view.phase === 'round' || view.phase === 'reveal' || view.phase === 'paused' || view.phase === 'found') socket.emit('duel:rejoin');
    else onReady(t);
  });
  socket.on('connect_error', (e) => {
    if (e.message === 'unauthorized') set({ phase: 'error', error: 'Please sign in again to duel.' });
  });
  socket.io.on('reconnect_failed', () => set({ phase: 'error', error: "Couldn't reach the duel server. Check your connection." }));
  return t;
}

/* ------------------------------------------------------------------ */
/* Demo engine — same events, simulated opponent                       */
/* ------------------------------------------------------------------ */

function rand(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function demoTransport(subject: string, opts: { opponentIndex?: number; simulateDrop?: boolean; delayMs?: number }): Transport {
  const timers: ReturnType<typeof setTimeout>[] = [];
  const after = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
  const opp = OPPONENTS[opts.opponentIndex ?? 0] ?? OPPONENTS[0]!;
  const questions = pickQuestions(['JAMB', 'WAEC'], subject, DUEL_ROUNDS);
  const you: DuelPlayerView = { id: 'me', name: 'You', level: 1 };
  const them: DuelPlayerView = { id: 'opp', name: opp.name, level: opp.level };
  const totals = { me: 0, them: 0 };
  const rounds: EndPayload['rounds'] = [];
  let index = -1;
  let mine: { key: string; ms: number } | null = null;
  let theirs: { key: string; ms: number } | null = null;
  let roundStart = 0;
  let ended = false;
  let dropped = false;

  const reveal = () => {
    const q = questions[index]!;
    const myPts = mine ? roundPoints(mine.key === q.answerKey, mine.ms / 1000) : 0;
    const theirPts = theirs ? roundPoints(theirs.key === q.answerKey, theirs.ms / 1000) : 0;
    totals.me += myPts;
    totals.them += theirPts;
    rounds.push({ questionId: q.id, youCorrect: myPts > 0, youMs: mine?.ms ?? null, themCorrect: theirPts > 0, themMs: theirs?.ms ?? null });
    // The simulated classmate cheers their own good rounds now and then.
    if (theirPts > myPts && rand(index + 21) < 0.35) after(500, () => !ended && handlers['opponent:reaction']({ emoji: '💪' }));
    handlers['round:reveal']({
      index,
      correctKey: q.answerKey,
      you: { key: mine?.key ?? null, ms: mine?.ms ?? null, points: myPts, total: totals.me },
      opponent: { key: theirs?.key ?? null, ms: theirs?.ms ?? null, points: theirPts, total: totals.them },
    });
    after(DUEL_REVEAL_MS, () => (index >= questions.length - 1 ? finish('complete') : startRound(index + 1)));
  };

  const startRound = (i: number) => {
    if (ended) return;
    index = i;
    mine = null;
    theirs = null;
    roundStart = Date.now();
    const q = questions[i]!;
    const ms = DUEL_SECONDS_PER_QUESTION * 1000;
    handlers['round:start']({ index: i, total: questions.length, question: { id: q.id, prompt: q.prompt, options: q.options }, deadline: roundStart + ms, serverNow: roundStart });
    const theirMs = 3000 + rand(i + 1) * 9000;
    after(theirMs, () => {
      if (index !== i || ended) return;
      const wrong = q.options.find((o) => o.key !== q.answerKey)!.key;
      theirs = { key: rand(i + 11) < opp.skill ? q.answerKey : wrong, ms: theirMs };
      handlers['opponent:answered']({ index: i, ms: theirMs });
      if (mine) reveal();
    });
    if (opts.simulateDrop && i === 2 && !dropped) {
      dropped = true;
      after(2000, () => {
        handlers['duel:paused']({ reason: 'opponent-disconnected', graceMs: 20000 });
        after(3000, () => handlers['duel:resumed']({ deadline: Date.now() + ms - 2000, serverNow: Date.now() }));
      });
    }
    after(ms + (opts.simulateDrop && i === 2 ? 3000 : 0), () => {
      if (index === i && !ended && view.phase !== 'reveal') reveal();
    });
  };

  const finish = (reason: 'complete' | 'forfeit') => {
    if (ended) return;
    ended = true;
    timers.forEach(clearTimeout);
    const result = reason === 'forfeit' ? 'loss' : duelResult(totals.me, totals.them);
    handlers['duel:end']({
      duelId: 'demo',
      result,
      you: totals.me,
      opponent: totals.them,
      xp: reason === 'forfeit' ? 0 : result === 'win' ? XP_RULES.duelWin : result === 'draw' ? XP_RULES.duelDraw : XP_RULES.duelLoss,
      levelUps: [],
      practice: false,
      reason: reason === 'forfeit' ? 'forfeit' : 'complete',
      rounds,
    });
  };

  after(opts.delayMs ?? 3000, () => {
    handlers['match:found']({ duelId: 'demo', subject, you, opponent: them, startsInMs: DUEL_COUNTDOWN_MS });
    after(DUEL_COUNTDOWN_MS, () => startRound(0));
  });

  return {
    emit: (event, ...args) => {
      if (event === 'answer:submit') {
        const { index: i, key } = args[0] as { index: number; key: string };
        if (i !== index || mine || view.phase !== 'round') return;
        mine = { key, ms: Date.now() - roundStart };
        if (theirs) reveal();
      } else if (event === 'forfeit') finish('forfeit');
      else if (event === 'reaction:send' && rand(reactionId + 5) < 0.5) {
        after(1200, () => !ended && handlers['opponent:reaction']({ emoji: (args[0] as { emoji: string }).emoji === '😅' ? '🤝' : '🔥' }));
      }
    },
    close: () => {
      ended = true;
      timers.forEach(clearTimeout);
    },
  };
}

/* ------------------------------------------------------------------ */
/* Public API                                                          */
/* ------------------------------------------------------------------ */

export type DuelMode = 'live' | 'demo';

function begin(subject: string, mode: DuelMode, first: (t: Transport) => void, demoOpts: Parameters<typeof demoTransport>[1] = {}): void {
  transport?.close();
  set({ ...INITIAL, phase: mode === 'live' ? 'connecting' : 'searching', subject, searchStartedAt: Date.now() });
  if (mode === 'demo') {
    transport = demoTransport(subject, demoOpts);
    return;
  }
  transport = liveTransport(first);
}

/** Quick match: join the queue for a subject. */
export function startMatchmaking(subject: string, mode: DuelMode, demoOpts?: Parameters<typeof demoTransport>[1]): void {
  begin(subject, mode, (t) => t.emit('queue:join', { subject }), demoOpts);
}

/** Open (or accept) a friend's duel link. */
export function joinInvite(code: string, subject: string, mode: DuelMode, demoOpts?: Parameters<typeof demoTransport>[1]): void {
  begin(subject, mode, (t) => t.emit('invite:join', { code }), { delayMs: 1000, ...demoOpts });
}

export function submitAnswer(key: string): void {
  if (view.phase !== 'round' || !view.round || view.round.myKey) return;
  set({ round: { ...view.round, myKey: key, myMs: Date.now() - roundStartedLocal } });
  transport?.emit('answer:submit', { index: view.round.index, key });
}

/** Send a quick reaction to the opponent (fixed set, rate-limited like the server). */
export function sendReaction(emoji: DuelReaction): boolean {
  const live = view.phase === 'found' || view.phase === 'round' || view.phase === 'reveal';
  if (!live || !transport || Date.now() < view.reactionReadyAt || view.reactionsSent >= DUEL_REACTION_LIMIT) return false;
  set({ reactionReadyAt: Date.now() + DUEL_REACTION_COOLDOWN_MS, reactionsSent: view.reactionsSent + 1 });
  showReaction(emoji, 'you');
  transport.emit('reaction:send', { emoji });
  return true;
}

export function forfeit(): void {
  transport?.emit('forfeit');
}

/** Leave matchmaking (or clean up after the result). */
export function leaveDuel(): void {
  if (view.phase === 'searching' || view.phase === 'connecting') transport?.emit('queue:leave');
  transport?.close();
  transport = null;
  set(INITIAL);
}

export function duelView(): DuelView {
  return view;
}

export function useDuel(): DuelView {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => view,
    () => view,
  );
}
