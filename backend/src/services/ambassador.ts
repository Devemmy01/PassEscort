/**
 * Referrals & the Ambassador program (PRD §5.9). One personal code per
 * student: friends who join with it earn both sides gems (services/practice),
 * and ambassadors also earn commission on purchases (services/payments).
 */
import type { AmbassadorDashboardDTO, RedeemCodeResponse, ReferralDTO, ResolveAccountResponse } from "../../../shared/api";
import { AMBASSADOR_RULES, canRequestPayout, isValidAccountNumber, isWellFormedCode, maskAccount, normalizeCode } from "../../../shared/referral";
import { reference as makeReference } from "../lib/codes";
import { badRequest, conflict, forbidden } from "../lib/http";
import { withLock } from "../lib/lock";
import Commission from "../models/Commission";
import Payout from "../models/Payout";
import Transaction from "../models/Transaction";
import User, { type UserDocument } from "../models/User";
import { paystack, type Bank } from "./paystack";

const REDEEM_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export async function redeemCode(userId: string, rawCode: string, now = new Date()): Promise<RedeemCodeResponse> {
  if (!isWellFormedCode(rawCode)) throw badRequest("invalid_code", "That doesn't look like a PassEscort code.");
  const code = normalizeCode(rawCode);
  return withLock(userId, async () => {
    const user = (await User.findById(userId))!;
    if (user.referredByUser) throw conflict("already_referred", "You've already joined with a friend's code.");
    if (code === user.referralCode) throw badRequest("own_code", "You can't use your own code.");
    if (now.getTime() - user.createdAt.getTime() > REDEEM_WINDOW_MS) throw forbidden("too_late", "Codes can only be added in your first 7 days.");
    const referrer = await User.findOne({ referralCode: code });
    if (!referrer) throw badRequest("unknown_code", `We couldn't find the code ${code}.`);
    if (referrer.referredByUser && String(referrer.referredByUser) === String(user._id)) throw badRequest("circular", "You can't swap codes with each other.");
    user.referredByCode = code;
    user.referredByUser = referrer._id;
    user.referredAt = now;
    await user.save();
    return { referredBy: code, pendingGems: AMBASSADOR_RULES.inviteGems };
  });
}

export async function joinProgram(userId: string, now = new Date()): Promise<void> {
  await withLock(userId, async () => {
    const user = (await User.findById(userId))!;
    if (user.ambassador) return;
    if (user.stats.sessionsCompleted < AMBASSADOR_RULES.minSessionsToJoin) {
      throw forbidden("not_eligible", `Finish ${AMBASSADOR_RULES.minSessionsToJoin} practice sessions to join.`);
    }
    if (!user.emailVerified) throw forbidden("email_unverified", "Verify your email address to join.");
    user.ambassador = { joinedAt: now, payoutAccount: null };
    await user.save();
  });
}

function requireAmbassador(user: UserDocument): NonNullable<UserDocument["ambassador"]> {
  if (!user.ambassador) throw forbidden("not_ambassador", "Join the Ambassador program first.");
  return user.ambassador;
}

function shortName(name: string): string {
  const [first, last] = name.trim().split(/\s+/);
  return first ? `${first}${last ? ` ${last[0]}.` : ""}` : "A friend";
}

export async function dashboard(user: UserDocument, now = new Date()): Promise<AmbassadorDashboardDTO> {
  const amb = requireAmbassador(user);
  const commissions = await Commission.find({ ambassador: user._id }).lean();
  const earnings = { pending: 0, available: 0, paid: 0, lifetime: 0 };
  const byBuyer = new Map<string, { amount: number; pending: boolean }>();
  for (const c of commissions) {
    earnings.lifetime += c.amount;
    if (c.status === "paid") earnings.paid += c.amount;
    else if (c.status === "open" && c.availableAt <= now) earnings.available += c.amount;
    else if (c.status === "open") earnings.pending += c.amount;
    // "requested" sits in payoutInFlight
    const b = byBuyer.get(String(c.buyer)) ?? { amount: 0, pending: false };
    b.amount += c.amount;
    b.pending ||= c.status === "open" && c.availableAt > now;
    byBuyer.set(String(c.buyer), b);
  }
  const friends = await User.find({ referredByUser: user._id }, { name: 1, createdAt: 1, referredAt: 1, "stats.questionsAnswered": 1 }).sort({ referredAt: -1 }).lean();
  const ids = friends.map((f) => f._id);
  // From the friend's own totals: old answers are trimmed nightly (services/cleanup.ts).
  const practised = new Set(friends.filter((f) => (f.stats?.questionsAnswered ?? 0) > 0).map((f) => String(f._id)));
  const bought = new Set((await Transaction.distinct("user", { user: { $in: ids }, status: "success", product: { $in: AMBASSADOR_RULES.commissionProducts } })).map(String));
  const referrals: ReferralDTO[] = friends.map((f) => {
    const id = String(f._id);
    const c = byBuyer.get(id);
    return {
      name: shortName(f.name),
      joinedAt: (f.referredAt ?? f.createdAt).toISOString(),
      stage: bought.has(id) ? "subscribed" : practised.has(id) ? "practising" : "joined",
      commission: c?.amount ?? 0,
      pending: c?.pending ?? false,
    };
  });
  const inFlight = await Payout.findOne({ ambassador: user._id, status: { $in: ["requested", "processing"] } }).sort({ createdAt: -1 }).lean();
  const acct = amb.payoutAccount;
  return {
    code: user.referralCode,
    joinedAt: amb.joinedAt.toISOString(),
    earnings,
    funnel: {
      joined: referrals.length,
      practising: referrals.filter((r) => r.stage !== "joined").length,
      subscribed: referrals.filter((r) => r.stage === "subscribed").length,
    },
    referrals,
    payoutAccount: acct ? { bankCode: acct.bankCode, bank: acct.bankName, accountNumberMasked: maskAccount(acct.accountNumber), accountName: acct.accountName } : null,
    payoutInFlight: inFlight ? { amount: inFlight.amount, requestedAt: inFlight.createdAt.toISOString() } : null,
  };
}

