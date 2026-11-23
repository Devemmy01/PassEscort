import type { DuelOutcome, CbtResult } from '../practice/types';
import type { ProductId } from '../game/pricing';
import type { TabKey } from '../components/Layout';
import type { ShareCardData } from '../social/shareCards';

export type PracticeState = 'loading' | 'empty' | 'offline' | 'offline-missing' | 'error';
export type AiExplainState = 'loading' | 'explanation' | 'gate' | 'offline' | 'error';

/** Every screen in the app and the params it takes. */
export type Routes = {
  Prototype: undefined;
  // WK01 — design system
  DesignBrand: undefined;
  DesignComponents: undefined;
  DesignSubjects: undefined;
  Splash: { next?: 'Welcome' | 'Prototype' };
  // WK02 — onboarding & auth
  Welcome: undefined;
  SignUp: undefined;
  Login: { error?: boolean } | undefined;
  ForgotPassword: undefined;
  OnboardExam: undefined;
  OnboardSubjects: undefined;
  OnboardTarget: undefined;
  OnboardMascot: undefined;
  // Tabs
  Home: { variant?: 'new' } | undefined;
  PracticeHub: undefined;
  DuelHub: undefined;
  Leaderboard: undefined;
  Profile: undefined;
  Settings: undefined;
  StreakCalendar: undefined;
  // WK03 — practice
  CbtIntro: { subject: string };
  CbtSession: { subject: string };
  CbtResult: { result: CbtResult };
  WaecSession: { subject: string; examBody: 'WAEC' | 'NECO'; tab?: 'objective' | 'theory' };
  PracticeStates: { mode: 'cbt' | 'waec'; state: PracticeState };
  // WK04 — gamification
  StreakRepair: undefined;
  LevelUp: { level: number };
  Badges: undefined;
  Levels: undefined;
  // WK05 — AI & monetization
  AiExplain: { questionId: string; state?: AiExplainState };
  Plans: { reason?: 'ai' | 'streak' | 'solutions' } | undefined;
  Checkout: { product: ProductId };
  /** `reference` is the verified Paystack reference (live); without it the screen shows the design state. */
  PaymentResult: { product: ProductId; status: 'success' | 'failed' | 'pending'; reference?: string };
  // WK06 — duels & social
  /** `inviteCode`: playing a friend's duel link (live). `inviteFrom`: prototype only. */
  Matchmaking: { subject: string; inviteCode?: string; inviteFrom?: string };
  /** Renders the shared duel session; the extra params only drive the demo engine. */
  DuelBattle: { subject: string; opponentIndex?: number; simulateDrop?: boolean };
  DuelResult: { outcome: DuelOutcome };
  DuelInvite: { subject?: string } | undefined;
  /** Opened from a duel link (`code`, live) or the prototype (`from`/`subject`, demo). */
  DuelInviteReceived: { code?: string; from?: string; subject?: string };
  /** Opens on `card` (real data from the screen that earned it); other kinds fall back to the student's own progress. */
  ShareCard: { card?: ShareCardData } | undefined;
  WaInvite: undefined;
  // WK07 / WK10 — referral & ambassador program (PRD §5.9)
  AmbassadorIntro: undefined;
  Ambassador: undefined;
  AmbassadorPayout: undefined;
  AmbassadorKit: undefined;
  // Engine demo
  QuestionBank: undefined;
};

export type RouteName = keyof Routes;

export const TAB_ROUTES: Record<TabKey, RouteName> = {
  home: 'Home',
  practice: 'PracticeHub',
  duels: 'DuelHub',
  leaderboard: 'Leaderboard',
  profile: 'Profile',
};
