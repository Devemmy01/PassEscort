import type { SQLExecutor } from './executor';
import { initSchema } from './schema';
import { validateQuestions } from './validateQuestion';
import type { QuestionInput } from '../types/question';

export interface SeedResult {
  /** True when the dataset hash matched what's already on disk and the import was skipped. */
  skipped: boolean;
  datasetVersion: string;
  questionCount: number;
}

const INSERT_CHUNK_SIZE = 300;

/**
 * Cheap, dependency-free 32-bit content hash (FNV-1a) used only to detect
 * whether a bulk-import dataset has changed since it was last seeded — not
 * a cryptographic hash.
 */
export function computeDatasetVersion(questions: QuestionInput[]): string {
  const json = JSON.stringify(questions);
  let hash = 0x811c9dc5;
  for (let i = 0; i < json.length; i++) {
    hash ^= json.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${questions.length}-${(hash >>> 0).toString(16)}`;
}

async function getMeta(db: SQLExecutor, key: string): Promise<string | null> {
  const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM seed_meta WHERE key = ?', [key]);
  return row?.value ?? null;
}

async function setMeta(db: SQLExecutor, key: string, value: string): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO seed_meta (key, value) VALUES (?, ?)', [key, value]);
}

/**
 * Bulk-imports a JSON array of questions into the local database.
 *
 * Idempotent: hashes the incoming dataset and skips the (relatively
 * expensive) rewrite if it matches the previously seeded version, so
 * re-running this on every app start is cheap once a device is seeded.
 * Pass `force: true` to re-import regardless (e.g. a "reset local data"
 * debug action).
 */
export async function seedQuestions(
  db: SQLExecutor,
  rawQuestions: unknown[],
  options: { force?: boolean } = {}
): Promise<SeedResult> {
  await initSchema(db);

  const questions = validateQuestions(rawQuestions);
  const datasetVersion = computeDatasetVersion(questions);

  if (!options.force) {
    const existingVersion = await getMeta(db, 'datasetVersion');
    if (existingVersion === datasetVersion) {
      return { skipped: true, datasetVersion, questionCount: questions.length };
    }
  }

  await db.withTransactionAsync(async () => {
    await db.runAsync('DELETE FROM questions');
    await db.runAsync('DELETE FROM questions_fts');

    for (let start = 0; start < questions.length; start += INSERT_CHUNK_SIZE) {
      const chunk = questions.slice(start, start + INSERT_CHUNK_SIZE);
      for (const q of chunk) {
        const optionsText = q.options.map((opt) => opt.text).join(' ');
        await db.runAsync(
          `INSERT OR REPLACE INTO questions
             (id, subject, exam_body, year, topic, difficulty, prompt, options_json, options_text, answer_key, explanation)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            q.id,
            q.subject,
            q.examBody,
            q.year,
            q.topic,
            q.difficulty,
            q.prompt,
            JSON.stringify(q.options),
            optionsText,
            q.answerKey,
            q.explanation ?? null,
          ]
        );
        await db.runAsync('INSERT INTO questions_fts (qid, prompt, topic, options_text) VALUES (?, ?, ?, ?)', [
          q.id,
          q.prompt,
          q.topic,
          optionsText,
        ]);
      }
    }

    await setMeta(db, 'datasetVersion', datasetVersion);
    await setMeta(db, 'questionCount', String(questions.length));
    await setMeta(db, 'seededAt', new Date().toISOString());
  });

  return { skipped: false, datasetVersion, questionCount: questions.length };
}
