/**
 * Ambassador starter kit — ready-to-send copy (WK10). Every template carries
 * the ambassador's own code and link and states only true, computed facts
 * (prices from PRODUCTS, reward from AMBASSADOR_RULES). Graphics live in
 * src/screens/ambassador/AmbassadorKitScreen.tsx.
 */
import { AMBASSADOR_RULES } from '../game/referral';
import { formatNaira, PRODUCTS } from '../game/pricing';

export type KitChannel = 'whatsapp-dm' | 'whatsapp-group' | 'status' | 'social';

export interface KitTemplate {
  channel: KitChannel;
  title: string;
  hint: string;
  text: string;
}

/**
 * The exam year students are preparing for. JAMB UTME and WAEC/NECO sit
 * between April and July, so from July on, the next sitting is next year.
 */
export function nextExamYear(today: Date): number {
  return today.getMonth() >= 6 ? today.getFullYear() + 1 : today.getFullYear();
}

/**
 * `questionCount` is bankCoverage().countLabel. Copy says "practice questions", not "real past questions":
 * the NECO set is hand-authored and the WAEC/JAMB sources aren't triaged yet (PRD §10, DESIGN_QA.md).
 */
export function kitTemplates({
  firstName,
  code,
  link,
  today,
  questionCount,
}: {
  firstName: string;
  code: string;
  link: string;
  today: Date;
  questionCount: string;
}): KitTemplate[] {
  const year = nextExamYear(today);
  const gems = AMBASSADOR_RULES.inviteGems;
  const day = formatNaira(PRODUCTS.day.priceNaira);
  const month = formatNaira(PRODUCTS.monthly.priceNaira);
  const me = firstName || 'me';
  return [
    {
      channel: 'whatsapp-dm',
      title: 'WhatsApp — to a friend',
      hint: 'Personal and short. Send it one-to-one.',
      text:
        `Hey! I've been prepping for ${year} JAMB/WAEC on PassEscort — exam practice questions with answers that work offline, and you can duel me 😄\n\n` +
        `Join with my code ${code} and we both get ${gems} gems: ${link}`,
    },
    {
      channel: 'whatsapp-group',
      title: 'WhatsApp — class group',
      hint: 'For class and lesson groups. Ask the admin first if the group has rules about links.',
      text:
        `📚 For everyone writing JAMB/WAEC/NECO ${year}:\n\n` +
        `PassEscort has ${questionCount} JAMB, WAEC and NECO practice questions with answers, a JAMB CBT mode with a timer, and it works without data once downloaded.\n\n` +
        `Free to start. Use code ${code} when you join for ${gems} bonus gems 👉 ${link}`,
    },
    {
      channel: 'status',
      title: 'WhatsApp Status caption',
      hint: 'Post with one of the graphics above.',
      text: `Studying for ${year} exams? Practise with me on PassEscort 🦉 Code ${code} = ${gems} free gems. ${link}`,
    },
    {
      channel: 'social',
      title: 'Instagram / TikTok caption',
      hint: 'Pair with a screen recording of a CBT sprint or a duel.',
      text:
        `POV: you stopped buying past-question PDFs 😅 PassEscort = ${questionCount} JAMB/WAEC/NECO practice questions, timed CBT and quiz duels. ` +
        `Free to start, ${day} for a day pass or ${month} a month for everything.\n\n` +
        `Use my code ${code} for ${gems} free gems 🔗 ${link}\n\n` +
        `#JAMB${year} #UTME${year} #WAEC${year} #NECO${year} #PassEscort #StudyWith${me.replace(/[^A-Za-z]/g, '') || 'Me'}`,
    },
  ];
}
