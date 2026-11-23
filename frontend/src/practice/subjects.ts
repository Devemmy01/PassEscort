/**
 * Subject iconography (WK11). One glyph and one colour family per subject, so
 * a subject looks the same on onboarding, the practice hub, Home, Profile,
 * duels and share cards — whenever its content was added.
 *
 * Glyphs: the 10 subjects drawn in Figma ("08 — Select Subject", "13 — Your
 * Personalized Journey") use Figma's own Lucide icons; the rest extend the
 * same Lucide family. Colour families group subjects the way schools do
 * (WAEC/NECO departments), so a student scanning the list sees their
 * department at a glance. Colour is never the only cue: every tile has the
 * glyph and the subject name.
 */
import type { IconName } from '../components/Icon';
import { palette } from '../theme/tokens';

export type SubjectFamily = 'maths' | 'science' | 'language' | 'social' | 'commercial' | 'arts';

/** Soft tile background + strong glyph colour; each pair clears 3:1 (WCAG 1.4.11), tested. */
export const SUBJECT_FAMILIES: Record<SubjectFamily, { label: string; fg: string; bg: string }> = {
  maths: { label: 'Mathematics', fg: palette.navy900, bg: palette.navy50 },
  science: { label: 'Sciences', fg: palette.sky700, bg: palette.sky50 },
  language: { label: 'Languages', fg: palette.orange700, bg: palette.orange50 },
  social: { label: 'Social sciences', fg: palette.green700, bg: palette.green50 },
  commercial: { label: 'Commercial', fg: palette.amber700, bg: palette.amber50 },
  arts: { label: 'Arts & religion', fg: palette.red700, bg: palette.red50 },
};

export interface SubjectMeta {
  icon: IconName;
  family: SubjectFamily;
  /** For tight spots (chips, duel header, share cards): ≤ 12 characters. */
  short: string;
  /** Source of the glyph choice. */
  source: 'figma' | 'extended';
}

const SUBJECTS: Record<string, SubjectMeta> = {
  // Figma subjects — glyphs exactly as drawn
  Mathematics: { icon: 'calculator', family: 'maths', short: 'Maths', source: 'figma' },
  English: { icon: 'bookText', family: 'language', short: 'English', source: 'figma' },
  'Literature-in-English': { icon: 'bookOpenText', family: 'language', short: 'Literature', source: 'figma' },
  Physics: { icon: 'atom', family: 'science', short: 'Physics', source: 'figma' },
  Chemistry: { icon: 'flaskConical', family: 'science', short: 'Chemistry', source: 'figma' },
  Biology: { icon: 'dna', family: 'science', short: 'Biology', source: 'figma' },
  'Agricultural Science': { icon: 'leaf', family: 'science', short: 'Agric', source: 'figma' },
  Economics: { icon: 'scale', family: 'social', short: 'Economics', source: 'figma' },
  Government: { icon: 'landmark', family: 'social', short: 'Government', source: 'figma' },
  Geography: { icon: 'globe', family: 'social', short: 'Geography', source: 'figma' },
  // Extended in the same Lucide family
  'Further Mathematics': { icon: 'sigma', family: 'maths', short: 'Further Maths', source: 'extended' },
  'Computer Studies': { icon: 'monitor', family: 'science', short: 'Computer', source: 'extended' },
  French: { icon: 'languages', family: 'language', short: 'French', source: 'extended' },
  History: { icon: 'scrollText', family: 'social', short: 'History', source: 'extended' },
  'Civic Education': { icon: 'vote', family: 'social', short: 'Civic Ed', source: 'extended' },
  Commerce: { icon: 'store', family: 'commercial', short: 'Commerce', source: 'extended' },
  'Financial Accounting': { icon: 'receipt', family: 'commercial', short: 'Accounting', source: 'extended' },
  Insurance: { icon: 'shieldCheck', family: 'commercial', short: 'Insurance', source: 'extended' },
  Marketing: { icon: 'megaphone', family: 'commercial', short: 'Marketing', source: 'extended' },
  'Office Practice': { icon: 'briefcase', family: 'commercial', short: 'Office Prac.', source: 'extended' },
  'Store Management': { icon: 'package', family: 'commercial', short: 'Store Mgt', source: 'extended' },
  'Fine Arts': { icon: 'palette', family: 'arts', short: 'Fine Arts', source: 'extended' },
  Music: { icon: 'music', family: 'arts', short: 'Music', source: 'extended' },
  'Christian Religious Studies': { icon: 'church', family: 'arts', short: 'CRS', source: 'extended' },
  'Islamic Religious Studies': { icon: 'moonStar', family: 'arts', short: 'IRS', source: 'extended' },
};

/** Names Figma, JAMB and schools use for the same subject → the bank's name. */
const ALIASES: Record<string, string> = {
  'english language': 'English',
  'use of english': 'English',
  literature: 'Literature-in-English',
  'literature in english': 'Literature-in-English',
  maths: 'Mathematics',
  'general mathematics': 'Mathematics',
  agriculture: 'Agricultural Science',
  agric: 'Agricultural Science',
  crs: 'Christian Religious Studies',
  crk: 'Christian Religious Studies',
  irs: 'Islamic Religious Studies',
  irk: 'Islamic Religious Studies',
  accounting: 'Financial Accounting',
  'further maths': 'Further Mathematics',
};

export function canonicalSubject(name: string): string {
  const trimmed = name.trim();
  if (SUBJECTS[trimmed]) return trimmed;
  return ALIASES[trimmed.toLowerCase()] ?? trimmed;
}

const FALLBACK: SubjectMeta = { icon: 'book', family: 'maths', short: '', source: 'extended' };

/** Meta for any subject name; unknown subjects get a neutral book glyph, never a crash. */
export function subjectMeta(name: string): SubjectMeta {
  const meta = SUBJECTS[canonicalSubject(name)];
  return meta ?? { ...FALLBACK, short: name.length > 12 ? `${name.slice(0, 11)}…` : name };
}

export function knownSubjects(): string[] {
  return Object.keys(SUBJECTS);
}
