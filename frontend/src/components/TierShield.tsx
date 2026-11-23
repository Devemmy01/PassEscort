import { Image } from 'react-native';
import type { TierArt } from '../social/shareCards';

/** Figma "Levels & Badges" tier shields (assets/tiers, ~300px). */
const TIER_SOURCES: Record<TierArt, number> = {
  novice: require('../../assets/tiers/novice.png'),
  scholar: require('../../assets/tiers/scholar.png'),
  strategist: require('../../assets/tiers/strategist.png'),
  sharpshooter: require('../../assets/tiers/sharpshooter.png'),
  legend: require('../../assets/tiers/legend.png'),
};

/** Shield for a level tier. The tier name is part of the artwork, so the label is the name. */
export function TierShield({ tier, size, label }: { tier: TierArt; size: number; label: string }) {
  return (
    <Image
      source={TIER_SOURCES[tier]}
      style={{ width: size, height: size * (320 / 300) }}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${label} shield`}
      fadeDuration={0}
    />
  );
}
