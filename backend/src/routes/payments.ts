import express, { Router } from "express";
import { z } from "zod";
import { PRODUCTS, type ProductId } from "../../../shared/pricing";
import { env } from "../config/env";
import { HttpError, notFound, parse } from "../lib/http";
import { identity, requireAuth, type AuthedRequest } from "../middleware/auth";
import { confirmPayment, paymentStatus, startCheckout } from "../services/payments";
import { settleMock, validWebhookSignature } from "../services/paystack";
import { settleTransfer } from "../services/payouts";
import { getOrCreateUser } from "../services/users";

const router = Router();
const REF = /^(pe|po)_[a-z0-9]+$/;

const checkoutSchema = z.object({
  product: z.enum(Object.keys(PRODUCTS) as [ProductId, ...ProductId[]]),
  ambassadorCode: z.string().max(20).optional(),
  method: z.enum(["card", "bank_transfer", "ussd"]).optional(),
});

router.post("/checkout", express.json(), requireAuth, async (req: AuthedRequest, res) => {
  const body = parse(checkoutSchema, req.body);
  const user = await getOrCreateUser(identity(req));
  res.json(await startCheckout(user, body));
});

/**
 * Paystack's webhook. Mounted with a raw body so the HMAC signature can be
 * checked against exactly what Paystack sent.
 */
router.post("/webhook", express.raw({ type: "application/json", limit: "1mb" }), async (req, res) => {
  const raw = req.body as Buffer;
  if (!Buffer.isBuffer(raw) || !validWebhookSignature(raw, req.header("x-paystack-signature"))) {
    res.sendStatus(401);
    return;
  }
  const event = JSON.parse(raw.toString("utf8")) as { event: string; data: { reference?: string; reason?: string } };
  const reference = event.data?.reference;
  if (reference) {
    if (event.event === "charge.success") await confirmPayment(reference);
    else if (event.event === "transfer.success") await settleTransfer(reference, "success");
    else if (event.event === "transfer.failed" || event.event === "transfer.reversed") await settleTransfer(reference, "failed", new Date(), event.data.reason);
  }
  res.sendStatus(200);
});

/** Paystack sends the browser here after checkout; we hand control back to the app. */
router.get("/return", (req, res) => {
  const reference = String(req.query.reference ?? req.query.trxref ?? "");
  const safe = REF.test(reference) ? reference : "";
  const deepLink = `${env().APP_SCHEME}://payment?reference=${encodeURIComponent(safe)}`;
  res
    .type("html")
    .send(
      `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Back to PassEscort</title>` +
        `<meta http-equiv="refresh" content="0;url=${deepLink}"></head>` +
        `<body style="font-family:system-ui;padding:32px;text-align:center"><h1>Payment received</h1>` +
        `<p>Returning you to PassEscort…</p><p><a href="${deepLink}" style="font-size:18px">Open PassEscort</a></p></body></html>`,
    );
});

router.get("/:reference", requireAuth, async (req: AuthedRequest, res) => {
  const reference = String(req.params.reference);
  if (!REF.test(reference)) throw notFound("Unknown payment reference");
  const user = await getOrCreateUser(identity(req));
  res.json(await paymentStatus(user, reference));
});

/* ---------------- Mock checkout (PAYMENTS_MODE=mock, development only) ---------------- */

function requireMock() {
  if (env().PAYMENTS_MODE !== "mock") throw new HttpError(404, "not_found", "Not found");
}

router.get("/mock/:reference", (req, res) => {
  requireMock();
  const reference = String(req.params.reference);
  if (!REF.test(reference)) throw notFound();
  res
    .type("html")
    .send(
      `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><title>Test checkout</title></head>` +
        `<body style="font-family:system-ui;padding:24px;max-width:420px;margin:auto"><p style="background:#FEF3C7;padding:12px;border-radius:8px">` +
        `<b>Test mode.</b> No money moves. This page stands in for Paystack while developing.</p><h1>Pay for ${reference}</h1>` +
        `<form method="post" action="/payments/mock/${reference}/success"><button style="font-size:18px;padding:12px 24px;width:100%">Pay (succeeds)</button></form><br>` +
        `<form method="post" action="/payments/mock/${reference}/failed"><button style="font-size:18px;padding:12px 24px;width:100%">Decline (fails)</button></form></body></html>`,
    );
});

router.post("/mock/:reference/:outcome", async (req, res) => {
  requireMock();
  const reference = String(req.params.reference);
  const outcome = req.params.outcome === "success" ? "success" : "failed";
  if (!REF.test(reference)) throw notFound();
  settleMock(reference, outcome);
  if (outcome === "success") await confirmPayment(reference);
  res.redirect(303, `/payments/return?reference=${encodeURIComponent(reference)}`);
});

export default router;
