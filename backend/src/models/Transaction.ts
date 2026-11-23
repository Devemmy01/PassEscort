import { Schema, model, type Types } from "mongoose";
import type { ProductId } from "../../../shared/pricing";
import type { PaymentStatus } from "../../../shared/api";

/** A purchase (PRD §7). Entitlement is granted only after the server verifies it with Paystack. */
export interface TransactionDoc {
  user: Types.ObjectId;
  reference: string;
  product: ProductId;
  amount: number;
  email: string;
  provider: "paystack" | "mock";
  status: PaymentStatus;
  ambassador: Types.ObjectId | null;
  ambassadorCode: string | null;
  paidAt: Date | null;
  fulfilled: boolean;
  providerResponse?: unknown;
}

const schema = new Schema<TransactionDoc>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    reference: { type: String, required: true, unique: true },
    product: { type: String, required: true },
    amount: { type: Number, required: true },
    email: { type: String, required: true },
    provider: { type: String, required: true },
    status: { type: String, enum: ["pending", "success", "failed", "abandoned"], default: "pending" },
    ambassador: { type: Schema.Types.ObjectId, ref: "User", default: null },
    ambassadorCode: { type: String, default: null },
    paidAt: { type: Date, default: null },
    fulfilled: { type: Boolean, default: false },
    providerResponse: { type: Schema.Types.Mixed },
  },
  { timestamps: true },
);

export default model<TransactionDoc>("Transaction", schema);
