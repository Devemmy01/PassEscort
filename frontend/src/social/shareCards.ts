/**
 * Share cards (PRD §5.7) — the data each card is drawn from, and the text
 * that travels with it. Pure functions so the copy is unit-tested; the
 * artwork lives in src/screens/duels/ShareCards.tsx.
 *
 * Every card is built from real results passed in by the screen that earned
 * it (CBT result, WAEC/NECO summary, level up, badge, duel result). The
 * prototype index falls back to the signed-in student's own progress — never
 * to made-up numbers.
 */
import { badgeById } from '../game/badges';
import type { ExamBody } from '../types/question';

export type ShareCardData =
  | { kind: 'score'; percent: number; examBody: ExamBody; subject: string }
  | { kind: 'streak'; days: number }
  | { kind: 'level'; level: number; title: string }
  | { kind: 'badge'; badgeId: string }
  | { kind: 'duel'; opponent: string; myScore: number; theirScore: number; subject: string };

export type ShareCardKind = ShareCardData['kind'];

export const SHARE_CARD_KINDS: { kind: ShareCardKind; label: string }[] = [
  { kind: 'score', label: 'Score' },
  { kind: 'streak', label: 'Streak' },
  { kind: 'level', label: 'Level' },
  { kind: 'badge', label: 'Badge' },
  { kind: 'duel', label: 'Duel win' },
];

/**
 * Figma "Social Sharing Cards" frames are 609 × 696. Exported at 1080 wide
 * that is 1080 × 1234 — portrait, so it fills a phone in WhatsApp Status and
 * still reads as a post on Instagram/X (which crop to 4:5 at most).
 */
export const SHARE_CARD_BASE = { width: 609, height: 696 } as const;
export const SHARE_CARD_EXPORT = { width: 1080, height: Math.round((1080 * 696) / 609) } as const;

/** Level titles that have finished shield artwork in Figma (Levels & Badges). */
export type TierArt = 'novice' | 'scholar' | 'strategist' | 'sharpshooter' | 'legend';
const TIER_ART: Record<string, TierArt> = {
  novice: 'novice',
  scholar: 'scholar',
  strategist: 'strategist',
  sharpshooter: 'sharpshooter',
  legend: 'legend',
  'utme legend': 'legend',
};

/**
 * The shield art has the tier name baked into its ribbon, so it is only used
 * when the title matches exactly; any other title gets the celebration pose.
 */
export function tierArtFor(title: string): TierArt | null {
  return TIER_ART[title.trim().toLowerCase()] ?? null;
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] ?? '';

/** Whole-number percentage, clamped to 0–100. */
export function scorePercent(correct: number, total: number): number {
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((correct / total) * 100)));
}

export function duelWon(data: Extract<ShareCardData, { kind: 'duel' }>): boolean {
  return data.myScore > data.theirScore;
}

/** The caption that goes with the image (and alone, where images can't be shared). */
export function shareMessage(data: ShareCardData, link: string): string {
  switch (data.kind) {
    case 'score':
      return `I just scored ${data.percent}% in ${data.examBody} ${data.subject} on PassEscort — think you can beat me? ${link}`;
    case 'streak':
      return `I'm on a ${data.days}-day learning streak on PassEscort 🔥 Join me and let's keep each other going: ${link}`;
    case 'level':
      return `I just reached Level ${data.level} (${data.title}) on PassEscort! Challenge me: ${link}`;
    case 'badge': {
      const badge = badgeById(data.badgeId);
      return `I just unlocked the ${badge?.name ?? 'new'} badge on PassEscort 🏅 Challenge me: ${link}`;
    }
    case 'duel': {
      const them = firstName(data.opponent) || 'my opponent';
      return duelWon(data)
        ? `I beat ${them} ${data.myScore}–${data.theirScore} in a ${data.subject} duel on PassEscort ⚔️ Think you can beat me? ${link}`
        : `${them} beat me ${data.theirScore}–${data.myScore} in ${data.subject} on PassEscort. Rematch soon — fancy a duel? ${link}`;
    }
  }
}

/**
 * Font size for a single-line headline that has to fit a fixed width. Inter
 * Bold averages ~0.6em per character in mixed case and ~0.74em in capitals,
 * so shrink once the text would overflow, but never below `min` (the caller
 * then allows a second line).
 */
export function fitFontSize(text: string, maxWidth: number, base: number, min: number): number {
  const em = text === text.toUpperCase() && /[A-Z]/.test(text) ? 0.74 : 0.6;
  if (text.length * base * em <= maxWidth) return base;
  return Math.max(min, Math.floor((maxWidth / (text.length * em)) * 10) / 10);
}
