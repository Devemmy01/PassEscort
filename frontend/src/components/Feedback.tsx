import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Animated, Easing, Modal, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { MascotMood } from '../brand/mascot';
import { colors, layout, motion, palette, radii, spacing, type ColorToken } from '../theme';
import { Mascot } from './Brand';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';
import { useReduceMotion } from './useReduceMotion';

/* ------------------------------------------------------------------ */
/* Answer option                                                       */
/* ------------------------------------------------------------------ */

export type OptionState = 'default' | 'selected' | 'correct' | 'incorrect' | 'dimmed';

const OPTION_STYLES: Record<OptionState, { bg: string; border: string; keyBg: string; keyFg: ColorToken; text: ColorToken; mark: string }> = {
  default: { bg: colors.surface, border: colors.border, keyBg: colors.surfaceSunken, keyFg: 'textSecondary', text: 'text', mark: colors.borderStrong },
  selected: { bg: colors.primarySoft, border: colors.primary, keyBg: colors.primary, keyFg: 'textOnPrimary', text: 'text', mark: colors.primary },
  correct: { bg: colors.successSoft, border: colors.success, keyBg: colors.successLedge, keyFg: 'textOnPrimary', text: 'text', mark: colors.successLedge },
  incorrect: { bg: colors.dangerSoft, border: colors.danger, keyBg: colors.dangerLedge, keyFg: 'textOnPrimary', text: 'text', mark: colors.dangerLedge },
  dimmed: { bg: colors.surface, border: colors.border, keyBg: colors.surfaceSunken, keyFg: 'textMuted', text: 'textSecondary', mark: colors.border },
};

/**
 * A–D answer option, Figma style: a flat row (1px border, 12px radius) with
 * the letter on the left and a radio on the right. Correct/incorrect fill the
 * radio with a check or cross as well as colour, so the result never relies
 * on red/green alone (colour-blind safe).
 */
export function OptionButton({
  optionKey,
  text,
  state = 'default',
  onPress,
  disabled = false,
}: {
  optionKey: string;
  text: string;
  state?: OptionState;
  onPress?: () => void;
  disabled?: boolean;
}) {
  const s = OPTION_STYLES[state];
  const filled = state === 'correct' || state === 'incorrect';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="radio"
      aria-checked={state === 'selected'}
      aria-disabled={disabled}
      accessibilityLabel={`Option ${optionKey}: ${text}${state === 'correct' ? ', correct answer' : state === 'incorrect' ? ', incorrect' : ''}`}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.option,
            {
              backgroundColor: pressed && !disabled && state === 'default' ? colors.surfaceSunken : s.bg,
              borderColor: s.border,
              borderWidth: state === 'default' || state === 'dimmed' ? 1 : 2,
              // The 2px "chosen" border eats into the padding so the row never shifts.
              paddingHorizontal: state === 'default' || state === 'dimmed' ? spacing.md : spacing.md - 1,
              paddingVertical: state === 'default' || state === 'dimmed' ? spacing.md - 2 : spacing.md - 3,
            },
          ]}
        >
          <View style={[styles.optionKey, { backgroundColor: s.keyBg }]}>
            <Text variant="label" color={s.keyFg}>
              {optionKey}
            </Text>
          </View>
          <Text variant="body" color={s.text} style={{ flex: 1 }}>
            {text}
          </Text>
          <View style={[styles.radio, { borderColor: s.mark, backgroundColor: filled ? s.mark : 'transparent' }]}>
            {state === 'selected' ? <View style={styles.radioDot} /> : null}
            {state === 'correct' ? <Icon name="check" size={14} color="textOnPrimary" strokeWidth={3.5} /> : null}
            {state === 'incorrect' ? <Icon name="x" size={14} color="textOnPrimary" strokeWidth={3.5} /> : null}
          </View>
        </View>
      )}
    </Pressable>
  );
}

/* ------------------------------------------------------------------ */
/* Banners                                                             */
/* ------------------------------------------------------------------ */

