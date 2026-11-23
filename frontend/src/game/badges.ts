import type { IconName } from '../components/Icon';
import { BADGE_RULES, type BadgeRule } from '../../../shared/badges';

export { BADGE_CATEGORIES, type BadgeCategory, type BadgeTier } from '../../../shared/badges';

/** Badge rules (shared with the server) plus the glyph the app draws on each medal. */
export interface BadgeDef extends BadgeRule {
  icon: IconName;
}

const ICONS: Record<string, IconName> = {
  'first-steps': 'play',
  century: 'book',
  'question-machine': 'layers',
  sharpshooter: 'target',
  speedster: 'clock',
  'perfect-40': 'star',
  'on-fire': 'flame',
  unstoppable: 'flame',
  comeback: 'shield',
  'early-bird': 'sun',
  'night-owl': 'moon',
  duelist: 'swords',
  champion: 'trophy',
  'subject-master': 'award',
  'all-rounder': 'grid',
  recruiter: 'users',
  'show-off': 'share',
};

export const BADGES: BadgeDef[] = BADGE_RULES.map((b) => ({ ...b, icon: ICONS[b.id] ?? 'award' }));

export function badgeById(id: string): BadgeDef | undefined {
  return BADGES.find((b) => b.id === id);
}
