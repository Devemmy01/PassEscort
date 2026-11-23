/**
 * 1v1 duel rules (PRD §5.6). The server owns the clock and scoring; the app
 * only renders what the server sends (src/realtime on the backend).
 */
/** 10 rounds (Figma PvP) × 15s: about three minutes, light on data. Decided 2026-11-21. */
export const DUEL_ROUNDS = 10;
export const DUEL_SECONDS_PER_QUESTION = 15;
/** How long both players see the answer and points before the next round. */
export const DUEL_REVEAL_MS = 1600;
/** 3-2-1 countdown between "match found" and round 1. */
export const DUEL_COUNTDOWN_MS = 3000;
/** Matchmaking widens the level range after this long. */
export const DUEL_WIDEN_AFTER_MS = 10_000;
/** Players within this many levels are matched first. */
export const DUEL_LEVEL_RANGE = 5;
/** Name shown for the practice opponent. Always labelled as a bot in the app. */
export const DUEL_BOT_NAME = 'Passy Bot';
/** A dropped player has this long to reconnect before forfeiting; the round clock pauses meanwhile. */
export const DUEL_RECONNECT_GRACE_MS = 20_000;
/** Duel invite links work for one opponent and expire after 15 minutes. */
export const DUEL_INVITE_TTL_MS = 15 * 60 * 1000;

/**
 * Quick reactions during a duel (Figma PvP). A fixed set — no free text, so
 * nothing to moderate — rate-limited per player.
 */
export const DUEL_REACTIONS = ['👏', '🔥', '😅', '😮', '💪', '🤝'] as const;
export type DuelReaction = (typeof DUEL_REACTIONS)[number];
export const DUEL_REACTION_COOLDOWN_MS = 1500;
export const DUEL_REACTION_LIMIT = 20;

export function isDuelReaction(x: unknown): x is DuelReaction {
  return typeof x === 'string' && (DUEL_REACTIONS as readonly string[]).includes(x);
}

/** Points: 100 for a correct answer plus up to 50 for speed. */
export function roundPoints(correct: boolean, seconds: number): number {
  if (!correct) return 0;
  const speed = Math.max(0, DUEL_SECONDS_PER_QUESTION - seconds) / DUEL_SECONDS_PER_QUESTION;
  return 100 + Math.round(50 * speed);
}

export type DuelResult = 'win' | 'loss' | 'draw';

export function duelResult(myScore: number, theirScore: number): DuelResult {
  return myScore > theirScore ? 'win' : myScore < theirScore ? 'loss' : 'draw';
}

/* Socket.io contract (namespace "/duels"). Server → client events carry no answer keys until reveal. */
export interface DuelPlayerView {
  id: string;
  name: string;
  level: number;
  bot?: boolean;
}

export interface DuelQuestionView {
  id: string;
  prompt: string;
  options: { key: string; text: string }[];
}

export interface DuelServerEvents {
  'match:found': (p: { duelId: string; subject: string; you: DuelPlayerView; opponent: DuelPlayerView; startsInMs: number }) => void;
  'match:waiting': (p: { subject: string; elapsedMs: number }) => void;
  'round:start': (p: { index: number; total: number; question: DuelQuestionView; deadline: number; serverNow: number }) => void;
  'opponent:answered': (p: { index: number; ms: number }) => void;
  'opponent:reaction': (p: { emoji: DuelReaction }) => void;
  'round:reveal': (p: {
    index: number;
    correctKey: string;
    you: { key: string | null; ms: number | null; points: number; total: number };
    opponent: { key: string | null; ms: number | null; points: number; total: number };
  }) => void;
  'duel:paused': (p: { reason: 'opponent-disconnected'; graceMs: number }) => void;
  'duel:resumed': (p: { deadline: number; serverNow: number }) => void;
  'duel:end': (p: {
    duelId: string;
    result: DuelResult;
    you: number;
    opponent: number;
    xp: number;
    /** Levels reached thanks to this duel's XP (each gets a level-up moment). */
    levelUps: number[];
    /** Practice duels against Passy Bot give XP but don't count toward the W–L record or badges. */
    practice: boolean;
    reason: 'complete' | 'forfeit' | 'opponent-forfeit';
    rounds: { questionId: string; youCorrect: boolean; youMs: number | null; themCorrect: boolean; themMs: number | null }[];
  }) => void;
  'duel:error': (p: { code: string; message: string }) => void;
}

export interface DuelClientEvents {
  'queue:join': (p: { subject: string }) => void;
  'queue:leave': () => void;
  'invite:join': (p: { code: string }) => void;
  /** After reconnecting mid-duel, ask for the current round again. */
  'duel:rejoin': () => void;
  'answer:submit': (p: { index: number; key: string }) => void;
  forfeit: () => void;
  'reaction:send': (p: { emoji: string }) => void;
}
