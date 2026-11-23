import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, palette, radii, spacing } from '../theme';

export type CardTone = 'surface' | 'primary' | 'gold' | 'success' | 'danger' | 'soft' | 'ink';

const TONES: Record<CardTone, { bg: string; border: string }> = {
  surface: { bg: colors.surface, border: colors.border },
  soft: { bg: colors.primarySoft, border: colors.primarySoftBorder },
  primary: { bg: colors.primary, border: colors.primaryLedge },
  gold: { bg: colors.goldSoft, border: colors.goldSoftBorder },
  success: { bg: colors.successSoft, border: colors.successSoftBorder },
  danger: { bg: colors.dangerSoft, border: colors.dangerSoftBorder },
  ink: { bg: colors.ink, border: palette.navy950 },
};

export interface CardProps {
  children?: ReactNode;
  tone?: CardTone;
  /** Kept for API compatibility: every card is flat (1px border) since the Figma restyle. */
  raised?: boolean;
  selected?: boolean;
  onPress?: () => void;
  padding?: keyof typeof spacing | 0;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

export function Card({
  children,
  tone = 'surface',
  selected = false,
  onPress,
  padding = 'lg',
  style,
  accessibilityLabel,
}: CardProps) {
  const t = TONES[tone];
  const border = selected ? colors.primary : t.border;
  const bg = selected ? colors.primarySoft : t.bg;
  const pad = padding === 0 ? 0 : spacing[padding];

  const body = (pressed: boolean) => (
    <View style={[styles.card, { backgroundColor: pressed && tone === 'surface' && !selected ? colors.surfaceSunken : bg, borderColor: border, borderWidth: selected ? 2 : 1, padding: Math.max(0, pad - (selected ? 1 : 0)), opacity: pressed && tone !== 'surface' ? 0.88 : 1 }, style]}>
      {children}
    </View>
  );

  if (!onPress) return body(false);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      aria-selected={selected}
    >
      {({ pressed }) => body(pressed)}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  /** Figma cards: white, 1px border, 12px radius, no shadow. */
  card: { borderWidth: 1, borderRadius: radii.md },
});
