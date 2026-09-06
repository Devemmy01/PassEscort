import { Schema, model, type InferSchemaType } from "mongoose";

const userSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true, index: true },
    email: { type: String },
    displayName: { type: String },
    targetExam: { type: String, enum: ["JAMB", "WAEC", "NECO"] },
    subjects: [{ type: String }],
    dailyTargetMinutes: { type: Number, default: 20 },
  },
  { timestamps: true }
);

export type User = InferSchemaType<typeof userSchema>;

export default model("User", userSchema);
