/**
 * Share/invite link helpers. The domain is a placeholder until the deep-link
 * host is chosen (see docs/design/DESIGN_SPEC.md → Open questions); links
 * must resolve to the app via Android App Links / iOS Universal Links, with a
 * web fallback page that points to the Play Store.
 */
import { AMBASSADOR_RULES } from '../game/referral';
import { DUEL_ROUNDS, DUEL_SECONDS_PER_QUESTION } from '../practice/types';

export const LINK_HOST = 'https://passescort.app';

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I — readable aloud

export function makeCode(seed: number, length = 6): string {
  let s = seed >>> 0 || 1;
  let out = '';
  for (let i = 0; i < length; i++) {
    s = (s * 1103515245 + 12345) >>> 0;
    // High bits only — an LCG's low bits cycle with a tiny period.
    out += CODE_ALPHABET[(s >>> 16) % CODE_ALPHABET.length];
  }
  return out;
}

export function duelInviteLink(code: string): string {
  return `${LINK_HOST}/d/${code}`;
}

export function referralLink(code: string): string {
  return `${LINK_HOST}/r/${code}`;
}

/** wa.me with no phone number opens WhatsApp's contact picker with the text prefilled. */
export function waMeUrl(text: string, phone?: string): string {
  const digits = phone?.replace(/\D/g, '') ?? '';
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

const article = (word: string) => (/^[AEIOU]/i.test(word) ? 'an' : 'a');

export function duelInviteMessage(senderFirstName: string, subject: string, link: string): string {
  return `${senderFirstName} challenged you to ${article(subject)} ${subject} duel on PassEscort! ${DUEL_ROUNDS} questions, ${DUEL_SECONDS_PER_QUESTION} seconds each. Think you can win? ⚔️ ${link}`;
}

export function referralMessage(code: string, link: string): string {
  return `I'm prepping for JAMB/WAEC on PassEscort — free exam practice that works offline, plus quiz duels. Join with my code ${code} and we both get ${AMBASSADOR_RULES.inviteGems} gems: ${link}`;
}
