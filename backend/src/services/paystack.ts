/**
 * Paystack (PRD §4: payments). Card data never touches our servers: the app
 * opens Paystack's hosted checkout, and we verify the reference server-side
 * before granting anything (PRD §6).
 *
 * In PAYMENTS_MODE=mock (local development only — refused in production) the
 * same interface is served by an in-memory fake with a tiny hosted page
 * (routes/payments.ts → /payments/mock/:reference).
 */
import { createHmac, timingSafeEqual } from "crypto";
import { env } from "../config/env";
import { HttpError } from "../lib/http";

const BASE = "https://api.paystack.co";

export interface InitializeInput {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  channels?: string[];
  metadata?: Record<string, unknown>;
}

export interface VerifiedTransaction {
  status: "success" | "failed" | "abandoned" | "pending";
  amountKobo: number;
  currency: string;
  paidAt: string | null;
  raw: unknown;
}

export interface Bank {
  code: string;
  name: string;
}

export interface PaystackClient {
  initialize(input: InitializeInput): Promise<{ authorizationUrl: string }>;
  verify(reference: string): Promise<VerifiedTransaction>;
  listBanks(): Promise<Bank[]>;
  resolveAccount(accountNumber: string, bankCode: string): Promise<{ accountName: string }>;
  createRecipient(input: { name: string; accountNumber: string; bankCode: string }): Promise<{ recipientCode: string }>;
  transfer(input: { amountKobo: number; recipientCode: string; reference: string; reason: string }): Promise<{ transferCode: string; status: string }>;
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${env().PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json().catch(() => ({}))) as { status?: boolean; message?: string; data?: T };
  if (!res.ok || !body.status) throw new HttpError(res.status === 422 || res.status === 400 ? 400 : 502, "paystack_error", body.message ?? `Paystack error ${res.status}`);
  return body.data as T;
}

const live: PaystackClient = {
  async initialize(i) {
    const data = await call<{ authorization_url: string }>("/transaction/initialize", {
      method: "POST",
      body: JSON.stringify({ email: i.email, amount: i.amountKobo, currency: "NGN", reference: i.reference, callback_url: i.callbackUrl, channels: i.channels, metadata: i.metadata }),
    });
    return { authorizationUrl: data.authorization_url };
  },
  async verify(reference) {
    const d = await call<{ status: string; amount: number; currency: string; paid_at: string | null }>(`/transaction/verify/${encodeURIComponent(reference)}`);
    const status = d.status === "success" ? "success" : d.status === "failed" ? "failed" : d.status === "abandoned" ? "abandoned" : "pending";
    return { status, amountKobo: d.amount, currency: d.currency, paidAt: d.paid_at, raw: d };
  },
  async listBanks() {
    const d = await call<{ code: string; name: string; active: boolean }[]>("/bank?country=nigeria&currency=NGN&perPage=200");
    return d.filter((b) => b.active !== false).map((b) => ({ code: b.code, name: b.name }));
  },
  async resolveAccount(accountNumber, bankCode) {
    const d = await call<{ account_name: string }>(`/bank/resolve?account_number=${encodeURIComponent(accountNumber)}&bank_code=${encodeURIComponent(bankCode)}`);
    return { accountName: d.account_name };
  },
  async createRecipient(i) {
    const d = await call<{ recipient_code: string }>("/transferrecipient", {
      method: "POST",
      body: JSON.stringify({ type: "nuban", name: i.name, account_number: i.accountNumber, bank_code: i.bankCode, currency: "NGN" }),
    });
    return { recipientCode: d.recipient_code };
  },
  async transfer(i) {
    const d = await call<{ transfer_code: string; status: string }>("/transfer", {
      method: "POST",
      body: JSON.stringify({ source: "balance", amount: i.amountKobo, recipient: i.recipientCode, reference: i.reference, reason: i.reason }),
    });
    return { transferCode: d.transfer_code, status: d.status };
  },
};

/* ---------------- Mock (development) ---------------- */

const mockTransactions = new Map<string, { amountKobo: number; status: VerifiedTransaction["status"]; paidAt: string | null }>();

export const MOCK_BANKS: Bank[] = [
  { code: "044", name: "Access Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "50211", name: "Kuda Bank" },
  { code: "50515", name: "Moniepoint MFB" },
  { code: "999992", name: "OPay Digital Services Limited (OPay)" },
  { code: "999991", name: "PalmPay" },
  { code: "033", name: "United Bank For Africa" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];

/** Mock "bank": any 10-digit account resolves; ending in 0000 means "not found". */
export const mockAccountNames = new Map<string, string>();

const mock: PaystackClient = {
  async initialize(i) {
    mockTransactions.set(i.reference, { amountKobo: i.amountKobo, status: "pending", paidAt: null });
    return { authorizationUrl: `${env().PUBLIC_API_URL}/payments/mock/${encodeURIComponent(i.reference)}` };
  },
  async verify(reference) {
    const t = mockTransactions.get(reference);
    if (!t) throw new HttpError(404, "not_found", "Unknown reference");
    return { status: t.status, amountKobo: t.amountKobo, currency: "NGN", paidAt: t.paidAt, raw: { mock: true } };
  },
  async listBanks() {
    return MOCK_BANKS;
  },
  async resolveAccount(accountNumber, bankCode) {
    if (!MOCK_BANKS.some((b) => b.code === bankCode) || accountNumber.endsWith("0000")) throw new HttpError(400, "paystack_error", "Could not resolve account name");
    return { accountName: mockAccountNames.get(accountNumber) ?? "TEST ACCOUNT HOLDER" };
  },
  async createRecipient(i) {
    return { recipientCode: `RCP_mock_${i.accountNumber}` };
  },
  async transfer(i) {
    return { transferCode: `TRF_mock_${i.reference}`, status: "success" };
  },
};

/** Mark a mock checkout as paid or failed (the mock hosted page calls this). */
export function settleMock(reference: string, outcome: "success" | "failed"): boolean {
  const t = mockTransactions.get(reference);
  if (!t || t.status !== "pending") return false;
  t.status = outcome;
  t.paidAt = outcome === "success" ? new Date().toISOString() : null;
  return true;
}

export function paystack(): PaystackClient {
  return env().PAYMENTS_MODE === "mock" ? mock : live;
}

/** Paystack signs webhooks with HMAC-SHA512 of the raw body using the secret key. */
export function validWebhookSignature(rawBody: Buffer, signature: string | undefined): boolean {
  const secret = env().PAYSTACK_SECRET_KEY;
  if (!secret || !signature) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(signature);
  return a.length === b.length && timingSafeEqual(a, b);
}