export type BannerTone = 'info' | 'offline' | 'warning' | 'success' | 'danger' | 'primary';
const BANNER: Record<BannerTone, { bg: string; fg: ColorToken; icon: IconName }> = {
  info: { bg: colors.infoSoft, fg: 'infoText', icon: 'alert' },
  offline: { bg: colors.surfaceSunken, fg: 'text', icon: 'wifiOff' },
  warning: { bg: colors.warningSoft, fg: 'warningText', icon: 'alert' },
  success: { bg: colors.successSoft, fg: 'successText', icon: 'check' },
  danger: { bg: colors.dangerSoft, fg: 'dangerText', icon: 'alert' },
  primary: { bg: colors.primarySoft, fg: 'primary', icon: 'sparkles' },
};

export function Banner({
  tone = 'info',
  title,
  message,
  icon,
  action,
  onAction,
}: {
  tone?: BannerTone;
  title?: string;
  message: string;
  icon?: IconName;
  action?: string;
  onAction?: () => void;
}) {
  const b = BANNER[tone];
  return (
    <View style={[styles.banner, { backgroundColor: b.bg }]} accessibilityRole="alert">
      <Icon name={icon ?? b.icon} size={20} color={b.fg} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? (
          <Text variant="label" color={b.fg}>
            {title}
          </Text>
        ) : null}
        <Text variant="bodySm" color={tone === 'offline' ? 'textSecondary' : b.fg}>
          {message}
        </Text>
      </View>
      {action ? (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <Text variant="label" color={tone === 'offline' ? 'textLink' : b.fg} style={{ textDecorationLine: 'underline' }}>
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Bottom sheet                                                        */
/* ------------------------------------------------------------------ */

export function Sheet({
  visible,
  onClose,
  title,
  children,
  dismissable = true,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children?: ReactNode;
  dismissable?: boolean;
}) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={dismissable ? onClose : () => undefined} statusBarTranslucent>
      <View style={styles.backdrop}>
        <Pressable style={StyleSheet.absoluteFill} onPress={dismissable ? onClose : undefined} accessibilityRole="button" accessibilityLabel="Close" />
        <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm }]}>
          <View style={styles.grabber} />
          {title ? (
            <View style={styles.sheetHeader}>
              <Text variant="h2" style={{ flex: 1 }}>
                {title}
              </Text>
              {dismissable ? (
                <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Close">
                  <Icon name="x" color="textSecondary" />
                </Pressable>
              ) : null}
            </View>
          ) : null}
          {children}
        </View>
      </View>
    </Modal>
  );
}

/** Centred dialog for blocking confirmations (submit test, time up). */
export function Dialog({ visible, children, onClose }: { visible: boolean; children?: ReactNode; onClose?: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose ?? (() => undefined)} statusBarTranslucent>
      <View style={[styles.backdrop, { justifyContent: 'center', padding: layout.screenGutter }]}>
        <View style={styles.dialog}>{children}</View>
      </View>
    </Modal>
  );
}

/* ------------------------------------------------------------------ */
/* Empty state & skeletons                                             */
/* ------------------------------------------------------------------ */

export function EmptyState({
  mood = 'think',
  title,
  message,
  children,
  mascotSize = 140,
}: {
  mood?: MascotMood;
  title: string;
  message?: string;
  children?: ReactNode;
  mascotSize?: number;
}) {
  return (
    <View style={styles.empty}>
      <Mascot mood={mood} size={mascotSize} />
      <Text variant="h2" align="center">
        {title}
      </Text>
      {message ? (
        <Text variant="body" color="textSecondary" align="center">
          {message}
        </Text>
      ) : null}
      {children ? <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.sm }}>{children}</View> : null}
    </View>
  );
}

