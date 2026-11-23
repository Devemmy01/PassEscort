import { Schema, model, type HydratedDocument, type Types } from "mongoose";
import type { PlanId } from "../../../shared/pricing";
import type { Streak } from "../../../shared/streak";
import type { ExamBody } from "../../../shared/types";

/** Everything the gamification engine tracks. Server-owned (PRD §6). */
export interface UserStats {
  questionsAnswered: number;
  correctAnswers: number;
  sessionsCompleted: number;
  /** Correct answers in a row right now, and the best ever (Sharpshooter). */
  currentRun: number;
  bestCorrectRun: number;
  fastSprints: number;
  perfectSprints: number;
  earlyDays: number;
  lastEarlyDay: string | null;
  nightDays: number;
  lastNightDay: string | null;
  duelsWon: number;
  duelsLost: number;
  duelsDrawn: number;
  streakRepairs: number;
  friendsJoined: number;
  shares: number;
}

export interface PayoutAccount {
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  /** Paystack transfer recipient code. */
  recipientCode: string;
}

export interface UserDoc {
  firebaseUid: string;
  email: string;
  emailVerified: boolean;
  name: string;
  exams: ExamBody[];
  subjects: string[];
  dailyMinutes: number;
  onboarded: boolean;

  referralCode: string;
  referredByCode: string | null;
  referredByUser: Types.ObjectId | null;
  referredAt: Date | null;
  /** Invite gems paid to both sides (once, on the new student's first completed session). */
  referralRewarded: boolean;

  xp: number;
  gems: number;
  streak: Streak;
  stats: UserStats;
  badges: { id: string; earnedAt: Date }[];
  mastery: Map<string, number>;
  /** Answers per WAT day, newest last; trimmed to 30 entries. */
  activity: { day: string; answered: number }[];
  dailyGoalDay: string | null;

  plan: PlanId;
  planExpiresAt: Date | null;
  aiDay: string | null;
  aiUsed: number;
  freeRepairsMonth: string | null;
  freeRepairsUsed: number;

  ambassador: { joinedAt: Date; payoutAccount: PayoutAccount | null } | null;

  /** Weekly leaderboard: XP earned in `weekKey` (WAT ISO week). */
  weekKey: string | null;
  weekXp: number;

  /** Expo push tokens, one per device (delivered via FCM on Android, APNs on iOS). */
  pushTokens: { token: string; platform: "android" | "ios" | "web"; updatedAt: Date }[];
  notify: { reminders: boolean; duels: boolean; social: boolean };
  lastReminderDay: string | null;

  createdAt: Date;
  updatedAt: Date;
}

const stats = {
  questionsAnswered: { type: Number, default: 0 },
  correctAnswers: { type: Number, default: 0 },
  sessionsCompleted: { type: Number, default: 0 },
  currentRun: { type: Number, default: 0 },
  bestCorrectRun: { type: Number, default: 0 },
  fastSprints: { type: Number, default: 0 },
  perfectSprints: { type: Number, default: 0 },
  earlyDays: { type: Number, default: 0 },
  lastEarlyDay: { type: String, default: null },
  nightDays: { type: Number, default: 0 },
  lastNightDay: { type: String, default: null },
  duelsWon: { type: Number, default: 0 },
  duelsLost: { type: Number, default: 0 },
  duelsDrawn: { type: Number, default: 0 },
  streakRepairs: { type: Number, default: 0 },
  friendsJoined: { type: Number, default: 0 },
  shares: { type: Number, default: 0 },
};

const userSchema = new Schema<UserDoc>(
  {
    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, default: "" },
    emailVerified: { type: Boolean, default: false },
    name: { type: String, default: "" },
    exams: [{ type: String, enum: ["JAMB", "WAEC", "NECO"] }],
    subjects: [{ type: String }],
    dailyMinutes: { type: Number, default: 20 },
    onboarded: { type: Boolean, default: false },

    referralCode: { type: String, required: true, unique: true },
    referredByCode: { type: String, default: null },
    referredByUser: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    referredAt: { type: Date, default: null },
    referralRewarded: { type: Boolean, default: false },

    xp: { type: Number, default: 0 },
    gems: { type: Number, default: 50 },
    streak: {
      days: { type: Number, default: 0 },
      best: { type: Number, default: 0 },
      lastActiveDay: { type: String, default: null },
    },
    stats: { type: stats, default: () => ({}) },
    badges: [{ _id: false, id: String, earnedAt: Date }],
    mastery: { type: Map, of: Number, default: () => new Map() },
    activity: [{ _id: false, day: String, answered: Number }],
    dailyGoalDay: { type: String, default: null },

    plan: { type: String, enum: ["free", "day", "monthly"], default: "free" },
    planExpiresAt: { type: Date, default: null },
    aiDay: { type: String, default: null },
    aiUsed: { type: Number, default: 0 },
    freeRepairsMonth: { type: String, default: null },
    freeRepairsUsed: { type: Number, default: 0 },

    weekKey: { type: String, default: null },
    weekXp: { type: Number, default: 0 },
    pushTokens: [{ _id: false, token: String, platform: String, updatedAt: Date }],
    notify: {
      reminders: { type: Boolean, default: true },
      duels: { type: Boolean, default: true },
      social: { type: Boolean, default: true },
    },
    lastReminderDay: { type: String, default: null },

    ambassador: {
      type: new Schema(
        {
          joinedAt: { type: Date, required: true },
          payoutAccount: {
            type: new Schema(
              {
                bankCode: String,
                bankName: String,
                accountNumber: String,
                accountName: String,
                recipientCode: String,
              },
              { _id: false },
            ),
            default: null,
          },
        },
        { _id: false },
      ),
      default: null,
    },
  },
  { timestamps: true, optimisticConcurrency: true },
);

userSchema.index({ weekKey: 1, weekXp: -1 });
userSchema.index({ xp: -1 });
userSchema.index({ "pushTokens.token": 1 });

export type UserDocument = HydratedDocument<UserDoc>;

export default model<UserDoc>("User", userSchema);
