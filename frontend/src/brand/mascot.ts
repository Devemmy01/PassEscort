/**
 * Passy the owl — the PassEscort mascot (Figma: "04.1 Meet Passy" and the
 * poses used across Home, Feedback, Streak and Social Sharing Cards).
 *
 * Screens ask for a *mood* (what the moment means), never a pose file, so the
 * art can change without touching call sites. Each mood maps to one Figma
 * pose (assets/passy/*.png, 512px, imported by docs/design/figma/process-assets.py).
 *
 * Figma has no sad or sleeping Passy — the losing moments use the pose Figma
 * itself names "Passy – Encouraging" (thumbs up). That is deliberate brand
 * tone: Passy never sulks; a loss, a broken streak or a failed payment is met
 * with encouragement and a next step.
 */
export type MascotMood = 'happy' | 'cheer' | 'think' | 'sad' | 'sleep' | 'wow' | 'trophy' | 'ai';

export const MASCOT_NAME = 'Passy';

export interface MascotPose {
  /** File in assets/passy. */
  pose: 'wave' | 'celebrate' | 'study' | 'encourage' | 'read' | 'fire' | 'trophy' | 'ai';
  /** Screen-reader description of the image. */
  describe: string;
  /** Where the mood is used (shown on the Brand screen and in the spec). */
  usage: string;
}

export const MASCOT_POSES: Record<MascotMood, MascotPose> = {
  happy: { pose: 'wave', describe: 'waving hello', usage: 'Default · welcome, home, onboarding' },
  cheer: { pose: 'celebrate', describe: 'celebrating with confetti', usage: 'Wins · level up, payment ok, streak saved' },
  trophy: { pose: 'trophy', describe: 'holding a gold trophy', usage: 'Victory · duel win, high score, share card' },
  wow: { pose: 'fire', describe: 'fired up with flaming eyes', usage: 'Hype · streaks, challenges, paywall hook' },
  ai: { pose: 'ai', describe: 'holding a sparkle', usage: 'AI Explain · loading, explanation, gate' },
  think: { pose: 'study', describe: 'taking notes', usage: 'Working · loading, empty results' },
  sleep: { pose: 'read', describe: 'reading quietly', usage: 'Idle · offline, nothing yet' },
  sad: { pose: 'encourage', describe: 'giving an encouraging thumbs up', usage: 'Setbacks · defeat, broken streak, errors' },
};

export const MASCOT_MOODS = Object.keys(MASCOT_POSES) as MascotMood[];
