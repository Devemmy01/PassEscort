import type { SQLExecutor } from './executor';
import type { FilterFacets, Question, QuestionFilters, QuestionOption, QuestionSearchOptions } from '../types/question';

interface QuestionRow {
  id: string;
  subject: string;
  exam_body: Question['examBody'];
  year: number;
  topic: string;
  difficulty: Question['difficulty'];
  prompt: string;
  options_json: string;
  answer_key: string;
  explanation: string | null;
}

function mapRow(row: QuestionRow): Question {
  return {
    id: row.id,
    subject: row.subject,
    examBody: row.exam_body,
    year: row.year,
    topic: row.topic,
    difficulty: row.difficulty,
    prompt: row.prompt,
    options: JSON.parse(row.options_json) as QuestionOption[],
    answerKey: row.answer_key,
    explanation: row.explanation ?? undefined,
  };
}

// Every selected column is prefixed with the `q` alias: the FTS-backed
// search query joins questions_fts (aliased `f`), which has its own
// `prompt`/`topic`/`options_text` columns, so unqualified names would be
// ambiguous there.
const SELECT_COLUMNS =
  'q.id, q.subject, q.exam_body, q.year, q.topic, q.difficulty, q.prompt, q.options_json, q.answer_key, q.explanation';

function buildFilterClause(filters: QuestionFilters, alias = 'q'): { clause: string; params: unknown[] } {
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filters.subject) {
    conditions.push(`${alias}.subject = ?`);
    params.push(filters.subject);
  }
  if (filters.examBody) {
    conditions.push(`${alias}.exam_body = ?`);
    params.push(filters.examBody);
  }
  if (filters.year !== undefined) {
    conditions.push(`${alias}.year = ?`);
    params.push(filters.year);
  }
  if (filters.topic) {
    conditions.push(`${alias}.topic = ?`);
    params.push(filters.topic);
  }
  if (filters.difficulty) {
    conditions.push(`${alias}.difficulty = ?`);
    params.push(filters.difficulty);
  }

  return { clause: conditions.length ? `WHERE ${conditions.join(' AND ')}` : '', params };
}

/**
 * Turns free-text user input into an FTS5 MATCH expression: each word
 * becomes a sanitized prefix term (so results appear while the user is
 * still typing), ANDed together. Returns null for input with no usable
 * tokens (e.g. blank, or only punctuation).
 */
export function buildFtsMatchQuery(query: string): string | null {
  const tokens = query
    .split(/\s+/)
    .map((token) => token.replace(/[^\p{L}\p{N}]/gu, ''))
    .filter((token) => token.length > 0);

  if (tokens.length === 0) return null;
  return tokens.map((token) => `"${token}"*`).join(' ');
}

/**
 * Searches and/or filters the local question bank. With a `query`, ranks
 * matches by FTS5 relevance (bm25); without one, returns filtered results
 * ordered newest-year-first. Both paths hit the same indexed columns, so
 * results come back well within a UI's search-as-you-type debounce window.
 */
export async function searchQuestions(db: SQLExecutor, options: QuestionSearchOptions = {}): Promise<Question[]> {
  const limit = options.limit ?? 50;
  const offset = options.offset ?? 0;
  const matchQuery = options.query ? buildFtsMatchQuery(options.query) : null;

  if (matchQuery) {
    const { clause, params } = buildFilterClause(options, 'q');
    const rows = await db.getAllAsync<QuestionRow>(
      `SELECT ${SELECT_COLUMNS} FROM questions_fts f
       JOIN questions q ON q.id = f.qid
       WHERE f.questions_fts MATCH ? ${clause ? `AND ${clause.slice('WHERE '.length)}` : ''}
       ORDER BY bm25(f.questions_fts)
       LIMIT ? OFFSET ?`,
      [matchQuery, ...params, limit, offset]
    );
    return rows.map(mapRow);
  }

  const { clause, params } = buildFilterClause(options, 'q');
  const rows = await db.getAllAsync<QuestionRow>(
    `SELECT ${SELECT_COLUMNS} FROM questions q
     ${clause}
     ORDER BY q.year DESC, q.subject, q.topic
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return rows.map(mapRow);
}

export async function getQuestionById(db: SQLExecutor, id: string): Promise<Question | null> {
  const row = await db.getFirstAsync<QuestionRow>(`SELECT ${SELECT_COLUMNS} FROM questions q WHERE q.id = ?`, [id]);
  return row ? mapRow(row) : null;
}

export async function getQuestionCount(db: SQLExecutor, filters: QuestionFilters = {}): Promise<number> {
  const { clause, params } = buildFilterClause(filters, 'q');
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM questions q ${clause}`,
    params
  );
  return row?.count ?? 0;
}

/** Distinct values for building filter UIs (subject/exam-body/year/topic pickers). */
export async function getFilterFacets(db: SQLExecutor): Promise<FilterFacets> {
  const [subjects, examBodies, years, topics] = await Promise.all([
    db.getAllAsync<{ subject: string }>('SELECT DISTINCT subject FROM questions ORDER BY subject'),
    db.getAllAsync<{ exam_body: Question['examBody'] }>('SELECT DISTINCT exam_body FROM questions ORDER BY exam_body'),
    db.getAllAsync<{ year: number }>('SELECT DISTINCT year FROM questions ORDER BY year DESC'),
    db.getAllAsync<{ topic: string }>('SELECT DISTINCT topic FROM questions ORDER BY topic'),
  ]);

  return {
    subjects: subjects.map((r) => r.subject),
    examBodies: examBodies.map((r) => r.exam_body),
    years: years.map((r) => r.year),
    topics: topics.map((r) => r.topic),
  };
}
