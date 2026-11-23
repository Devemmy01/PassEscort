import type { Question } from '../types/question';

export interface CbtResult {
  subject: string;
  questions: Question[];
  answers: Record<string, string | undefined>;
  flagged: string[];
  secondsUsed: number;
  secondsAllowed: number;
  xpEarned: number;
  timedOut: boolean;
  /** False when finished offline: XP is provisional until the outbox syncs. */
  synced?: boolean;
  newBadges?: string[];
}

export interface DuelOpponent {
  name: string;
  level: number;
  /** Probability the simulated opponent answers correctly. */
  skill: number;
}

export interface DuelRound {
  questionId: string;
  myCorrect: boolean;
  mySeconds: number;
  theirCorrect: boolean;
  theirSeconds: number;
}

export interface DuelOutcome {
  subject: string;
  opponent: DuelOpponent & { bot?: boolean };
  rounds: DuelRound[];
  myScore: number;
  theirScore: number;
  /** XP the server awarded (absent in prototype samples → the XP rules apply). */
  xp?: number;
  /** A practice duel against Passy Bot: XP, but no W–L record. */
  practice?: boolean;
  reason?: 'complete' | 'forfeit' | 'opponent-forfeit';
}

export { DUEL_ROUNDS, DUEL_SECONDS_PER_QUESTION, roundPoints } from '../../../shared/duel';

export const OPPONENTS: DuelOpponent[] = [
  { name: 'Tunde Bakare', level: 8, skill: 0.6 },
  { name: 'Chioma Eze', level: 11, skill: 0.7 },
  { name: 'Musa Ibrahim', level: 6, skill: 0.5 },
  { name: 'Funmi Adeyemi', level: 9, skill: 0.65 },
];

