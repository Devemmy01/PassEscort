import { Schema, model, type Types } from "mongoose";

export interface PracticeSessionDoc {
  user: Types.ObjectId;
  clientId: string;
  mode: "cbt" | "objective";
  subject: string;
  examBody: "JAMB" | "WAEC" | "NECO";
  startedAt: Date;
  completedAt: Date | null;
  questionCount: number;
  secondsAllowed: number | null;
  secondsUsed: number | null;
  /** Completion XP and streak credit, given once. */
  completionAwarded: boolean;
}

const schema = new Schema<PracticeSessionDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientId: { type: String, required: true },
    mode: { type: String, enum: ["cbt", "objective"], required: true },
    subject: { type: String, required: true },
    examBody: { type: String, required: true },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, default: null },
    questionCount: { type: Number, required: true },
    secondsAllowed: { type: Number, default: null },
    secondsUsed: { type: Number, default: null },
    completionAwarded: { type: Boolean, default: false },
  },
  { timestamps: true },
);
schema.index({ user: 1, clientId: 1 }, { unique: true });

export default model<PracticeSessionDoc>("PracticeSession", schema);
