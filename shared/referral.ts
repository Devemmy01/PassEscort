/**
 * Referral & Ambassador program (PRD §5.9): "Student ambassadors get a unique
 * referral code and earn a commission on subscriptions purchased through it."
 *
 * One personal code per student. Anyone can share it to invite friends (both
 * get gems — the wa.me invite). A student who joins the Ambassador program
 * keeps the same code; from then on, Day Pass and Monthly purchases made with
 * it also earn them cash commission, paid to a Nigerian bank account.
 *
 * Every number in AMBASSADOR_RULES is a design placeholder awaiting product
 * sign-off (docs/design/DESIGN_SPEC.md → Open questions). The server is the
 * source of truth for attribution, commission and payouts (PRD §6): the app
 * only displays what the API returns.
 */
import { formatNaira, PRODUCTS, type ProductId } from './pricing';

export const AMBASSADOR_RULES = {
  /** Share of the price paid that the ambassador earns. */
  commissionRate: 0.2,
  /** Paid plans count; gem packs are consumables and earn nothing. */
  commissionProducts: ['day', 'monthly'] as ProductId[],
  /** Purchases count for this long after the friend joins with the code. */
  attributionMonths: 12,
  /** Commission is pending for this long (refund window), then becomes available. */
  holdDays: 7,
  /** Smallest payout (a ₦10 transfer fee is 1% of it). */
  payoutMinimum: 1000,
  /** Payout requests are sent once a week. */
  payoutDay: 'Friday',
  /** Anti-fraud: only students who actually use the app can join. */
  minSessionsToJoin: 5,
  /** Friend-invite reward, both sides, once the friend finishes a first practice. */
  inviteGems: 100,
} as const;

/* ------------------------------------------------------------------ */
/* Codes                                                               */
/* ------------------------------------------------------------------ */

// Same readable alphabet as duel codes: no 0/O/1/I.
const SUFFIX_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Personal code: the first name (letters only, up to 6) plus a 2-character
 * suffix, e.g. ADAEZE7K. Easy to say aloud and to type from a Status post.
 */
export function personalCode(name: string, seed: number): string {
  const letters = (name.trim().split(/\s+/)[0] ?? '')
    .normalize('NFD')
    .replace(/[^A-Za-z]/g, '')
    .toUpperCase()
    .slice(0, 6);
  let s = seed >>> 0 || 1;
  let suffix = '';
  for (let i = 0; i < 2; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    suffix += SUFFIX_ALPHABET[(s >>> 16) % SUFFIX_ALPHABET.length];
  }
  return `${letters.length >= 2 ? letters : 'PASS'}${suffix}`;
}

/** What a student types at checkout: case, spaces and dashes don't matter. */
export function normalizeCode(input: string): string {
  return input.toUpperCase().replace(/[\s-]/g, '');
}

/** Shape check only — whether the code exists is the server's answer. */
export function isWellFormedCode(input: string): boolean {
  return /^[A-Z][A-Z0-9]{3,9}$/.test(normalizeCode(input));
}

/* ------------------------------------------------------------------ */
/* Commission & earnings                                               */
/* ------------------------------------------------------------------ */

export function commissionFor(product: ProductId): number {
  if (!AMBASSADOR_RULES.commissionProducts.includes(product)) return 0;
  return Math.round(PRODUCTS[product].priceNaira * AMBASSADOR_RULES.commissionRate);
}

export type CommissionStatus = 'pending' | 'available' | 'paid';

export interface ReferralPurchase {
  product: ProductId;
  /** Days ago the purchase was made (prototype stand-in for a timestamp). */
  daysAgo: number;
  paid?: boolean;
}

export type ReferralStage = 'joined' | 'practising' | 'subscribed';

export interface Referral {
  name: string;
  joinedDaysAgo: number;
  stage: ReferralStage;
  purchases: ReferralPurchase[];
}

export function purchaseStatus(p: ReferralPurchase): CommissionStatus {
  if (p.paid) return 'paid';
  return p.daysAgo >= AMBASSADOR_RULES.holdDays ? 'available' : 'pending';
}

export interface Earnings {
  pending: number;
  available: number;
  paid: number;
  lifetime: number;
  joined: number;
  practising: number;
  subscribed: number;
}

export function earnings(referrals: Referral[]): Earnings {
  const e: Earnings = { pending: 0, available: 0, paid: 0, lifetime: 0, joined: referrals.length, practising: 0, subscribed: 0 };
  for (const r of referrals) {
    if (r.stage !== 'joined') e.practising += 1;
    if (r.stage === 'subscribed') e.subscribed += 1;
    for (const p of r.purchases) {
      const amount = commissionFor(p.product);
      e[purchaseStatus(p)] += amount;
      e.lifetime += amount;
    }
  }
  return e;
}

export function canRequestPayout(available: number): boolean {
  return available >= AMBASSADOR_RULES.payoutMinimum;
}

/** "₦160 a month for each friend on Monthly" — the pitch, computed, never typed. */
export function monthlyEarningsExample(friendsOnMonthly: number): string {
  return formatNaira(friendsOnMonthly * commissionFor('monthly'));
}

/* ------------------------------------------------------------------ */
/* Payout account                                                      */
/* ------------------------------------------------------------------ */

/** Nigerian NUBAN account numbers are exactly 10 digits. */
export function isValidAccountNumber(input: string): boolean {
  return /^\d{10}$/.test(input);
}

/** "0123456789" → "•••• 6789" for receipts and confirmations. */
export function maskAccount(accountNumber: string): string {
  return `•••• ${accountNumber.slice(-4)}`;
}

export const PAYOUT_BANKS = [
  'Access Bank',
  'First Bank',
  'GTBank',
  'Kuda',
  'Moniepoint',
  'OPay',
  'PalmPay',
  'UBA',
  'Wema Bank',
  'Zenith Bank',
] as const;
