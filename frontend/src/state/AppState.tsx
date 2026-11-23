import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { useNetworkState } from 'expo-network';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { ExplainResponse, MeDTO, NotifyPrefs, PracticeMode, SyncResponse, UpdateProfileRequest } from '../../../shared/api';
import { dayKey } from '../../../shared/clock';
import { dailyGoalQuestions as goalFor } from '../../../shared/streak';
import { api, ApiError, setTokenSource } from '../api/client';
import { auth, type AuthUser } from '../auth';
import type { StreakState } from '../components/Progress';
import { syncContent } from '../content/questionStore';
import { levelFromXp, totalXpForLevel, xpForAnswer, type LevelInfo } from '../game/levels';
import { FREE_AI_EXPLAINS_PER_DAY, PRODUCTS, STREAK_REPAIR_GEMS, type PlanId, type ProductId } from '../game/pricing';
import { DEMO_REFERRALS, personalCode, purchaseStatus, type Referral } from '../game/referral';
import { registerForPush, unregisterPush, type PushPermission } from '../notifications/push';
import { enqueueAttempt, enqueueSession, flush, markSessionComplete, pendingCount, recordShare } from '../sync/outbox';
import type { ExamBody, Question } from '../types/question';

/* ------------------------------------------------------------------ */
/* State shape (what screens read)                                     */
/* ------------------------------------------------------------------ */

export interface Profile {
  name: string;
  email: string;
  exams: ExamBody[];
  subjects: string[];
  dailyMinutes: number;
  /** Which push notifications the student wants (server-side opt-out per category). */
  notify: NotifyPrefs;
}

export const DEFAULT_NOTIFY: NotifyPrefs = { reminders: true, duels: true, social: true };

export interface Progress {
  totalXp: number;
  streakDays: number;
  streakState: StreakState;
  /** A broken streak that can still be repaired (48-hour window). */
  streakRepairable: boolean;
  bestStreak: number;
  gems: number;
  questionsAnswered: number;
  correctAnswers: number;
  todayAnswered: number;
  sessionsCompleted: number;
  duelsWon: number;
  duelsLost: number;
  earnedBadges: string[];
  /** Progress toward each badge's target (server-computed in live mode). */
  badgeProgress: Record<string, number>;
  mastery: Record<string, number>;
  /** Questions answered per day, oldest → today (7 entries). */
  week: number[];
}

export interface Entitlement {
  plan: PlanId;
  expiresLabel?: string;
  aiExplainsUsedToday: number;
  freeRepairsLeft: number;
}

export interface PayoutAccount {
  bank: string;
  accountNumber: string;
  accountName: string;
}

/** Demo-mode ambassador data. In live mode the dashboard comes from the API; this is just a marker. */
export interface Ambassador {
  joinedDaysAgo: number;
  referrals: Referral[];
  payoutAccount?: PayoutAccount;
  payoutRequested?: number;
}

export interface AppState {
  profile: Profile;
  progress: Progress;
  entitlement: Entitlement;
  referralCode: string;
  referredBy: string | null;
  ambassador: Ambassador | null;
  online: boolean;
  onboarded: boolean;
  emailVerified: boolean;
}

/* ------------------------------------------------------------------ */
/* Demo presets (prototype index, web review links, store captures)    */
/* ------------------------------------------------------------------ */

const EMPTY_PROGRESS: Progress = {
  totalXp: 0,
  streakDays: 0,
  streakState: 'pending',
  streakRepairable: false,
  bestStreak: 0,
  gems: 50,
  questionsAnswered: 0,
  correctAnswers: 0,
  todayAnswered: 0,
  sessionsCompleted: 0,
  duelsWon: 0,
  duelsLost: 0,
  earnedBadges: [],
  badgeProgress: {},
  mastery: {},
  week: [0, 0, 0, 0, 0, 0, 0],
};

export const NEW_PROFILE: AppState = {
  profile: { name: '', email: '', exams: [], subjects: [], dailyMinutes: 20, notify: DEFAULT_NOTIFY },
  progress: EMPTY_PROGRESS,
  entitlement: { plan: 'free', aiExplainsUsedToday: 0, freeRepairsLeft: 0 },
  referralCode: '',
  referredBy: null,
  ambassador: null,
  online: true,
  onboarded: false,
  emailVerified: false,
};

