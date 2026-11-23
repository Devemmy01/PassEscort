/**
 * Minimal slice of the expo-sqlite `SQLiteDatabase` API that the seeding and
 * query modules depend on. Kept as a standalone interface (rather than
 * importing expo-sqlite's own type) so this module has no dependency on
 * expo-sqlite and can be exercised in plain Node tests via a different
 * backend (see src/db/__tests__/nodeSqliteExecutor.ts).
 */
export interface SQLRunResult {
  changes: number;
  lastInsertRowId: number;
}

export interface SQLExecutor {
  execAsync(sql: string): Promise<void>;
  runAsync(sql: string, params?: unknown[]): Promise<SQLRunResult>;
  getAllAsync<T>(sql: string, params?: unknown[]): Promise<T[]>;
  getFirstAsync<T>(sql: string, params?: unknown[]): Promise<T | null>;
  withTransactionAsync(task: () => Promise<void>): Promise<void>;
}
