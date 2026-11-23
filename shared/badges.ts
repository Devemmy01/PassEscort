/**
 * Badge catalogue and award rules (PRD §5.4). The server evaluates these
 * after every sync, duel and purchase; the app adds icons (frontend/src/game/badges.ts).
 */
export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'legend';
export type BadgeCategory = 'Practice' | 'Streaks' | 'Duels' | 'Mastery' | 'Social';

export interface BadgeRule {
  id: string;
  name: string;
  description: string;
  tier: BadgeTier;
  category: BadgeCategory;
  /** Numeric target used for the locked-state progress bar. */
  target: number;
  unit: string;
}

export const BADGE_RULES: BadgeRule[] = [
  { id: 'first-steps', name: 'First Steps', description: 'Finish your first practice session.', tier: 'bronze', category: 'Practice', target: 1, unit: 'session' },
  { id: 'century', name: 'Century', description: 'Answer 100 questions.', tier: 'silver', category: 'Practice', target: 100, unit: 'questions' },
  { id: 'question-machine', name: 'Question Machine', description: 'Answer 1,000 questions.', tier: 'gold', category: 'Practice', target: 1000, unit: 'questions' },
  { id: 'sharpshooter', name: 'Sharpshooter', description: 'Get 10 answers right in a row.', tier: 'silver', category: 'Practice', target: 10, unit: 'in a row' },
  { id: 'speedster', name: 'Speedster', description: 'Finish a 40-question CBT sprint with 5+ minutes left.', tier: 'silver', category: 'Practice', target: 1, unit: 'sprint' },
  { id: 'perfect-40', name: 'Perfect 40', description: 'Score 40/40 in a CBT sprint.', tier: 'legend', category: 'Practice', target: 1, unit: 'sprint' },
  { id: 'on-fire', name: 'On Fire', description: 'Keep a 7-day streak.', tier: 'bronze', category: 'Streaks', target: 7, unit: 'days' },
  { id: 'unstoppable', name: 'Unstoppable', description: 'Keep a 30-day streak.', tier: 'gold', category: 'Streaks', target: 30, unit: 'days' },
  { id: 'comeback', name: 'Comeback Kid', description: 'Repair a broken streak.', tier: 'bronze', category: 'Streaks', target: 1, unit: 'repair' },
  { id: 'early-bird', name: 'Early Bird', description: 'Practise before 7am on 5 days.', tier: 'bronze', category: 'Streaks', target: 5, unit: 'days' },
  { id: 'night-owl', name: 'Night Owl', description: 'Practise after 10pm on 5 days.', tier: 'bronze', category: 'Streaks', target: 5, unit: 'days' },
  { id: 'duelist', name: 'Duelist', description: 'Win your first duel.', tier: 'bronze', category: 'Duels', target: 1, unit: 'win' },
  { id: 'champion', name: 'Champion', description: 'Win 25 duels.', tier: 'gold', category: 'Duels', target: 25, unit: 'wins' },
  { id: 'subject-master', name: 'Subject Master', description: 'Reach 90% mastery in any subject.', tier: 'gold', category: 'Mastery', target: 90, unit: '% mastery' },
  { id: 'all-rounder', name: 'All-Rounder', description: 'Reach 70% mastery in all your subjects.', tier: 'legend', category: 'Mastery', target: 4, unit: 'subjects' },
  { id: 'recruiter', name: 'Recruiter', description: 'Invite a friend who joins PassEscort.', tier: 'silver', category: 'Social', target: 1, unit: 'friend' },
  { id: 'show-off', name: 'Show-Off', description: 'Share 5 results to WhatsApp Status.', tier: 'bronze', category: 'Social', target: 5, unit: 'shares' },
];

export const BADGE_CATEGORIES: BadgeCategory[] = ['Practice', 'Streaks', 'Duels', 'Mastery', 'Social'];

/** Everything the rules need, as tracked on the user's stats. */
export interface BadgeStats {
  sessionsCompleted: number;
  questionsAnswered: number;
  bestCorrectRun: number;
  fastSprints: number;
  perfectSprints: number;
  bestStreak: number;
  streakRepairs: number;
  earlyDays: number;
  nightDays: number;
  duelsWon: number;
  /** Mastery 0–1 per subject the student takes. */
  mastery: Record<string, number>;
  subjects: string[];
  friendsJoined: number;
  shares: number;
}

/** Progress toward each badge's target, for the locked-state bars. */
export function badgeProgress(s: BadgeStats): Record<string, number> {
  const best = Math.max(0, ...Object.values(s.mastery));
  const subjects = s.subjects.length ? s.subjects : Object.keys(s.mastery);
  return {
    'first-steps': s.sessionsCompleted,
    century: s.questionsAnswered,
    'question-machine': s.questionsAnswered,
    sharpshooter: s.bestCorrectRun,
    speedster: s.fastSprints,
    'perfect-40': s.perfectSprints,
    'on-fire': s.bestStreak,
    unstoppable: s.bestStreak,
    comeback: s.streakRepairs,
    'early-bird': s.earlyDays,
    'night-owl': s.nightDays,
    duelist: s.duelsWon,
    champion: s.duelsWon,
    'subject-master': Math.round(best * 100),
    'all-rounder': subjects.length >= 4 && subjects.every((x) => (s.mastery[x] ?? 0) >= 0.7) ? 4 : subjects.filter((x) => (s.mastery[x] ?? 0) >= 0.7).length,
    recruiter: s.friendsJoined,
    'show-off': s.shares,
  };
}

/** Badge ids the stats have earned. */
export function earnedBadges(s: BadgeStats): string[] {
  const p = badgeProgress(s);
  return BADGE_RULES.filter((b) => (p[b.id] ?? 0) >= b.target).map((b) => b.id);
}

export function badgeRule(id: string): BadgeRule | undefined {
  return BADGE_RULES.find((b) => b.id === id);
}
