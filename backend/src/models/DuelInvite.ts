import { Schema, model, type Types } from "mongoose";

export interface DuelInviteDoc {
  code: string;
  from: Types.ObjectId;
  subject: string;
  expiresAt: Date;
  acceptedBy: Types.ObjectId | null;
}

const schema = new Schema<DuelInviteDoc>(
  {
    code: { type: String, required: true, unique: true },
    from: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subject: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    acceptedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true },
);
// Mongo removes expired invites a day after they lapse.
schema.index({ expiresAt: 1 }, { expireAfterSeconds: 24 * 60 * 60 });

export default model<DuelInviteDoc>("DuelInvite", schema);
