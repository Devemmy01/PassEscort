import type { SQLExecutor } from './executor';

/**
 * Bumped whenever the table/index shape below changes. Stored in seed_meta
 * so a future app update can detect a stale on-device schema; the seeding
 * engine itself only ever CREATEs "IF NOT EXISTS" so this is informational
 * for now rather than driving a migration path.
 */
export const SCHEMA_VERSION = 1;

const CREATE_TABLES = `
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY NOT NULL,
  subject TEXT NOT NULL,
  exam_body TEXT NOT NULL,
  year INTEGER NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options_json TEXT NOT NULL,
  options_text TEXT NOT NULL,
  answer_key TEXT NOT NULL,
  explanation TEXT
);

CREATE INDEX IF NOT EXISTS idx_questions_subject ON questions(subject);
CREATE INDEX IF NOT EXISTS idx_questions_exam_body ON questions(exam_body);
CREATE INDEX IF NOT EXISTS idx_questions_year ON questions(year);
CREATE INDEX IF NOT EXISTS idx_questions_topic ON questions(subject, topic);
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions(difficulty);

CREATE VIRTUAL TABLE IF NOT EXISTS questions_fts USING fts5(
  qid UNINDEXED,
  prompt,
  topic,
  options_text,
  tokenize = 'porter unicode61'
);

CREATE TABLE IF NOT EXISTS seed_meta (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL
);
`;

const initPromises = new WeakMap<SQLExecutor, Promise<void>>();

/**
 * Creates the local schema if it doesn't already exist. Safe to call on
 * every app start — idempotent and cheap once the tables exist. Keyed per
 * SQLExecutor instance so independent databases (e.g. in tests) don't share
 * init state.
 */
export function initSchema(db: SQLExecutor): Promise<void> {
  let promise = initPromises.get(db);
  if (!promise) {
    promise = db.execAsync(CREATE_TABLES).catch((err) => {
      initPromises.delete(db);
      throw err;
    });
    initPromises.set(db, promise);
  }
  return promise;
}
