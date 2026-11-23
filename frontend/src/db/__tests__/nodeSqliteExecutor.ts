import { DatabaseSync } from 'node:sqlite';
import type { SQLExecutor } from '../executor';

/**
 * Test-only SQLExecutor backed by Node's built-in sqlite module, so the
 * seeding/query/schema modules can be exercised against a real SQLite
 * engine (including FTS5) without needing expo-sqlite's native runtime.
 */
export function createNodeSqliteExecutor(): SQLExecutor {
  const db = new DatabaseSync(':memory:');

  return {
    async execAsync(sql) {
      db.exec(sql);
    },
    async runAsync(sql, params = []) {
      const info = db.prepare(sql).run(...(params as never[]));
      return { changes: Number(info.changes), lastInsertRowId: Number(info.lastInsertRowid) };
    },
    async getAllAsync<T>(sql: string, params: unknown[] = []) {
      return db.prepare(sql).all(...(params as never[])) as T[];
    },
    async getFirstAsync<T>(sql: string, params: unknown[] = []) {
      const row = db.prepare(sql).get(...(params as never[]));
      return (row ?? null) as T | null;
    },
    async withTransactionAsync(task) {
      db.exec('BEGIN');
      try {
        await task();
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    },
  };
}
