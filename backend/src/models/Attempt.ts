import { Schema, model, type Types } from "mongoose";

/** One answered question (PRD §7) — the source of truth for scoring. */
export interface AttemptDoc {
  user: Types.ObjectId;
  clientId: string;
  session: string;
  question: string;
  subject: string;
  difficulty: "easy" | "medium" | "hard";
  selectedKey: string | null;
  correct: boolean;
  xp: number;
  answeredAt: Date;
  day: string;
}

const schema = new Schema<AttemptDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    clientId: { type: String, required: true },
    session: { type: String, required: true },
    question: { type: String, required: true },
    subject: { type: String, required: true },
    difficulty: { type: String, required: true },
    selectedKey: { type: String, default: null },
    correct: { type: Boolean, required: true },
    xp: { type: Number, required: true },
    answeredAt: { type: Date, required: true },
    day: { type: String, required: true },
  },
  { timestamps: true },
);
// Re-sent attempts (offline outbox retries) are no-ops.
schema.index({ user: 1, clientId: 1 }, { unique: true });
schema.index({ user: 1, subject: 1, answeredAt: -1 });
schema.index({ user: 1, question: 1, day: 1 });

export default model<AttemptDoc>("Attempt", schema);
