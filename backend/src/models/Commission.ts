import { Schema, model, type Types } from "mongoose";

/** Ambassador commission on one purchase (PRD §5.9, `ambassadors` collection in §7). */
export interface CommissionDoc {
  ambassador: Types.ObjectId;
  buyer: Types.ObjectId;
  transaction: Types.ObjectId;
  product: string;
  amount: number;
  /** Clears (becomes withdrawable) after the refund hold. */
  availableAt: Date;
  payout: Types.ObjectId | null;
  status: "open" | "requested" | "paid";
}

const schema = new Schema<CommissionDoc>(
  {
    ambassador: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    buyer: { type: Schema.Types.ObjectId, ref: "User", required: true },
    transaction: { type: Schema.Types.ObjectId, ref: "Transaction", required: true, unique: true },
    product: { type: String, required: true },
    amount: { type: Number, required: true },
    availableAt: { type: Date, required: true },
    payout: { type: Schema.Types.ObjectId, ref: "Payout", default: null },
    status: { type: String, enum: ["open", "requested", "paid"], default: "open" },
  },
  { timestamps: true },
);

export default model<CommissionDoc>("Commission", schema);
