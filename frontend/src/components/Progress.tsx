import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { colors, motion, radii, spacing } from '../theme';
import { Icon } from './Icon';
import { Text } from './Text';

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

/** Linear bar; animates width changes (fill only, never the track). */
export function ProgressBar({
  value,
  color = colors.primary,
  track = colors.surfaceSunken,
  height = 12,
  animated = true,
}: {
  value: number;
  color?: string;
  track?: string;
  height?: number;
  animated?: boolean;
}) {
  const anim = useRef(new Animated.Value(clamp01(value))).current;
  useEffect(() => {
    if (!animated) {
      anim.setValue(clamp01(value));
      return;
    }
    Animated.timing(anim, {
      toValue: clamp01(value),
      duration: motion.slow,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    }).start();
  }, [value, animated, anim]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(clamp01(value) * 100) }}
      style={[styles.track, { height, backgroundColor: track, borderRadius: height / 2 }]}
    >
      <Animated.View
        style={{
          height,
          borderRadius: height / 2,
          backgroundColor: color,
          width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
        }}
      >
        {/* Specular strip keeps the fill readable as "liquid" on flat panels. */}
        <View style={[styles.shine, { borderRadius: height / 2 }]} />
      </Animated.View>
    </View>
  );
}

/** XP bar: level medallion + gold bar + "120 / 250 XP" label. */
export function XpBar({ level, current, needed, compact = false }: { level: number; current: number; needed: number; compact?: boolean }) {
  return (
    <View style={styles.xpRow}>
      <View style={[styles.levelMedal, compact ? { width: 36, height: 36 } : null]}>
        <Text variant="label" color="textOnGold" style={compact ? { fontSize: 13 } : null}>
          {level}
        </Text>
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <ProgressBar value={needed > 0 ? current / needed : 0} color={colors.xp} height={compact ? 10 : 14} />
        {!compact ? (
          <View style={styles.xpLabels}>
            <Text variant="caption" color="textSecondary">
              Level {level}
            </Text>
            <Text variant="caption" color="textSecondary">
              {current} / {needed} XP
            </Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

/** Circular progress (daily goal). */
export function ProgressRing({
  value,
  size = 64,
  stroke = 8,
  color = colors.success,
  children,
}: {
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  children?: React.ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={colors.surfaceSunken} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={`${c} ${c}`}
          strokeDashoffset={c * (1 - clamp01(value))}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      {children}
    </View>
  );
}

/** Onboarding step indicator: segmented bar. */
export function StepProgress({ step, total }: { step: number; total: number }) {
  return (
    <View style={styles.steps} accessibilityLabel={`Step ${step} of ${total}`}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[styles.step, { backgroundColor: i < step ? colors.primary : colors.surfaceSunken }]} />
      ))}
    </View>
  );
}

export type StreakState = 'active' | 'pending' | 'broken';

/**
 * Streak indicator. active = practised today (lit flame); pending = streak
 * alive but today's goal not met yet (outlined flame, nudges action);
 * broken = streak lost (grey).
 */
export function StreakIndicator({ days, state = 'active', size = 'md' }: { days: number; state?: StreakState; size?: 'md' | 'lg' }) {
  const lg = size === 'lg';
  const color = state === 'active' ? colors.streak : state === 'pending' ? colors.streak : colors.disabledText;
  return (
    <View
      style={[styles.streak, { backgroundColor: state === 'active' ? colors.streakSoft : colors.surfaceSunken }]}
      accessibilityLabel={`${days} day streak${state === 'pending' ? ', practise today to keep it' : state === 'broken' ? ', broken' : ''}`}
    >
      <Icon name="flame" size={lg ? 28 : 20} rawColor={color} filled={state === 'active'} strokeWidth={state === 'active' ? 1.5 : 2.5} />
      <Text variant={lg ? 'h2' : 'label'} color={state === 'broken' ? 'disabledText' : 'text'}>
        {days}
      </Text>
    </View>
  );
}

/** Compact counter pill for the top bar (gems, XP). */
export function CounterPill({ kind, value }: { kind: 'gem' | 'xp'; value: number }) {
  const gem = kind === 'gem';
  return (
    <View
      style={[styles.streak, { backgroundColor: gem ? colors.gemSoft : colors.xpSoft }]}
      accessibilityLabel={`${value} ${gem ? 'gems' : 'XP'}`}
    >
      <Icon name={gem ? 'gem' : 'bolt'} size={18} rawColor={gem ? colors.gem : colors.xp} filled={!gem} strokeWidth={gem ? 2.5 : 1.5} />
      <Text variant="label">{value.toLocaleString('en-NG')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  track: { width: '100%', overflow: 'hidden' },
  shine: {
    position: 'absolute',
    top: 3,
    left: 6,
    right: 6,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  levelMedal: {
    width: 44,
    height: 44,
    borderRadius: radii.pill,
    backgroundColor: colors.gold,
    borderWidth: 3,
    borderColor: colors.goldLedge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  xpLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  steps: { flexDirection: 'row', gap: spacing.xs + 2, flex: 1 },
  step: { flex: 1, height: 8, borderRadius: radii.pill },
  streak: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md - 2,
    height: 36,
    borderRadius: radii.pill,
  },
});
