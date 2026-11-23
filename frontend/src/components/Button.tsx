import { ActivityIndicator, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { colors, layout, palette, radii, spacing, type ColorToken } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'gold' | 'danger' | 'ghost' | 'whatsapp';
export type ButtonSize = 'lg' | 'md' | 'sm';

interface VariantStyle {
  bg: string;
  /** Fill while pressed (Figma's "pressed" column). */
  pressed: string;
  text: ColorToken;
  border?: string;
}

const VARIANTS: Record<ButtonVariant, VariantStyle> = {
  primary: { bg: colors.primary, pressed: colors.primaryPressed, text: 'textOnPrimary' },
  secondary: { bg: colors.surface, pressed: colors.primarySoft, text: 'primary', border: colors.primary },
  gold: { bg: colors.gold, pressed: colors.goldLedge, text: 'textOnGold' },
  danger: { bg: colors.dangerLedge, pressed: palette.red800, text: 'textOnPrimary' },
  ghost: { bg: 'transparent', pressed: colors.primarySoft, text: 'primary' },
  whatsapp: { bg: palette.whatsappDark, pressed: palette.whatsappLedge, text: 'textOnPrimary' },
};

const HEIGHTS: Record<ButtonSize, number> = { lg: 56, md: 48, sm: 40 };

export interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  iconRight?: IconName;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

/**
 * Flat button (Figma Design System `14:38`): solid fill, 12px radius, darker
 * fill when pressed; secondary is a 1px navy outline. Disabled keeps the
 * app's legible slate-on-slate (Figma's white on #94A3B8 is 2.56:1, QA F18).
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  size = 'lg',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  fullWidth = true,
  style,
  accessibilityHint,
}: ButtonProps) {
  const v = VARIANTS[variant];
  const inactive = disabled || loading;
  const height = HEIGHTS[size];
  const textColor: ColorToken = disabled ? 'disabledText' : v.text;
  const iconSize = size === 'sm' ? 18 : 20;

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityHint={accessibilityHint}
      aria-disabled={inactive}
      aria-busy={loading}
      hitSlop={size === 'sm' ? (layout.minTouch - HEIGHTS.sm) / 2 : undefined}
      style={[fullWidth ? styles.full : styles.auto, style]}
    >
      {({ pressed }) => (
        <View
          style={[
            styles.face,
            {
              height,
              paddingHorizontal: size === 'sm' ? spacing.md : spacing.xl,
              backgroundColor: disabled ? colors.disabledBg : pressed ? v.pressed : v.bg,
              borderColor: disabled ? colors.disabledBg : (v.border ?? 'transparent'),
              borderWidth: v.border ? 1 : 0,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={colors[textColor]} />
          ) : (
            <>
              {icon ? <Icon name={icon} size={iconSize} color={textColor} /> : null}
              <Text variant="button" color={textColor} numberOfLines={1} style={size === 'sm' ? { fontSize: 14 } : null}>
                {title}
              </Text>
              {iconRight ? <Icon name={iconRight} size={iconSize} color={textColor} /> : null}
            </>
          )}
        </View>
      )}
    </Pressable>
  );
}

/** Square icon-only button (app bar actions, close buttons). Always 48dp. */
export function IconButton({
  icon,
  onPress,
  label,
  color = 'text',
  tone = 'plain',
}: {
  icon: IconName;
  onPress?: () => void;
  label: string;
  color?: ColorToken;
  tone?: 'plain' | 'soft';
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.iconButton,
        tone === 'soft' ? { backgroundColor: colors.surfaceSunken } : null,
        pressed ? { backgroundColor: colors.primarySoft } : null,
      ]}
    >
      <Icon name={icon} color={color} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  full: { alignSelf: 'stretch' },
  auto: { alignSelf: 'flex-start' },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderRadius: radii.md,
  },
  iconButton: {
    width: layout.minTouch,
    height: layout.minTouch,
    borderRadius: radii.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
