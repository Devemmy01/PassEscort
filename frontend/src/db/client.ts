import * as SQLite from 'expo-sqlite';
import type { SQLExecutor } from './executor';
import { initSchema } from './schema';

const DATABASE_NAME = 'passescort.db';

/**
 * Wraps an expo-sqlite database in the SQLExecutor shape. A thin explicit
 * adapter (rather than relying on structural typing against expo-sqlite's
 * own overloaded types) so our params are always a plain array, matching
 * how the seeding/query modules call it.
 */
function toExecutor(db: SQLite.SQLiteDatabase): SQLExecutor {
  return {
    execAsync: (sql) => db.execAsync(sql),
    runAsync: (sql, params = []) => db.runAsync(sql, params as SQLite.SQLiteBindParams),
    getAllAsync: (sql, params = []) => db.getAllAsync(sql, params as SQLite.SQLiteBindParams),
    getFirstAsync: (sql, params = []) => db.getFirstAsync(sql, params as SQLite.SQLiteBindParams),
    withTransactionAsync: (task) => db.withTransactionAsync(task),
  };
}

let dbPromise: Promise<SQLExecutor> | null = null;

/** Opens (or returns the already-open) on-device question bank database. */
export function getDatabase(): Promise<SQLExecutor> {
  if (!dbPromise) {
    dbPromise = (async () => {
      const raw = await SQLite.openDatabaseAsync(DATABASE_NAME);
      await raw.execAsync('PRAGMA journal_mode = WAL;');
      const db = toExecutor(raw);
      await initSchema(db);
      return db;
    })().catch((err) => {
      dbPromise = null;
      throw err;
    });
  }
  return dbPromise;
}
