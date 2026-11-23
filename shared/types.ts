/**
 * Shared domain types — used by the Expo app (frontend/) and the API
 * (backend/). Keep this folder free of runtime dependencies: pure TypeScript
 * only, so both builds can compile it as-is.
 */
export type ExamBody = 'JAMB' | 'WAEC' | 'NECO';
export const EXAM_BODIES: readonly ExamBody[] = ['JAMB', 'WAEC', 'NECO'];

export type Difficulty = 'easy' | 'medium' | 'hard';

export interface QuestionOption {
  key: string;
  text: string;
}
