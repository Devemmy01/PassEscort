import { Schema, model, type Types } from "mongoose";

/** A finished duel (PRD §7). Live state is in memory (src/realtime/duels.ts); this is the record. */
export interface DuelDoc {
  subject: string;
  source: "matchmaking" | "invite";
  players: { user: Types.ObjectId | null; name: string; bot: boolean; score: number; xp: number; result: "win" | "loss" | "draw" }[];
  questions: string[];
  rounds: { question: string; answers: { key: string | null; ms: number | null; points: number }[] }[];
  endReason: "complete" | "forfeit";
  startedAt: Date;
  endedAt: Date;
}

const schema = new Schema<DuelDoc>(
  {
    subject: String,
    source: String,
    players: [{ _id: false, user: { type: Schema.Types.ObjectId, ref: "User", default: null }, name: String, bot: Boolean, score: Number, xp: Number, result: String }],
    questions: [String],
    rounds: [{ _id: false, question: String, answers: [{ _id: false, key: String, ms: Number, points: Number }] }],
    endReason: String,
    startedAt: Date,
    endedAt: Date,
  },
  { timestamps: true },
);
schema.index({ "players.user": 1, endedAt: -1 });

export default model<DuelDoc>("Duel", schema);
