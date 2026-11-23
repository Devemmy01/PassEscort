import type { Difficulty, ExamBody, QuestionOption } from '../../../shared/types';

export type { Difficulty, ExamBody, QuestionOption } from '../../../shared/types';

/** Shape expected in bulk-import JSON files, before validation. */
export interface QuestionInput {
  id: string;
  subject: string;
  examBody: ExamBody;
  year: number;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  options: QuestionOption[];
  answerKey: string;
  explanation?: string;
}

/** A validated question as stored in and read back from the local database. */
export interface Question extends QuestionInput {}

export interface QuestionFilters {
  subject?: string;
  examBody?: ExamBody;
  year?: number;
  topic?: string;
  difficulty?: Difficulty;
}

export interface QuestionSearchOptions extends QuestionFilters {
  /** Free-text search across the question prompt, topic and option text. */
  query?: string;
  limit?: number;
  offset?: number;
}

export interface FilterFacets {
  subjects: string[];
  examBodies: ExamBody[];
  years: number[];
  topics: string[];
}
