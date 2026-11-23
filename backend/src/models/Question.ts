import { Schema, model } from "mongoose";
import type { QuestionDTO } from "../../../shared/api";

/** The central question bank (PRD §7). The app ships a seed copy and syncs changes by `updatedAt`. */
export interface QuestionDoc extends QuestionDTO {
  _id: string;
  updatedAt: Date;
  createdAt: Date;
}

const questionSchema = new Schema<QuestionDoc>(
  {
    _id: { type: String, required: true },
    subject: { type: String, required: true },
    examBody: { type: String, enum: ["JAMB", "WAEC", "NECO"], required: true },
    year: { type: Number, required: true },
    topic: { type: String, required: true },
    difficulty: { type: String, enum: ["easy", "medium", "hard"], required: true },
    prompt: { type: String, required: true },
    options: [{ _id: false, key: String, text: String }],
    answerKey: { type: String, required: true },
    explanation: { type: String },
  },
  { timestamps: true },
);
questionSchema.index({ subject: 1, examBody: 1 });
questionSchema.index({ updatedAt: 1, _id: 1 });

export default model<QuestionDoc>("Question", questionSchema);