export const DEMO_PROFILE: AppState = {
  profile: {
    name: 'Adaeze Okafor',
    email: 'adaeze@example.com',
    exams: ['JAMB', 'WAEC'],
    subjects: ['English', 'Mathematics', 'Physics', 'Chemistry'],
    dailyMinutes: 20,
    notify: DEFAULT_NOTIFY,
  },
  progress: {
    ...EMPTY_PROGRESS,
    totalXp: totalXpForLevel(7) + 180,
    streakDays: 12,
    bestStreak: 15,
    gems: 120,
    questionsAnswered: 486,
    correctAnswers: 341,
    todayAnswered: 8,
    sessionsCompleted: 23,
    duelsWon: 9,
    duelsLost: 5,
    earnedBadges: ['first-steps', 'century', 'on-fire', 'sharpshooter', 'duelist', 'early-bird', 'show-off'],
    mastery: { English: 0.78, Mathematics: 0.64, Physics: 0.52, Chemistry: 0.71 },
    week: [24, 30, 18, 0, 26, 32, 8],
  },
  entitlement: { plan: 'free', aiExplainsUsedToday: 1, freeRepairsLeft: 0 },
  referralCode: personalCode('Adaeze', 7),
  referredBy: null,
  ambassador: null,
  online: true,
  onboarded: true,
  emailVerified: true,
};

/** Demo student a month into the Ambassador program. */
export const DEMO_AMBASSADOR: AppState = {
  ...DEMO_PROFILE,
  ambassador: {
    joinedDaysAgo: 36,
    referrals: DEMO_REFERRALS,
    payoutAccount: { bank: 'GTBank', accountNumber: '0123456789', accountName: 'ADAEZE OKAFOR' },
  },
};

/** Questions per day implied by a daily-minutes target (~1 question / 45s). */
export const dailyGoalQuestions = goalFor;

/* ------------------------------------------------------------------ */
/* Server → screen state                                               */
/* ------------------------------------------------------------------ */