/** Pulsing placeholder block. Opacity-only animation (native driver). */
export function Skeleton({ width = '100%', height = 16, radius = radii.sm }: { width?: number | `${number}%`; height?: number; radius?: number }) {
  const pulse = useRef(new Animated.Value(0.5)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.5, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  return <Animated.View style={{ width, height, borderRadius: radius, backgroundColor: colors.surfaceSunken, opacity: pulse }} />;
}

/* ------------------------------------------------------------------ */
/* Avatar                                                              */
/* ------------------------------------------------------------------ */

// Every avatar fill carries white initials, so each one clears 4.5:1 against white.
const AVATAR_COLORS = [palette.navy900, palette.orange700, palette.green700, palette.sky700, palette.amber700, palette.red700];

export function Avatar({ name, size = 48, ring }: { name: string; size?: number; ring?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
  const bg = AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: bg,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: ring ? 3 : 0,
        borderColor: ring,
      }}
      accessibilityLabel={name}
    >
      <Text variant="label" color="textOnPrimary" style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}>
        {initials}
      </Text>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Badge medallion                                                     */
/* ------------------------------------------------------------------ */

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'legend';
const TIER_COLORS: Record<BadgeTier | 'locked', { face: string; rim: string; inner: string; glyph: string }> = {
  bronze: { face: '#D98A4E', rim: '#8A4B1E', inner: '#E8A574', glyph: '#FFFFFF' },
  silver: { face: '#9AA3BC', rim: '#5D6680', inner: '#B9C0D3', glyph: '#FFFFFF' },
  gold: { face: palette.amber500, rim: palette.amber700, inner: palette.sun, glyph: '#FFFFFF' },
  legend: { face: palette.navy900, rim: palette.navy950, inner: palette.navy700, glyph: palette.sun },
  locked: { face: palette.gray200, rim: palette.slate300, inner: palette.slate100, glyph: palette.slate500 },
};

/** Hexagonal badge medallion: tier colour carries rarity, glyph carries meaning. */
export function BadgeMedal({ icon, tier, locked = false, size = 72 }: { icon: IconName; tier: BadgeTier; locked?: boolean; size?: number }) {
  const c = TIER_COLORS[locked ? 'locked' : tier];
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
        <Path d="M50 4 L91 27 L91 77 L50 98 L9 77 L9 27 Z" fill={c.rim} />
        <Path d="M50 2 L91 25 L91 72 L50 94 L9 72 L9 25 Z" fill={c.face} />
        <Path d="M50 14 L81 31 L81 66 L50 83 L19 66 L19 31 Z" fill={c.inner} />
      </Svg>
      <View style={{ marginTop: -size * 0.04 }}>
        <Icon name={locked ? 'lock' : icon} size={size * 0.38} rawColor={c.glyph} strokeWidth={2.5} />
      </View>
    </View>
  );
}

/* ------------------------------------------------------------------ */
/* Celebration micro-interactions                                      */
/* ------------------------------------------------------------------ */

/** "+10 XP" chip that floats up 32dp and fades over 900ms. Re-fires when `burstKey` changes. */
export function XpBurst({ amount, burstKey }: { amount: number; burstKey: number }) {
  const progress = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (burstKey === 0) return;
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: motion.celebrate,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [burstKey, progress]);
  if (burstKey === 0) return null;
  return (
    <Animated.View
      style={[
        styles.burst,
        { pointerEvents: 'none' },
        {
          opacity: progress.interpolate({ inputRange: [0, 0.15, 0.7, 1], outputRange: [0, 1, 1, 0] }),
          transform: reduce
            ? []
            : [
                { translateY: progress.interpolate({ inputRange: [0, 1], outputRange: [8, -32] }) },
                { scale: progress.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0.6, 1.1, 1] }) },
              ],
        },
      ]}
    >
      <Icon name="bolt" size={16} rawColor={colors.xp} filled strokeWidth={1.5} />
      <Text variant="label" color="primary">
        +{amount} XP
      </Text>
    </Animated.View>
  );
}

const CONFETTI_COLORS = [palette.sun, palette.sky500, palette.orange, palette.green600, palette.navy700, palette.sky400];

