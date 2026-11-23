import { Schema, model } from "mongoose";
import type { Explanation } from "../../../shared/api";

/** Cached AI explanation per question: generated once, served to everyone after. */
export interface ExplanationDoc extends Explanation {
  _id: string;
  provider: string;
  model: string;
  createdAt: Date;
}

const schema = new Schema<ExplanationDoc>(
  {
    _id: { type: String, required: true },
    summary: String,
    steps: [{ _id: false, title: String, body: String }],
    keyIdea: String,
    distractors: [{ _id: false, key: String, reason: String }],
    provider: String,
    model: String,
  },
  { timestamps: true },
);

export default model<ExplanationDoc>("Explanation", schema);
