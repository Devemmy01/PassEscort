import type { Difficulty, ExamBody, QuestionInput, QuestionOption } from '../types/question';

const EXAM_BODIES: ExamBody[] = ['JAMB', 'WAEC', 'NECO'];
const DIFFICULTIES: Difficulty[] = ['easy', 'medium', 'hard'];

/** Thrown by validateQuestion/validateQuestions with the offending record's position and reason. */
export class QuestionValidationError extends Error {
  constructor(index: number, reason: string) {
    super(`Invalid question at index ${index}: ${reason}`);
    this.name = 'QuestionValidationError';
  }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isOptionArray(value: unknown): value is QuestionOption[] {
  return (
    Array.isArray(value) &&
    value.length >= 2 &&
    value.every(
      (opt) =>
        opt !== null &&
        typeof opt === 'object' &&
        isNonEmptyString((opt as QuestionOption).key) &&
        isNonEmptyString((opt as QuestionOption).text)
    )
  );
}

/**
 * Validates and narrows one raw JSON record into a QuestionInput. Throws
 * QuestionValidationError with a precise, human-readable reason so bad
 * records in a bulk import file are easy to locate and fix.
 */
export function validateQuestion(raw: unknown, index: number): QuestionInput {
  if (raw === null || typeof raw !== 'object') {
    throw new QuestionValidationError(index, 'expected an object');
  }
  const q = raw as Record<string, unknown>;

  if (!isNonEmptyString(q.id)) throw new QuestionValidationError(index, 'missing or empty "id"');
  if (!isNonEmptyString(q.subject)) throw new QuestionValidationError(index, 'missing or empty "subject"');
  if (!EXAM_BODIES.includes(q.examBody as ExamBody)) {
    throw new QuestionValidationError(index, `"examBody" must be one of ${EXAM_BODIES.join(', ')}`);
  }
  if (typeof q.year !== 'number' || !Number.isInteger(q.year) || q.year < 1900) {
    throw new QuestionValidationError(index, '"year" must be an integer year');
  }
  if (!isNonEmptyString(q.topic)) throw new QuestionValidationError(index, 'missing or empty "topic"');
  if (!DIFFICULTIES.includes(q.difficulty as Difficulty)) {
    throw new QuestionValidationError(index, `"difficulty" must be one of ${DIFFICULTIES.join(', ')}`);
  }
  if (!isNonEmptyString(q.prompt)) throw new QuestionValidationError(index, 'missing or empty "prompt"');
  if (!isOptionArray(q.options)) {
    throw new QuestionValidationError(index, '"options" must be an array of at least 2 { key, text } entries');
  }
  if (!isNonEmptyString(q.answerKey)) throw new QuestionValidationError(index, 'missing or empty "answerKey"');
  const options = q.options as QuestionOption[];
  if (!options.some((opt) => opt.key === q.answerKey)) {
    throw new QuestionValidationError(index, `"answerKey" (${String(q.answerKey)}) does not match any option key`);
  }
  if (q.explanation !== undefined && typeof q.explanation !== 'string') {
    throw new QuestionValidationError(index, '"explanation" must be a string when present');
  }

  return {
    id: q.id as string,
    subject: (q.subject as string).trim(),
    examBody: q.examBody as ExamBody,
    year: q.year,
    topic: (q.topic as string).trim(),
    difficulty: q.difficulty as Difficulty,
    prompt: q.prompt as string,
    options,
    answerKey: q.answerKey as string,
    explanation: q.explanation as string | undefined,
  };
}

/** Validates a whole bulk-import array, failing on the first bad record. */
export function validateQuestions(raw: unknown[]): QuestionInput[] {
  return raw.map((item, index) => validateQuestion(item, index));
}