let bankCache: { at: number; banks: Bank[] } | null = null;
export async function listBanks(): Promise<Bank[]> {
  if (!bankCache || Date.now() - bankCache.at > 24 * 60 * 60 * 1000) bankCache = { at: Date.now(), banks: await paystack().listBanks() };
  return bankCache.banks;
}

/** The bank's account name must match the student's own name (anti-fraud). */
export function namesMatch(accountName: string, profileName: string): boolean {
  const words = (s: string) => new Set(s.toUpperCase().replace(/[^A-Z\s]/g, " ").split(/\s+/).filter((w) => w.length > 1));
  const a = words(accountName);
  const p = words(profileName);
  if (!p.size) return false;
  let shared = 0;
  for (const w of p) if (a.has(w)) shared++;
  return shared >= Math.min(2, p.size);
}

export async function resolveAccount(user: UserDocument, bankCode: string, accountNumber: string): Promise<ResolveAccountResponse> {
  requireAmbassador(user);
  if (!isValidAccountNumber(accountNumber)) throw badRequest("invalid_account", "Account numbers are 10 digits.");
  const { accountName } = await paystack().resolveAccount(accountNumber, bankCode);
  return { accountName, matchesProfile: namesMatch(accountName, user.name) };
}

export async function savePayoutAccount(userId: string, bankCode: string, accountNumber: string): Promise<void> {
  const user = (await User.findById(userId))!;
  requireAmbassador(user);
  if (!isValidAccountNumber(accountNumber)) throw badRequest("invalid_account", "Account numbers are 10 digits.");
  const bank = (await listBanks()).find((b) => b.code === bankCode);
  if (!bank) throw badRequest("unknown_bank", "Choose your bank from the list.");
  // Never trust a client-sent name: resolve again here.
  const { accountName } = await paystack().resolveAccount(accountNumber, bankCode);
  if (!namesMatch(accountName, user.name)) {
    throw forbidden("name_mismatch", `This account is in the name ${accountName}. Payouts can only go to an account in your own name (${user.name || "add your name in your profile"}).`);
  }
  const { recipientCode } = await paystack().createRecipient({ name: accountName, accountNumber, bankCode });
  await withLock(userId, async () => {
    const fresh = (await User.findById(userId))!;
    fresh.ambassador!.payoutAccount = { bankCode, bankName: bank.name, accountNumber, accountName, recipientCode };
    fresh.markModified("ambassador");
    await fresh.save();
  });
}

/** Ask for a payout of everything cleared. Transfers go out on the weekly run (scripts/processPayouts). */
export async function requestPayout(userId: string, now = new Date()): Promise<{ amount: number }> {
  return withLock(`payout:${userId}`, async () => {
    const user = (await User.findById(userId))!;
    const amb = requireAmbassador(user);
    if (!amb.payoutAccount) throw badRequest("no_account", "Add your bank account first.");
    if (await Payout.exists({ ambassador: user._id, status: { $in: ["requested", "processing"] } })) throw conflict("payout_in_flight", "Your last payout is still on its way.");
    const open = await Commission.find({ ambassador: user._id, status: "open", availableAt: { $lte: now } });
    const amount = open.reduce((a, c) => a + c.amount, 0);
    if (!canRequestPayout(amount)) throw badRequest("below_minimum", `You can withdraw once you have ₦${AMBASSADOR_RULES.payoutMinimum.toLocaleString("en-NG")} cleared.`);
    const payout = await Payout.create({
      ambassador: user._id,
      amount,
      reference: makeReference("po"),
      bankName: amb.payoutAccount.bankName,
      accountNumberMasked: maskAccount(amb.payoutAccount.accountNumber),
      recipientCode: amb.payoutAccount.recipientCode,
    });
    await Commission.updateMany({ _id: { $in: open.map((c) => c._id) }, status: "open" }, { $set: { status: "requested", payout: payout._id } });
    return { amount };
  });
}
