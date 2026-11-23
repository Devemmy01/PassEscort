/**
 * Weekly payout run (Fridays — AMBASSADOR_RULES.payoutDay). Schedule
 * `npm run payouts:process` with cron. Each requested payout becomes a
 * Paystack transfer; Paystack's transfer.success / transfer.failed webhooks
 * settle it (routes/payments.ts → settleTransfer).
 */
import { paystack } from "./paystack";
import { notify } from "./push";
import Commission from "../models/Commission";
import Payout from "../models/Payout";

export async function processRequestedPayouts(now = new Date()): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  const due = await Payout.find({ status: "requested" }).sort({ createdAt: 1 });
  for (const p of due) {
    try {
      const t = await paystack().transfer({ amountKobo: p.amount * 100, recipientCode: p.recipientCode, reference: p.reference, reason: "PassEscort ambassador payout" });
      p.transferCode = t.transferCode;
      p.status = "processing";
      await p.save();
      if (t.status === "success") await settleTransfer(p.reference, "success", now);
      sent++;
    } catch (e) {
      failed++;
      await settleTransfer(p.reference, "failed", now, e instanceof Error ? e.message : String(e));
    }
  }
  return { sent, failed };
}

/** Final state of a transfer. A failed payout returns its commission to "ready to withdraw". */
export async function settleTransfer(reference: string, outcome: "success" | "failed", now = new Date(), reason?: string): Promise<void> {
  const p = await Payout.findOne({ reference });
  if (!p || p.status === "paid" || p.status === "failed") return;
  p.status = outcome === "success" ? "paid" : "failed";
  p.processedAt = now;
  p.failureReason = outcome === "failed" ? (reason ?? "Transfer failed") : null;
  await p.save();
  await Commission.updateMany({ payout: p._id }, outcome === "success" ? { $set: { status: "paid" } } : { $set: { status: "open", payout: null } });
  await notify([String(p.ambassador)], "social", {
    title: outcome === "success" ? `₦${p.amount.toLocaleString("en-NG")} is in your bank` : "Your payout didn't go through",
    body: outcome === "success" ? `Sent to ${p.bankName} ${p.accountNumberMasked}. Keep sharing your code!` : "The money is back in your dashboard. Check your bank details and try again.",
    data: { type: "payout" },
  });
}
