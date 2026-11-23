/**
 * HTTP API contract between the app and the server. Both sides compile
 * against these types, so a renamed field breaks the build, not production.
 * All money is in naira (integers); all times are ISO-8601 strings.
 */
import type { LevelInfo } from './levels';
import type { PlanId, ProductId } from './pricing';
import type { StreakState } from './streak';
import type { Difficulty, ExamBody, QuestionOption } from './types';

/* ---------------- Profile & progress ---------------- */

export interface ProfileDTO {
  name: string;
  email: string;
  emailVerified: boolean;
  exams: ExamBody[];
  subjects: string[];
  dailyMinutes: number;
  /** Personal invite/ambassador code. */
  referralCode: string;
  /** The code this student joined with, if any. */
  referredBy: string | null;
  onboarded: boolean;
  /** Which push notifications the student wants. */
  notify: NotifyPrefs;
}

export interface NotifyPrefs {
  /** Evening reminder when today's practice would keep (or repair) the streak. */
  reminders: boolean;
  /** A friend accepted your duel link. */
  duels: boolean;
  /** Friends joining with your code, payouts. */
  social: boolean;
}

export interface ProgressDTO {
  totalXp: number;
  level: LevelInfo;
  streak: { state: StreakState; days: number; best: number; repairable: boolean };
  gems: number;
  questionsAnswered: number;
  correctAnswers: number;
  todayAnswered: number;
  goalQuestions: number;
  sessionsCompleted: number;
  duelsWon: number;
  duelsLost: number;
  duelsDrawn: number;
  earnedBadges: string[];
  badgeProgress: Record<string, number>;
  mastery: Record<string, number>;
  /** Questions answered per WAT day, oldest → today (7 entries). */
  week: number[];
}

export interface EntitlementDTO {
  plan: PlanId;
  expiresAt: string | null;
  aiExplainsUsedToday: number;
  /** null = unlimited (paid plan). */
  aiExplainsLeft: number | null;
  /** Monthly plan's free streak repairs left this month. */
  freeRepairsLeft: number;
}

export interface MeDTO {
  profile: ProfileDTO;
  progress: ProgressDTO;
  entitlement: EntitlementDTO;
  isAmbassador: boolean;
}

export interface UpdateProfileRequest {
  name?: string;
  exams?: ExamBody[];
  subjects?: string[];
  dailyMinutes?: number;
  onboarded?: boolean;
  notify?: Partial<NotifyPrefs>;
}

export interface PushTokenRequest {
  token: string;
  platform: 'android' | 'ios' | 'web';
}

/* ---------------- Leaderboard & activity ---------------- */

export type LeaderboardScope = 'week' | 'all' | 'friends';

export interface LeaderboardEntry {
  rank: number;
  name: string;
  level: number;
  xp: number;
  me: boolean;
}

export interface LeaderboardDTO {
  scope: LeaderboardScope;
  /** "2026-W47" for the weekly board. */
  week: string;
  /** When the weekly board resets (next Monday 00:00 WAT). */
  resetsAt: string;
  entries: LeaderboardEntry[];
  /** The student's own row when they're outside the top entries. */
  me: LeaderboardEntry | null;
}

export interface ActivityDTO {
  /** WAT days with practice, oldest first (last 120 days). */
  days: { day: string; answered: number }[];
  streak: { days: number; best: number; state: 'active' | 'pending' | 'broken' };
  goalQuestions: number;
}

/* ---------------- Practice sync (offline outbox) ---------------- */

export type PracticeMode = 'cbt' | 'objective';

export interface AttemptInput {
  /** Client-generated id; re-sending the same attempt is a no-op. */
  id: string;
  sessionId: string;
  questionId: string;
  selectedKey: string | null;
  /**
   * The text of the option the student saw and picked. The server marks by
   * text when it has it, so answers stay correct even if a question's options
   * were reordered after this copy of the app was built.
   */
  selectedText?: string | null;
  answeredAt: string;
}

