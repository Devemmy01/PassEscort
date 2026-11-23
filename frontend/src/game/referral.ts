/** Referral & Ambassador rules (PRD §5.9) — shared with the server (shared/referral.ts). */
import type { Referral } from '../../../shared/referral';

export * from '../../../shared/referral';

/* ------------------------------------------------------------------ */
/* Prototype data                                                      */
/* ------------------------------------------------------------------ */

/** A month into the program: some pending, some available, one payout made. */
export const DEMO_REFERRALS: Referral[] = [
  { name: 'Chidi Nwosu', joinedDaysAgo: 34, stage: 'subscribed', purchases: [{ product: 'monthly', daysAgo: 33, paid: true }, { product: 'monthly', daysAgo: 3 }] },
  { name: 'Halima Yusuf', joinedDaysAgo: 28, stage: 'subscribed', purchases: [{ product: 'monthly', daysAgo: 27 }] },
  { name: 'Emeka Obi', joinedDaysAgo: 21, stage: 'subscribed', purchases: [{ product: 'day', daysAgo: 20 }, { product: 'day', daysAgo: 12 }, { product: 'monthly', daysAgo: 9 }] },
  { name: 'Blessing Akpan', joinedDaysAgo: 19, stage: 'subscribed', purchases: [{ product: 'monthly', daysAgo: 18 }] },
  { name: 'Sodiq Lawal', joinedDaysAgo: 15, stage: 'subscribed', purchases: [{ product: 'monthly', daysAgo: 14 }, { product: 'gems-small', daysAgo: 10 }] },
  { name: 'Grace Effiong', joinedDaysAgo: 11, stage: 'subscribed', purchases: [{ product: 'monthly', daysAgo: 10 }] },
  { name: 'Tobi Adeleke', joinedDaysAgo: 9, stage: 'subscribed', purchases: [{ product: 'monthly', daysAgo: 8 }] },
  { name: 'Zainab Bello', joinedDaysAgo: 6, stage: 'subscribed', purchases: [{ product: 'day', daysAgo: 2 }] },
  { name: 'Ifeoma Chukwu', joinedDaysAgo: 4, stage: 'practising', purchases: [] },
  { name: 'Kunle Ajayi', joinedDaysAgo: 2, stage: 'practising', purchases: [] },
  { name: 'Aisha Musa', joinedDaysAgo: 1, stage: 'joined', purchases: [] },
];
