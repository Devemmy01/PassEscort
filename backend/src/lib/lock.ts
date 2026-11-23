/**
 * Per-key async mutex. Gamification updates for one student run one at a
 * time, so two syncs arriving together can't double-count XP. (Single API
 * instance; with several instances, swap for a Redis lock.)
 */
const tails = new Map<string, Promise<unknown>>();

export async function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = tails.get(key) ?? Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  const tail = prev.then(() => next);
  tails.set(key, tail);
  try {
    await prev.catch(() => undefined);
    return await fn();
  } finally {
    release();
    if (tails.get(key) === tail) tails.delete(key);
  }
}
