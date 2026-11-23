/**
 * Subject mastery (Profile, Home): accuracy over the student's last 50
 * answers in a subject, weighted by difficulty and recency. 0–1.
 * Fewer than 5 answers is too little to judge: mastery is reported as 0.
 */
import type { Difficulty } from './types';

export const MASTERY_WINDOW = 50;
const DIFFICULTY_WEIGHT: Record<Difficulty, number> = { easy: 0.75, medium: 1, hard: 1.5 };

/** `answers` oldest → newest. */
export function mastery(answers: { correct: boolean; difficulty: Difficulty }[]): number {
  const recent = answers.slice(-MASTERY_WINDOW);
  if (recent.length < 5) return 0;
  let got = 0;
  let total = 0;
  recent.forEach((a, i) => {
    // Recency: the oldest answer in the window counts half as much as the newest.
    const w = DIFFICULTY_WEIGHT[a.difficulty] * (0.5 + (0.5 * (i + 1)) / recent.length);
    total += w;
    if (a.correct) got += w;
  });
  return Math.round((got / total) * 1000) / 1000;
}

export function masteryLabel(m: number): 'Needs work' | 'Getting there' | 'Strong' | 'Mastered' {
  if (m < 0.4) return 'Needs work';
  if (m < 0.7) return 'Getting there';
  if (m < 0.9) return 'Strong';
  return 'Mastered';
}