/** One-shot confetti fall (transform/opacity only — runs on the native driver). */
export function Confetti({ count = 36, play = true }: { count?: number; play?: boolean }) {
  const { width, height } = useWindowDimensions();
  const reduce = useReduceMotion();
  const pieces = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => ({
        x: ((i * 97) % 100) / 100,
        delay: (i * 53) % 600,
        drift: ((i * 37) % 60) - 30,
        spin: ((i * 71) % 720) - 360,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 8 + (i % 3) * 3,
        h: 12 + (i % 2) * 6,
        progress: new Animated.Value(0),
      })),
    [count],
  );

  useEffect(() => {
    if (!play || reduce) return;
    const anims = pieces.map((p) =>
      Animated.timing(p.progress, {
        toValue: 1,
        duration: 2400,
        delay: p.delay,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    );
    Animated.parallel(anims).start();
    return () => anims.forEach((a) => a.stop());
  }, [pieces, play, reduce]);

  // Falling confetti is pure motion; with Reduce motion the moment is carried by the copy and mascot.
  if (reduce) return null;

  return (
    <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
      {pieces.map((p, i) => (
        <Animated.View
          key={i}
          style={{
            position: 'absolute',
            top: -20,
            left: p.x * width,
            width: p.w,
            height: p.h,
            borderRadius: 2,
            backgroundColor: p.color,
            opacity: p.progress.interpolate({ inputRange: [0, 0.85, 1], outputRange: [1, 1, 0] }),
            transform: [
              { translateY: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, height + 40] }) },
              { translateX: p.progress.interpolate({ inputRange: [0, 1], outputRange: [0, p.drift] }) },
              { rotate: p.progress.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.spin}deg`] }) },
            ],
          }}
        />
      ))}
    </View>
  );
}

/**
 * Number that counts up to `value` (ease-out cubic). Used where a score
 * *lands*: duel reveal, results. Counting is visual only — the accessible
 * label is always the final value, so screen readers never hear the ticks.
 */
export function CountUp({
  value,
  from: initial,
  duration = motion.slow,
  delay = 0,
  render,
}: {
  value: number;
  /** Start here on mount (e.g. 0 on a results screen); defaults to `value` (no animation until it changes). */
  from?: number;
  duration?: number;
  delay?: number;
  render: (shown: number) => ReactNode;
}) {
  const reduce = useReduceMotion();
  const [shown, setShown] = useState(initial ?? value);
  const from = useRef(initial ?? value);
  useEffect(() => {
    const start = from.current;
    if (start === value) return;
    if (reduce) {
      from.current = value;
      setShown(value);
      return;
    }
    const anim = new Animated.Value(0);
    const id = anim.addListener(({ value: t }) => setShown(Math.round(start + (value - start) * t)));
    Animated.timing(anim, { toValue: 1, duration, delay, easing: Easing.out(Easing.cubic), useNativeDriver: false }).start(() => {
      from.current = value;
      setShown(value);
    });
    return () => {
      anim.stopAnimation();
      anim.removeListener(id);
      from.current = value;
    };
  }, [value, duration, delay, reduce]);
  return <View accessible accessibilityLabel={String(value)}>{render(shown)}</View>;
}

/**
 * "+142" chip that pops up from a score and fades (duel reveal). Same motion
 * family as XpBurst, shorter travel. Re-fires when `popKey` changes; renders
 * nothing for 0 points.
 */
export function PointsPop({ points, popKey, tone = 'success' }: { points: number; popKey: number; tone?: 'success' | 'neutral' }) {
  const p = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (popKey === 0) return;
    p.setValue(0);
    Animated.timing(p, { toValue: 1, duration: 1100, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
  }, [popKey, p]);
  // Only celebrate points scored; a missed round already shows in the result pips.
  if (popKey === 0 || points <= 0) return null;
  const good = tone === 'success';
  return (
    <Animated.View
      style={[
        styles.pop,
        { backgroundColor: good ? colors.successSoft : colors.surfaceSunken, pointerEvents: 'none' },
        {
          opacity: p.interpolate({ inputRange: [0, 0.1, 0.75, 1], outputRange: [0, 1, 1, 0] }),
          transform: reduce
            ? []
            : [
                { translateY: p.interpolate({ inputRange: [0, 1], outputRange: [4, -22] }) },
                { scale: p.interpolate({ inputRange: [0, 0.18, 1], outputRange: [0.6, 1.15, 1] }) },
              ],
        },
      ]}
    >
      <Text variant="label" color={good ? 'successText' : 'textSecondary'}>
        +{points}
      </Text>
    </Animated.View>
  );
}

/**
 * Round timer: a bar that drains smoothly on the native driver (scaleX from
 * the left edge) instead of re-rendering every tick. `running` pauses it in
 * place (reveal, reconnecting) — the server owns the real clock; this only
 * mirrors it. Colour steps at 10s and 5s left, and the bar is never the only
 * signal: the screen also shows the seconds.
 */
export function RoundTimer({ secondsLeft, total, running, roundKey }: { secondsLeft: number; total: number; running: boolean; roundKey: number }) {
  const fraction = useRef(new Animated.Value(1)).current;
  const latest = useRef(secondsLeft);
  latest.current = secondsLeft;
  useEffect(() => {
    fraction.setValue(Math.max(0, latest.current / total));
  }, [roundKey, fraction, total]);
  useEffect(() => {
    if (!running) {
      fraction.stopAnimation();
      return;
    }
    const left = Math.max(0, latest.current);
    fraction.setValue(left / total);
    const anim = Animated.timing(fraction, { toValue: 0, duration: left * 1000, easing: Easing.linear, useNativeDriver: true });
    anim.start();
    return () => anim.stop();
  }, [running, roundKey, fraction, total]);
  const color = secondsLeft <= 5 ? colors.danger : secondsLeft <= 10 ? colors.gold : colors.success;
  return (
    <View
      style={styles.timerTrack}
      accessibilityRole="progressbar"
      accessibilityLabel={`${Math.ceil(secondsLeft)} seconds left`}
      accessibilityValue={{ min: 0, max: total, now: Math.ceil(secondsLeft) }}
    >
      <Animated.View style={[styles.timerFill, { backgroundColor: color, transformOrigin: 'left', transform: [{ scaleX: fraction }] }]} />
    </View>
  );
}

/** Spring-in wrapper for celebration content (scale 0.6 → 1). */
export function PopIn({ children, delay = 0 }: { children?: ReactNode; delay?: number }) {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    // Reduce motion: a short fade in place instead of the spring.
    const anim = reduce
      ? Animated.timing(v, { toValue: 1, duration: motion.fast, delay, useNativeDriver: true })
      : Animated.sequence([Animated.delay(delay), Animated.spring(v, { toValue: 1, friction: 5, tension: 120, useNativeDriver: true })]);
    anim.start();
    return () => anim.stop();
  }, [v, delay, reduce]);
  return (
    <Animated.View style={{ opacity: v, transform: reduce ? [] : [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  option: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    borderRadius: radii.md,
  },
  optionKey: { width: 32, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.primary },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
  },
  backdrop: { flex: 1, backgroundColor: colors.overlay, justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    paddingHorizontal: layout.screenGutter,
    paddingTop: spacing.sm,
    gap: spacing.md,
    width: '100%',
    maxWidth: layout.maxContentWidth + 32,
    alignSelf: 'center',
    maxHeight: '88%',
  },
  grabber: { alignSelf: 'center', width: 44, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: spacing.xs },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    gap: spacing.md,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  empty: { alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.xl, paddingHorizontal: spacing.md },
  pop: {
    position: 'absolute',
    alignSelf: 'center',
    top: -6,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  timerTrack: { height: 10, width: '100%', borderRadius: radii.pill, backgroundColor: colors.surfaceSunken, overflow: 'hidden' },
  timerFill: { height: 10, width: '100%', borderRadius: radii.pill },
  burst: {
    position: 'absolute',
    alignSelf: 'center',
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.xpSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radii.pill,
  },
});
