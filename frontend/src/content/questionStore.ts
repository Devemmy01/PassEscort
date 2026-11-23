import AsyncStorage from '@react-native-async-storage/async-storage';
import type { QuestionDTO, QuestionSyncResponse } from '../../../shared/api';
import { api } from '../api/client';
import { allSeedQuestions } from '../data/allQuestions';
import type { QuestionInput } from '../types/question';

/**
 * The on-device question bank: the bundled seed plus any questions the
 * content team has added or corrected since this build (PRD §11: MongoDB is
 * the source, synced to the device). Reads are synchronous, so practice works
 * offline exactly as before; `syncContent()` pulls changes when online.
 */
const KEY = 'content.delta.v1';

let byId = new Map<string, QuestionInput>(allSeedQuestions.map((q) => [q.id, q]));
let list: QuestionInput[] = allSeedQuestions;
let cursor: string | null = null;
let version = 0;
const listeners = new Set<() => void>();

function rebuild(delta: Record<string, QuestionInput>) {
  byId = new Map(allSeedQuestions.map((q) => [q.id, q]));
  for (const q of Object.values(delta)) byId.set(q.id, q);
  list = [...byId.values()];
  version++;
  listeners.forEach((l) => l());
}

export function allQuestions(): QuestionInput[] {
  return list;
}

export function questionById(id: string): QuestionInput | undefined {
  return byId.get(id);
}

export function contentVersion(): number {
  return version;
}

export function onContentChange(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

/** Load the stored delta (call once at startup). */
export async function loadContent(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return;
    const saved = JSON.parse(raw) as { cursor: string; questions: Record<string, QuestionInput> };
    cursor = saved.cursor;
    if (Object.keys(saved.questions).length) rebuild(saved.questions);
  } catch {
    /* a corrupt cache just means re-syncing */
  }
}

const fromDTO = (q: QuestionDTO): QuestionInput => ({ ...q });

/** Pull new or changed questions. Silent on failure — the bundled bank always works. */
export async function syncContent(): Promise<number> {
  try {
    if (cursor === null) {
      cursor = (await api<{ cursor: string }>('GET', '/questions/cursor')).cursor;
      await AsyncStorage.setItem(KEY, JSON.stringify({ cursor, questions: {} }));
      return 0;
    }
    const raw = await AsyncStorage.getItem(KEY);
    const delta: Record<string, QuestionInput> = raw ? JSON.parse(raw).questions : {};
    let changed = 0;
    let since: string = cursor;
    for (let page = 0; page < 20; page++) {
      const r: QuestionSyncResponse = await api<QuestionSyncResponse>('GET', `/questions/sync?since=${encodeURIComponent(since)}`);
      if (!r.questions.length) break;
      for (const q of r.questions) delta[q.id] = fromDTO(q);
      changed += r.questions.length;
      since = r.cursor;
    }
    cursor = since;
    if (changed) {
      await AsyncStorage.setItem(KEY, JSON.stringify({ cursor, questions: delta }));
      rebuild(delta);
    }
    return changed;
  } catch {
    return 0;
  }
}
