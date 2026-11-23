/**
 * Products from PRD §5.8. Day Pass and Monthly prices are fixed by the PRD;
 * gem packs, repair cost and quotas were signed off as built (PRD §11, 2026-11-21).
 */
/** The paid tier's name (Figma "PassEscort+"); Day Pass and Monthly are the two ways to get it. */
export const PREMIUM_NAME = 'PassEscort+';

export type PlanId = 'free' | 'day' | 'monthly';
export type ProductId = 'day' | 'monthly' | 'gems-small' | 'gems-large';

export interface Product {
  id: ProductId;
  name: string;
  priceNaira: number;
  blurb: string;
  durationDays?: number;
  gems?: number;
}

export const PRODUCTS: Record<ProductId, Product> = {
  day: { id: 'day', name: 'Day Pass', priceNaira: 100, durationDays: 1, blurb: '24 hours of everything' },
  monthly: { id: 'monthly', name: 'Monthly', priceNaira: 800, durationDays: 30, blurb: '30 days of everything' },
  'gems-small': { id: 'gems-small', name: '250 Gems', priceNaira: 100, gems: 250, blurb: 'Enough for 1 streak repair' },
  'gems-large': { id: 'gems-large', name: '800 Gems', priceNaira: 250, gems: 800, blurb: 'Best value — 4 repairs' },
};

export const FREE_AI_EXPLAINS_PER_DAY = 3;
export const STREAK_REPAIR_GEMS = 200;
export const STREAK_REPAIR_WINDOW_HOURS = 48;
/** Streak repairs included with an active Monthly plan, per calendar month (WAT). */
export const MONTHLY_FREE_REPAIRS = 2;

export interface PlanFeature {
  label: string;
  free: string | boolean;
  day: string | boolean;
  monthly: string | boolean;
}

export const PLAN_FEATURES: PlanFeature[] = [
  { label: 'Past questions (offline)', free: true, day: true, monthly: true },
  { label: 'CBT sprints & duels', free: true, day: true, monthly: true },
  { label: 'AI step-by-step explanations', free: `${FREE_AI_EXPLAINS_PER_DAY}/day`, day: 'Unlimited', monthly: 'Unlimited' },
  { label: 'Full worked solutions (theory)', free: false, day: true, monthly: true },
  { label: 'Streak repairs included', free: false, day: false, monthly: '2 / month' },
  { label: 'Detailed mastery reports', free: false, day: true, monthly: true },
];

/** ₦1,234 — manual grouping so it never depends on Intl support in the JS engine. */
export function formatNaira(amount: number): string {
  const rounded = Math.round(amount);
  return `₦${String(rounded).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
}

/** Monthly works out to ₦27/day vs ₦100 for a Day Pass. */
export function perDay(product: Product): number {
  return product.durationDays ? Math.ceil(product.priceNaira / product.durationDays) : product.priceNaira;
}
