import { Schema, model, type Types } from "mongoose";

export interface PayoutDoc {
  ambassador: Types.ObjectId;
  amount: number;
  reference: string;
  status: "requested" | "processing" | "paid" | "failed";
  bankName: string;
  accountNumberMasked: string;
  recipientCode: string;
  transferCode: string | null;
  failureReason: string | null;
  processedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const schema = new Schema<PayoutDoc>(
  {
    ambassador: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true },
    reference: { type: String, required: true, unique: true },
    status: { type: String, enum: ["requested", "processing", "paid", "failed"], default: "requested" },
    bankName: String,
    accountNumberMasked: String,
    recipientCode: String,
    transferCode: { type: String, default: null },
    failureReason: { type: String, default: null },
    processedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

export default model<PayoutDoc>("Payout", schema);