export interface SessionInput {
  id: string;
  mode: PracticeMode;
  subject: string;
  examBody: ExamBody;
  startedAt: string;
  /** Present once the student finished (submitted) the session. */
  completedAt?: string;
  questionCount: number;
  secondsAllowed?: number;
  secondsUsed?: number;
}

export interface SyncRequest {
  sessions: SessionInput[];
  attempts: AttemptInput[];
  /** Results shared to WhatsApp since the last sync (Show-Off badge). */
  shares?: number;
}

export interface SyncResponse {
  acceptedAttempts: string[];
  acceptedSessions: string[];
  results: { id: string; correct: boolean; xp: number }[];
  xpAwarded: number;
  /** Levels reached by this sync, in order (each gets a level-up moment). */
  levelUps: number[];
  newBadges: string[];
  me: MeDTO;
}

/* ---------------- Questions ---------------- */

export interface QuestionDTO {
  id: string;
  subject: string;
  examBody: ExamBody;
  year: number;
  topic: string;
  difficulty: Difficulty;
  prompt: string;
  options: QuestionOption[];
  answerKey: string;
  explanation?: string;
}

export interface QuestionSyncResponse {
  questions: QuestionDTO[];
  /** Pass back as `since` next time. */
  cursor: string;
}

export interface TheoryStepDTO {
  title: string;
  body: string;
  working?: string;
  marks?: number;
}

export interface TheorySolutionDTO {
  questionId: string;
  parts: { label: string; steps: TheoryStepDTO[]; answer: string }[];
}

/* ---------------- AI explanations ---------------- */

export interface Explanation {
  summary: string;
  steps: { title: string; body: string }[];
  keyIdea: string;
  distractors: { key: string; reason: string }[];
}

export interface ExplainResponse {
  explanation: Explanation;
  aiExplainsLeft: number | null;
  cached: boolean;
}

/* ---------------- Payments ---------------- */

export interface CheckoutRequest {
  product: ProductId;
  ambassadorCode?: string;
  method?: 'card' | 'bank_transfer' | 'ussd';
}

export interface CheckoutResponse {
  reference: string;
  authorizationUrl: string;
  amount: number;
}

export type PaymentStatus = 'pending' | 'success' | 'failed' | 'abandoned';

export interface PaymentStatusResponse {
  reference: string;
  product: ProductId;
  amount: number;
  status: PaymentStatus;
  paidAt: string | null;
  email: string;
  me: MeDTO;
}

/* ---------------- Gamification actions ---------------- */

export interface StreakRepairRequest {
  method: 'gems' | 'plan';
}

/* ---------------- Referrals & ambassadors ---------------- */

export interface RedeemCodeResponse {
  referredBy: string;
  /** Both sides get the gems once the new student finishes a first practice. */
  pendingGems: number;
}

export interface ReferralDTO {
  name: string;
  joinedAt: string;
  stage: 'joined' | 'practising' | 'subscribed';
  commission: number;
  pending: boolean;
}

export interface AmbassadorDashboardDTO {
  code: string;
  joinedAt: string;
  earnings: { pending: number; available: number; paid: number; lifetime: number };
  funnel: { joined: number; practising: number; subscribed: number };
  referrals: ReferralDTO[];
  payoutAccount: { bankCode: string; bank: string; accountNumberMasked: string; accountName: string } | null;
  payoutInFlight: { amount: number; requestedAt: string } | null;
}

export interface BankDTO {
  code: string;
  name: string;
}

export interface ResolveAccountResponse {
  accountName: string;
  matchesProfile: boolean;
}

/* ---------------- Duels ---------------- */

export interface DuelInviteDTO {
  code: string;
  link: string;
  subject: string;
  expiresAt: string;
  from: { name: string; level: number };
  status: 'open' | 'accepted' | 'expired';
}

export interface ApiError {
  error: string;
  code?: string;
}
