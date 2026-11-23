import { useMemo } from 'react';
import { Image, View, type ImageSourcePropType } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { MASCOT_NAME, MASCOT_POSES, type MascotMood, type MascotPose } from '../brand/mascot';
import { LOGOMARK_ASPECT, logomarkSvg } from '../brand/svg';

/* Static requires so Metro bundles exactly these files (each 512px, ~30–45 KB). */
const POSE_SOURCES: Record<MascotPose['pose'], ImageSourcePropType> = {
  wave: require('../../assets/passy/wave.png'),
  celebrate: require('../../assets/passy/celebrate.png'),
  study: require('../../assets/passy/study.png'),
  encourage: require('../../assets/passy/encourage.png'),
  read: require('../../assets/passy/read.png'),
  fire: require('../../assets/passy/fire.png'),
  trophy: require('../../assets/passy/trophy.png'),
  ai: require('../../assets/passy/ai.png'),
};

/** Lockup artwork (mark + custom "PassEscort" wordmark), 960×273. */
const LOCKUP_ASPECT = 960 / 273;
const LOCKUP = require('../../assets/brand/lockup.png');
const LOCKUP_WHITE = require('../../assets/brand/lockup-white.png');

/** Passy the owl. `size` is the square box the pose is fitted into. */
export function Mascot({ mood = 'happy', size = 160 }: { mood?: MascotMood; size?: number }) {
  const pose = MASCOT_POSES[mood];
  return (
    <Image
      source={POSE_SOURCES[pose.pose]}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessible
      accessibilityRole="image"
      accessibilityLabel={`${MASCOT_NAME} the owl, ${pose.describe}`}
      fadeDuration={0}
    />
  );
}

/**
 * The navy/sky mark on its own, as vectors. `size` is its height; the width
 * follows the mark's 270:355 proportions.
 */
export function Logomark({ size = 48, monochrome }: { size?: number; monochrome?: string }) {
  const xml = useMemo(() => logomarkSvg({ square: false, monochrome }), [monochrome]);
  return (
    <View accessible accessibilityRole="image" accessibilityLabel="PassEscort">
      <SvgXml xml={xml} width={size * LOGOMARK_ASPECT} height={size} />
    </View>
  );
}

/**
 * Horizontal lockup: mark + wordmark, as drawn in Figma. `size` is the lockup
 * height; `inverse` is the all-white version for dark and photo backgrounds.
 */
export function Logo({ size = 40, inverse = false }: { size?: number; inverse?: boolean }) {
  return (
    <Image
      source={inverse ? LOCKUP_WHITE : LOCKUP}
      style={{ width: size * LOCKUP_ASPECT, height: size }}
      resizeMode="contain"
      accessible
      accessibilityRole="header"
      accessibilityLabel="PassEscort"
      fadeDuration={0}
    />
  );
}
