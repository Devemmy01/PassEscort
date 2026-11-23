import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AttemptInput, SessionInput, SyncRequest, SyncResponse } from '../../../shared/api';
import { api } from '../api/client';

/**
 * Offline practice outbox (PRD §6: practice works with no connection; the
 * server stays the source of truth for scores). Every answer is persisted the
 * moment it's given, survives app restarts, and is flushed to
 * POST /practice/sync whenever a connection exists. The server re-marks the
 * answers and computes XP; re-sending is safe (attempt ids are idempotent).
 */
const KEY = 'outbox.v1';
const MAX_ATTEMPTS_PER_REQUEST = 400;
const STALE_SESSION_MS = 3 * 24 * 60 * 60 * 1000;

interface OutboxData {
  sessions: Record<string, SessionInput>;
  attempts: AttemptInput[];
  shares: number;
}

let data: OutboxData = { sessions: {}, attempts: [], shares: 0 };
let loaded: Promise<void> | null = null;
let flushing: Promise<SyncResponse | null> | null = null;

function load(): Promise<void> {
  if (!loaded) {
    loaded = AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (raw) data = JSON.parse(raw) as OutboxData;
      })
      .catch(() => undefined);
  }
  return loaded;
}

async function save(): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

export async function pendingCount(): Promise<number> {
  await load();
  return data.attempts.length + Object.values(data.sessions).filter((s) => s.completedAt).length;
}

export async function enqueueSession(s: SessionInput): Promise<void> {
  await load();
  data.sessions[s.id] = { ...data.sessions[s.id], ...s };
  await save();
}

export async function enqueueAttempt(a: AttemptInput): Promise<void> {
  await load();
  data.attempts = [...data.attempts.filter((x) => x.id !== a.id), a];
  await save();
}

export async function markSessionComplete(id: string, completedAt: string, secondsUsed?: number): Promise<void> {
  await load();
  const s = data.sessions[id];
  if (!s) return;
  data.sessions[id] = { ...s, completedAt, ...(secondsUsed !== undefined ? { secondsUsed } : {}) };
  await save();
}

export async function recordShare(): Promise<void> {
  await load();
  data.shares += 1;
  await save();
}

/**
 * Send everything pending. Returns the server's response (XP, level-ups,
 * badges, fresh profile) or null when offline/nothing to send. Concurrent
 * calls share one request.
 */
export function flush(): Promise<SyncResponse | null> {
  if (flushing) return flushing;
  flushing = (async () => {
    await load();
    let last: SyncResponse | null = null;
    // Drop sessions that were started but abandoned long ago.
    const now = Date.now();
    for (const [id, s] of Object.entries(data.sessions)) {
      if (!s.completedAt && now - Date.parse(s.startedAt) > STALE_SESSION_MS && !data.attempts.some((a) => a.sessionId === id)) delete data.sessions[id];
    }
    while (data.attempts.length || Object.values(data.sessions).some((s) => s.completedAt) || data.shares) {
      const attempts = data.attempts.slice(0, MAX_ATTEMPTS_PER_REQUEST);
      const sessionIds = new Set(attempts.map((a) => a.sessionId));
      // Completed sessions go once all their attempts are in this batch or already sent.
      for (const s of Object.values(data.sessions)) {
        if (s.completedAt && !data.attempts.slice(MAX_ATTEMPTS_PER_REQUEST).some((a) => a.sessionId === s.id)) sessionIds.add(s.id);
      }
      const sessions = [...sessionIds].map((id) => data.sessions[id]).filter((s): s is SessionInput => Boolean(s));
      const shares = data.shares;
      const body: SyncRequest = { sessions, attempts, ...(shares ? { shares } : {}) };
      const res = await api<SyncResponse>('POST', '/practice/sync', body);
      const sent = new Set(res.acceptedAttempts);
      data.attempts = data.attempts.filter((a) => !sent.has(a.id));
      for (const id of res.acceptedSessions) {
        const s = data.sessions[id];
        // Completed sessions are done; in-progress ones stay until they complete.
        if (s?.completedAt) delete data.sessions[id];
      }
      data.shares -= shares;
      await save();
      last = mergeResponses(last, res);
      if (!res.acceptedAttempts.length && !res.acceptedSessions.length) break;
    }
    return last;
  })()
    .catch((e) => {
      if (e && typeof e === 'object' && 'offline' in e && (e as { offline: boolean }).offline) return null;
      throw e;
    })
    .finally(() => {
      flushing = null;
    });
  return flushing;
}

function mergeResponses(a: SyncResponse | null, b: SyncResponse): SyncResponse {
  if (!a) return b;
  return {
    acceptedAttempts: [...a.acceptedAttempts, ...b.acceptedAttempts],
    acceptedSessions: [...a.acceptedSessions, ...b.acceptedSessions],
    results: [...a.results, ...b.results],
    xpAwarded: a.xpAwarded + b.xpAwarded,
    levelUps: [...a.levelUps, ...b.levelUps],
    newBadges: [...a.newBadges, ...b.newBadges],
    me: b.me,
  };
}

/** For sign-out: another student on the same phone must not inherit pending answers. */
export async function clearOutbox(): Promise<void> {
  data = { sessions: {}, attempts: [], shares: 0 };
  await AsyncStorage.removeItem(KEY);
}
