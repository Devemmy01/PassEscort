import { allQuestions, questionById as storeQuestionById } from '../content/questionStore';
import type { ExamBody, Question } from '../types/question';

/** Subjects launched first (PRD §5.2); the rest are shown as "More subjects". */
export const CORE_SUBJECTS = ['English', 'Mathematics', 'Physics', 'Chemistry', 'Biology', 'Economics'] as const;

export const CBT_QUESTION_COUNT = 40;
/** JAMB allots ~2h for 180 questions; 40 questions → 30 minutes. */
export const CBT_SECONDS = 30 * 60;

export function allSubjects(): string[] {
  const set = new Set(allQuestions().map((q) => q.subject));
  const core = CORE_SUBJECTS.filter((s) => set.has(s));
  const rest = [...set].filter((s) => !(CORE_SUBJECTS as readonly string[]).includes(s)).sort();
  return [...core, ...rest];
}

/** Deterministic Fisher–Yates using a small LCG so prototype sessions are stable. */
function shuffled<T>(items: T[], seed: number): T[] {
  const out = [...items];
  let s = seed >>> 0 || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Prototype stand-in for the on-device engine. Production swaps this for
 * `searchQuestions(db, { examBody, subject, limit })` from src/db, which is
 * already offline-first.
 */
export function pickQuestions(examBodies: ExamBody[], subject: string, count: number, seed = Date.now()): Question[] {
  const pool = allQuestions().filter((q) => examBodies.includes(q.examBody) && q.subject === subject);
  return shuffled(pool, seed).slice(0, count);
}

/**
 * What the bundled bank actually covers — marketing and onboarding copy is
 * computed from this, never typed, so it can't claim more than ships.
 * `countLabel` rounds down to the hundred ("1,800+").
 */
export function bankCoverage(): { total: number; countLabel: string; subjects: number } {
  const total = allQuestions().length;
  const floor = Math.floor(total / 100) * 100;
  return {
    total,
    countLabel: `${String(floor).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}+`,
    subjects: new Set(allQuestions().map((q) => q.subject)).size,
  };
}

export function questionById(id: string): Question | undefined {
  return storeQuestionById(id);
}

export function countQuestions(examBodies: ExamBody[], subject: string): number {
  return allQuestions().filter((q) => examBodies.includes(q.examBody) && q.subject === subject).length;
}
