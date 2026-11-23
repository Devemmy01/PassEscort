import { Pressable, StyleSheet, View } from 'react-native';
import { colors, layout, radii, spacing, type ColorToken } from '../theme';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type TagTone = 'neutral' | 'primary' | 'success' | 'danger' | 'warning' | 'info' | 'gold' | 'flame';

const TAG_TONES: Record<TagTone, { bg: string; fg: ColorToken }> = {
  neutral: { bg: colors.surfaceSunken, fg: 'textSecondary' },
  primary: { bg: colors.primarySoft, fg: 'primary' },
  success: { bg: colors.successSoft, fg: 'successText' },
  danger: { bg: colors.dangerSoft, fg: 'dangerText' },
  warning: { bg: colors.warningSoft, fg: 'warningText' },
  info: { bg: colors.infoSoft, fg: 'infoText' },
  gold: { bg: colors.gold, fg: 'textOnGold' },
  flame: { bg: colors.streakSoft, fg: 'dangerText' },
};

/** Small non-interactive status label ("2019", "Hard", "Offline ready"). */
export function Tag({ label, tone = 'neutral', icon, center = false }: { label: string; tone?: TagTone; icon?: IconName; center?: boolean }) {
  const t = TAG_TONES[tone];
  return (
    <View style={[styles.tag, { backgroundColor: t.bg }, center ? { alignSelf: 'center' } : null]}>
      {icon ? <Icon name={icon} size={14} color={t.fg} strokeWidth={2.5} /> : null}
      <Text variant="caption" color={t.fg}>
        {label}
      </Text>
    </View>
  );
}

/** Selectable filter/choice chip. 48dp tall for thumbs. */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
  disabled = false,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="checkbox"
      aria-checked={selected}
      aria-disabled={disabled}
      accessibilityLabel={label}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: disabled ? colors.disabledBg : selected ? colors.primarySoft : colors.surface,
          borderColor: disabled ? colors.disabledBg : selected ? colors.primary : colors.border,
        },
        pressed ? { opacity: 0.8 } : null,
      ]}
    >
      {selected ? (
        <Icon name="check" size={16} color="primary" strokeWidth={3} />
      ) : icon ? (
        <Icon name={icon} size={16} color={disabled ? 'disabledText' : 'textSecondary'} />
      ) : null}
      <Text variant="label" color={disabled ? 'disabledText' : selected ? 'primary' : 'text'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    alignSelf: 'flex-start',
    borderRadius: radii.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
  },
  chip: {
    minHeight: layout.minTouch - 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    borderWidth: 1,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.lg,
  },
});
