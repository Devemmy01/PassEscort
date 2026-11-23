import { Schema, model } from "mongoose";
import type { TheorySolutionDTO } from "../../../shared/api";

/** Full worked solutions for theory questions — paid content (PRD §5.8), never bundled in the app. */
export interface TheorySolutionDoc extends Omit<TheorySolutionDTO, "questionId"> {
  _id: string;
}

const schema = new Schema<TheorySolutionDoc>({
  _id: { type: String, required: true },
  parts: [
    {
      _id: false,
      label: String,
      answer: String,
      steps: [{ _id: false, title: String, body: String, working: String, marks: Number }],
    },
  ],
});

export default model<TheorySolutionDoc>("TheorySolution", schema);
