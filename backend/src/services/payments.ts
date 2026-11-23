/**
 * Purchases (PRD §5.8): Day Pass, Monthly, gem packs — via Paystack.
 * Flow: checkout → Paystack hosted page → the app (and Paystack's webhook)
 * ask us to confirm → we verify with Paystack → fulfil exactly once.
 * Fulfilment is idempotent: the app's verify call and the webhook can race.
 */
import type { CheckoutRequest, CheckoutResponse, PaymentStatusResponse } from "../../../shared/api";
import { PRODUCTS, type ProductId } from "../../../shared/pricing";
import { AMBASSADOR_RULES, commissionFor, normalizeCode } from "../../../shared/referral";
import { env } from "../config/env";
import { reference as makeReference } from "../lib/codes";
import { badRequest, notFound } from "../lib/http";
import { withLock } from "../lib/lock";
import Commission from "../models/Commission";
import Transaction, { type TransactionDoc } from "../models/Transaction";
import User, { type UserDocument } from "../models/User";
import { paystack } from "./paystack";
import { activePlan, buildMe } from "./users";

const DAY_MS = 24 * 60 * 60 * 1000;
const CHANNELS: Record<NonNullable<CheckoutRequest["method"]>, string[]> = {
  card: ["card"],
  bank_transfer: ["bank_transfer"],
  ussd: ["ussd"],
};

/** Who earns commission on this purchase: a code typed at checkout, else the ambassador who referred the buyer. */
async function attributeAmbassador(buyer: UserDocument, typedCode: string | undefined, now: Date): Promise<UserDocument | null> {
  if (typedCode) {
    const code = normalizeCode(typedCode);
    if (code === buyer.referralCode) throw badRequest("own_code", "You can't use your own code.");
    const amb = await User.findOne({ referralCode: code });
    if (!amb) throw badRequest("unknown_code", `We couldn't find the code ${code}. Check it with your friend, or pay without it.`);
    return amb.ambassador ? amb : null;
  }
  if (buyer.referredByUser && buyer.referredAt) {
    const windowEnds = new Date(buyer.referredAt);
    windowEnds.setMonth(windowEnds.getMonth() + AMBASSADOR_RULES.attributionMonths);
    if (now <= windowEnds) {
      const amb = await User.findById(buyer.referredByUser);
      if (amb?.ambassador) return amb;
    }
  }
  return null;
}

export async function startCheckout(user: UserDocument, req: CheckoutRequest, now = new Date()): Promise<CheckoutResponse> {
  if (!user.email) throw badRequest("email_required", "Add an email address to your account to receive receipts.");
  const product = PRODUCTS[req.product];
  const ambassador = await attributeAmbassador(user, req.ambassadorCode, now);
  const reference = makeReference("pe");
  await Transaction.create({
    user: user._id,
    reference,
    product: product.id,
    amount: product.priceNaira,
    email: user.email,
    provider: env().PAYMENTS_MODE,
    ambassador: ambassador?._id ?? null,
    ambassadorCode: ambassador?.referralCode ?? null,
  });
  const { authorizationUrl } = await paystack().initialize({
    email: user.email,
    amountKobo: product.priceNaira * 100,
    reference,
    callbackUrl: `${env().PUBLIC_API_URL}/payments/return`,
    channels: req.method ? CHANNELS[req.method] : undefined,
    metadata: { product: product.id, userId: String(user._id) },
  });
  return { reference, authorizationUrl, amount: product.priceNaira };
}

/** Grant what was bought. Called once per transaction (guarded by `fulfilled`). */
function applyPurchase(user: UserDocument, product: ProductId, now: Date): void {
  const p = PRODUCTS[product];
  if (p.gems) {
    user.gems += p.gems;
    return;
  }
  const plan = activePlan(user, now);
  const base = plan === "free" ? now : user.planExpiresAt!;
  const days = p.durationDays ?? 0;
  if (product === "day" && plan === "monthly") {
    // A Day Pass on top of Monthly just extends Monthly.
    user.planExpiresAt = new Date(base.getTime() + days * DAY_MS);
    return;
  }
  user.plan = product === "monthly" ? "monthly" : "day";
  user.planExpiresAt = new Date(base.getTime() + days * DAY_MS);
}

/** Verify with Paystack and fulfil if paid. Safe to call any number of times. */
export async function confirmPayment(reference: string, now = new Date()): Promise<TransactionDoc & { _id: unknown }> {
  const tx = await Transaction.findOne({ reference });
  if (!tx) throw notFound("Unknown payment reference");
  if (tx.fulfilled || tx.status === "failed") return tx;

  const v = await paystack().verify(reference);
  if (v.status === "success") {
    if (v.amountKobo !== tx.amount * 100 || v.currency !== "NGN") {
      tx.status = "failed";
      tx.providerResponse = v.raw;
      await tx.save();
      console.error(`Amount mismatch on ${reference}: expected ${tx.amount * 100} NGN kobo, got ${v.amountKobo} ${v.currency}`);
      return tx;
    }
    // Claim fulfilment atomically: only one caller gets past this.
    const claimed = await Transaction.findOneAndUpdate(
      { _id: tx._id, fulfilled: false },
      { $set: { fulfilled: true, status: "success", paidAt: v.paidAt ? new Date(v.paidAt) : now, providerResponse: v.raw } },
      { new: true },
    );
    if (!claimed) return (await Transaction.findById(tx._id))!;
    await withLock(String(claimed.user), async () => {
      const buyer = (await User.findById(claimed.user))!;
      applyPurchase(buyer, claimed.product, now);
      await buyer.save();
    });
    const commission = commissionFor(claimed.product);
    if (claimed.ambassador && commission > 0) {
      await Commission.updateOne(
        { transaction: claimed._id },
        {
          $setOnInsert: {
            ambassador: claimed.ambassador,
            buyer: claimed.user,
            product: claimed.product,
            amount: commission,
            availableAt: new Date((claimed.paidAt ?? now).getTime() + AMBASSADOR_RULES.holdDays * DAY_MS),
          },
        },
        { upsert: true },
      );
    }
    return claimed;
  }
  if (v.status === "failed" || v.status === "abandoned") {
    tx.status = v.status;
    tx.providerResponse = v.raw;
    await tx.save();
  }
  return tx;
}

export async function paymentStatus(user: UserDocument, reference: string, now = new Date()): Promise<PaymentStatusResponse> {
  const tx = await Transaction.findOne({ reference, user: user._id });
  if (!tx) throw notFound("Unknown payment reference");
  const updated = await confirmPayment(reference, now);
  const fresh = (await User.findById(user._id))!;
  return {
    reference,
    product: updated.product,
    amount: updated.amount,
    status: updated.status,
    paidAt: updated.paidAt ? updated.paidAt.toISOString() : null,
    email: updated.email,
    me: buildMe(fresh, now),
  };
}