function expiresLabel(iso: string | null, plan: PlanId): string | undefined {
  if (!iso || plan === 'free') return undefined;
  const ms = Date.parse(iso) - Date.now();
  const hours = Math.max(0, Math.round(ms / 3600000));
  if (hours < 48) return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`;
  const days = Math.round(hours / 24);
  return plan === 'monthly' ? `Active for ${days} more days` : `Expires in ${days} days`;
}

export function stateFromMe(me: MeDTO, online: boolean): AppState {
  const p = me.progress;
  return {
    profile: {
      name: me.profile.name,
      email: me.profile.email,
      exams: me.profile.exams,
      subjects: me.profile.subjects,
      dailyMinutes: me.profile.dailyMinutes,
      notify: me.profile.notify ?? DEFAULT_NOTIFY,
    },
    progress: {
      totalXp: p.totalXp,
      streakDays: p.streak.days,
      streakState: p.streak.state,
      streakRepairable: p.streak.repairable,
      bestStreak: p.streak.best,
      gems: p.gems,
      questionsAnswered: p.questionsAnswered,
      correctAnswers: p.correctAnswers,
      todayAnswered: p.todayAnswered,
      sessionsCompleted: p.sessionsCompleted,
      duelsWon: p.duelsWon,
      duelsLost: p.duelsLost,
      earnedBadges: p.earnedBadges,
      badgeProgress: p.badgeProgress,
      mastery: p.mastery,
      week: p.week,
    },
    entitlement: {
      plan: me.entitlement.plan,
      expiresLabel: expiresLabel(me.entitlement.expiresAt, me.entitlement.plan),
      aiExplainsUsedToday: me.entitlement.aiExplainsUsedToday,
      freeRepairsLeft: me.entitlement.freeRepairsLeft,
    },
    referralCode: me.profile.referralCode,
    referredBy: me.profile.referredBy,
    ambassador: me.isAmbassador ? { joinedDaysAgo: 0, referrals: [] } : null,
    online,
    onboarded: me.profile.onboarded,
    emailVerified: me.profile.emailVerified,
  };
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export type Mode = 'live' | 'demo';
export type SessionStatus = 'loading' | 'signedOut' | 'signedIn';

export interface SessionOutcome {
  xp: number;
  levelUps: number[];
  newBadges: string[];
  /** False when offline: the result is provisional and syncs later. */
  synced: boolean;
}

export interface AppActions {
  mode: Mode;
  status: SessionStatus;
  user: AuthUser | null;
  state: AppState;
  level: LevelInfo;
  goalQuestions: number;
  hasPremium: boolean;
  aiExplainsLeft: number;
  /** Answers waiting to sync. */
  pending: number;

  /* Profile */
  updateProfile: (patch: Partial<Profile>) => void;
  saveProfile: (patch: UpdateProfileRequest) => Promise<void>;
  refresh: () => Promise<void>;
  applyMe: (me: MeDTO) => void;
  signOut: () => Promise<{ unsynced: number }>;
  /** Ask for notification permission (if undecided) and register this phone. */
  enablePush: () => Promise<PushPermission>;
  /** A friend's code to redeem once the account exists (deep link or sign-up field). */
  setPendingReferral: (code: string | null) => void;
  pendingReferral: string | null;

  /* Practice (server-scored in live mode) */
  startSession: (meta: { mode: PracticeMode; subject: string; examBody: ExamBody; questionCount: number; secondsAllowed?: number }) => string;
  answer: (sessionId: string, question: Question, selectedKey: string | null) => { correct: boolean; xp: number };
  finishSession: (sessionId: string, extra?: { secondsUsed?: number }) => Promise<SessionOutcome>;
  reportShare: () => void;

  /* Paid features */
  explain: (questionId: string) => Promise<ExplainResponse>;
  repairStreak: (method: 'gems' | 'plan') => Promise<boolean>;
  breakStreak: () => void;
  /** Demo-mode stand-in for a verified purchase. */
  purchase: (product: ProductId) => void;

  /* Duels (demo mode only; live duels are scored by the server) */
  recordDuel: (won: boolean) => void;
  awardXp: (amount: number) => number | null;

  /* Ambassador (demo mode; live screens call the API) */
  joinAmbassador: () => void;
  savePayoutAccount: (account: PayoutAccount) => void;
  requestPayout: (amount: number) => void;

  /* Dev */
  setOnline: (online: boolean) => void;
  load: (preset: AppState) => void;
}

const Ctx = createContext<AppActions | null>(null);
const meKey = (uid: string) => `me.v1:${uid}`;

interface LiveSession {
  mode: PracticeMode;
  subject: string;
  examBody: ExamBody;
  questionCount: number;
  combo: number;
  xp: number;
  /** Questions that already earned XP today (mirrors the server's once-a-day rule). */
  earned: Set<string>;
}

export function AppStateProvider({ children, initial, mode = 'live' }: { children: ReactNode; initial?: AppState; mode?: Mode }) {
  const [state, setState] = useState<AppState>(initial ?? NEW_PROFILE);
  const [status, setStatus] = useState<SessionStatus>(mode === 'demo' ? 'signedIn' : 'loading');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [pending, setPending] = useState(0);
  const [pendingReferral, setPendingReferral] = useState<string | null>(null);
  const [forcedOffline, setForcedOffline] = useState(false);
  const network = useNetworkState();
  const networkOnline = network.isConnected !== false && network.isInternetReachable !== false;
  const online = mode === 'demo' ? state.online : networkOnline && !forcedOffline;
  const sessions = useRef(new Map<string, LiveSession>());
  const earnedToday = useRef(new Set<string>());
  const userRef = useRef<AuthUser | null>(null);
  const draft = useRef<Partial<Profile>>({});

  const level = useMemo(() => levelFromXp(state.progress.totalXp), [state.progress.totalXp]);
  const hasPremium = state.entitlement.plan !== 'free';
  const aiExplainsLeft = hasPremium ? Infinity : Math.max(0, FREE_AI_EXPLAINS_PER_DAY - state.entitlement.aiExplainsUsedToday);

  const patchProgress = useCallback((fn: (p: Progress) => Partial<Progress>) => setState((s) => ({ ...s, progress: { ...s.progress, ...fn(s.progress) } })), []);

  const applyMe = useCallback(
    (me: MeDTO) => {
      setState(stateFromMe(me, online));
      const u = userRef.current;
      if (u) AsyncStorage.setItem(meKey(u.uid), JSON.stringify(me)).catch(() => undefined);
    },
    [online],
  );

  const refreshPending = useCallback(() => {
    pendingCount()
      .then(setPending)
      .catch(() => undefined);
  }, []);

  /** Sync the outbox and adopt the server's numbers. */
  const sync = useCallback(async (): Promise<SyncResponse | null> => {
    if (mode !== 'live' || !userRef.current) return null;
    try {
      const res = await flush();
      if (res) applyMe(res.me);
      return res;
    } catch {
      return null;
    } finally {
      refreshPending();
    }
  }, [mode, applyMe, refreshPending]);

  const refresh = useCallback(async () => {
    if (mode !== 'live' || !userRef.current) return;
    const synced = await sync();
    if (!synced) {
      try {
        applyMe(await api<MeDTO>('GET', '/users/me'));
      } catch {
        /* offline: keep the cached profile */
      }
    }
  }, [mode, sync, applyMe]);

  // Live: follow the auth session.
  useEffect(() => {
    if (mode !== 'live') return;
    setTokenSource(() => auth().getToken());
    return auth().onChange(async (u) => {
      userRef.current = u;
      setUser(u);
      if (!u) {
        setState({ ...NEW_PROFILE, profile: { ...NEW_PROFILE.profile, ...draft.current } });
        setStatus('signedOut');
        return;
      }
      // Instant start from the cached profile; then refresh from the server.
      try {
        const cached = await AsyncStorage.getItem(meKey(u.uid));
        if (cached) setState(stateFromMe(JSON.parse(cached) as MeDTO, true));
      } catch {
        /* no cache */
      }
      setStatus('signedIn');
      refreshPending();
      // Re-register silently if the student already allowed notifications (tokens can rotate).
      void registerForPush(false);
      try {
        applyMe(await api<MeDTO>('GET', '/users/me'));
        void flush()
          .then((r) => r && applyMe(r.me))
          .catch(() => undefined)
          .finally(refreshPending);
        void syncContent();
      } catch {
        /* offline start: cached profile, outbox waits */
      }
    });
  }, [mode, applyMe, refreshPending]);

  // Live: when the connection comes back, flush the outbox.
  const wasOnline = useRef(online);
  useEffect(() => {
    if (mode === 'live' && online && !wasOnline.current) void refresh();
    wasOnline.current = online;
    setState((s) => (s.online === online ? s : { ...s, online }));
  }, [online, mode, refresh]);

  const actions: AppActions = {
    mode,
    status,
    user,
    state: { ...state, online },
    level,
    goalQuestions: dailyGoalQuestions(state.profile.dailyMinutes),
    hasPremium,
    aiExplainsLeft,
    pending,
    pendingReferral,
    setPendingReferral,
    applyMe,

    updateProfile: (patch) => {
      draft.current = { ...draft.current, ...patch };
      setState((s) => ({ ...s, profile: { ...s.profile, ...patch } }));
    },

    saveProfile: async (patch) => {
      setState((s) => ({ ...s, profile: { ...s.profile, ...(patch as Partial<Profile>) }, onboarded: patch.onboarded ?? s.onboarded }));
      if (mode !== 'live') return;
      applyMe(await api<MeDTO>('PATCH', '/users/me', patch));
      draft.current = {};
    },

    refresh,

    enablePush: () => (mode === 'live' ? registerForPush(true) : Promise.resolve('unsupported' as const)),

    signOut: async () => {
      if (mode !== 'live') return { unsynced: 0 };
      await sync();
      const unsynced = await pendingCount();
      if (unsynced > 0) return { unsynced };
      const u = userRef.current;
      if (u) await AsyncStorage.removeItem(meKey(u.uid)).catch(() => undefined);
      await unregisterPush();
      await auth().signOut();
      return { unsynced: 0 };
    },

    startSession: (meta) => {
      const id = Crypto.randomUUID();
      sessions.current.set(id, { ...meta, combo: 0, xp: 0, earned: earnedToday.current });
      if (mode === 'live') {
        void enqueueSession({ id, ...meta, startedAt: new Date().toISOString() }).then(refreshPending);
      }
      return id;
    },

    answer: (sessionId, q, selectedKey) => {
      const s = sessions.current.get(sessionId);
      const correct = selectedKey !== null && selectedKey === q.answerKey;
      let xp = 0;
      if (s && selectedKey !== null) {
        s.combo = correct ? s.combo + 1 : 0;
        const key = `${q.id}|${dayKey(new Date())}`;
        if (correct && !s.earned.has(key)) {
          xp = xpForAnswer(true, q.difficulty, s.combo);
          s.earned.add(key);
        }
        s.xp += xp;
      }
      // Optimistic: show progress now; the server's numbers replace it on sync.
      if (selectedKey !== null) {
        patchProgress((p) => {
          const week = [...p.week];
          week[6] = (week[6] ?? 0) + 1;
          const prev = p.mastery[q.subject] ?? 0;
          return {
            totalXp: p.totalXp + xp,
            questionsAnswered: p.questionsAnswered + 1,
            correctAnswers: p.correctAnswers + (correct ? 1 : 0),
            todayAnswered: p.todayAnswered + 1,
            week,
            mastery: mode === 'demo' ? { ...p.mastery, [q.subject]: Math.min(1, Math.max(0, prev + (correct ? 0.01 : -0.005))) } : p.mastery,
          };
        });
      }
      if (mode === 'live') {
        const selectedText = selectedKey === null ? null : (q.options.find((o) => o.key === selectedKey)?.text ?? null);
        void enqueueAttempt({ id: Crypto.randomUUID(), sessionId, questionId: q.id, selectedKey, selectedText, answeredAt: new Date().toISOString() }).then(refreshPending);
      }
      return { correct, xp };
    },

    finishSession: async (sessionId, extra) => {
      const s = sessions.current.get(sessionId);
      sessions.current.delete(sessionId);
      const provisional = (s?.xp ?? 0) + 25;
      const before = levelFromXp(state.progress.totalXp).level;
      if (mode === 'demo') {
        // Local stand-in for the server's completion rules.
        const after = levelFromXp(state.progress.totalXp + 25).level;
        setState((st) => {
          const p = st.progress;
          const firstToday = p.streakState !== 'active';
          const streakDays = firstToday ? p.streakDays + 1 : p.streakDays;
          const earned = new Set(p.earnedBadges);
          earned.add('first-steps');
          if (streakDays >= 7) earned.add('on-fire');
          return {
            ...st,
            progress: { ...p, totalXp: p.totalXp + 25, sessionsCompleted: p.sessionsCompleted + 1, streakDays, bestStreak: Math.max(p.bestStreak, streakDays), streakState: 'active', earnedBadges: [...earned] },
          };
        });
        return { xp: provisional, levelUps: after > before ? [after] : [], newBadges: [], synced: true };
      }
      await markSessionComplete(sessionId, new Date().toISOString(), extra?.secondsUsed);
      patchProgress((p) => ({ totalXp: p.totalXp + 25 }));
      // Offline: keep the provisional result; the outbox syncs when the connection returns.
      if (!online) {
        refreshPending();
        return { xp: provisional, levelUps: [], newBadges: [], synced: false };
      }
      const res = await sync();
      if (!res) return { xp: provisional, levelUps: [], newBadges: [], synced: false };
      return { xp: res.xpAwarded, levelUps: res.levelUps, newBadges: res.newBadges, synced: true };
    },

    reportShare: () => {
      if (mode === 'live') void recordShare().then(() => sync());
    },

    explain: async (questionId) => {
      if (mode === 'live') {
        const r = await api<ExplainResponse>('POST', '/ai/explain', { questionId });
        setState((s) => ({
          ...s,
          entitlement: { ...s.entitlement, aiExplainsUsedToday: r.aiExplainsLeft === null ? s.entitlement.aiExplainsUsedToday : FREE_AI_EXPLAINS_PER_DAY - r.aiExplainsLeft },
        }));
        return r;
      }
      if (aiExplainsLeft <= 0) throw new ApiError(402, 'ai_quota', 'Daily free explanations used.');
      const { mockExplanation } = await import('../practice/aiExplain');
      if (!hasPremium) setState((s) => ({ ...s, entitlement: { ...s.entitlement, aiExplainsUsedToday: s.entitlement.aiExplainsUsedToday + 1 } }));
      return { explanation: mockExplanation(questionId), aiExplainsLeft: hasPremium ? null : aiExplainsLeft - 1, cached: true };
    },

    repairStreak: async (method) => {
      if (mode === 'live') {
        try {
          applyMe(await api<MeDTO>('POST', '/practice/streak/repair', { method }));
          return true;
        } catch {
          return false;
        }
      }
      if (method === 'gems' && state.progress.gems < STREAK_REPAIR_GEMS) return false;
      patchProgress((p) => ({
        gems: method === 'gems' ? p.gems - STREAK_REPAIR_GEMS : p.gems,
        streakState: 'pending',
        streakRepairable: false,
        earnedBadges: p.earnedBadges.includes('comeback') ? p.earnedBadges : [...p.earnedBadges, 'comeback'],
      }));
      return true;
    },

    breakStreak: () => patchProgress(() => ({ streakState: 'broken', streakRepairable: true })),

    purchase: (productId) => {
      const product = PRODUCTS[productId];
      setState((s) => {
        if (product.gems) return { ...s, progress: { ...s.progress, gems: s.progress.gems + product.gems } };
        return {
          ...s,
          entitlement: { ...s.entitlement, plan: productId === 'monthly' ? 'monthly' : 'day', expiresLabel: productId === 'monthly' ? 'Active for 30 more days' : 'Expires in 24 hours' },
        };
      });
    },

    recordDuel: (won) =>
      patchProgress((p) => ({
        duelsWon: p.duelsWon + (won ? 1 : 0),
        duelsLost: p.duelsLost + (won ? 0 : 1),
        earnedBadges: won && !p.earnedBadges.includes('duelist') ? [...p.earnedBadges, 'duelist'] : p.earnedBadges,
      })),

    awardXp: (amount) => {
      const before = levelFromXp(state.progress.totalXp).level;
      const after = levelFromXp(state.progress.totalXp + amount).level;
      patchProgress((p) => ({ totalXp: p.totalXp + amount }));
      return after > before ? after : null;
    },

    joinAmbassador: () =>
      setState((s) => ({
        ...s,
        referralCode: s.referralCode || personalCode(s.profile.name, s.profile.email.length + 7),
        ambassador: s.ambassador ?? { joinedDaysAgo: 0, referrals: [] },
      })),
    savePayoutAccount: (account) => setState((s) => (s.ambassador ? { ...s, ambassador: { ...s.ambassador, payoutAccount: account } } : s)),
    requestPayout: (amount) =>
      setState((s) =>
        s.ambassador
          ? {
              ...s,
              ambassador: {
                ...s.ambassador,
                payoutRequested: amount,
                referrals: s.ambassador.referrals.map((r) => ({
                  ...r,
                  purchases: r.purchases.map((p) => (purchaseStatus(p) === 'available' ? { ...p, paid: true } : p)),
                })),
              },
            }
          : s,
      ),

    setOnline: (o) => {
      if (mode === 'demo') setState((s) => ({ ...s, online: o }));
      else setForcedOffline(!o);
    },
    load: (preset) => setState(preset),
  };

  return <Ctx.Provider value={actions}>{children}</Ctx.Provider>;
}

export function useApp(): AppActions {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useApp must be used inside <AppStateProvider>');
  return ctx;
}
