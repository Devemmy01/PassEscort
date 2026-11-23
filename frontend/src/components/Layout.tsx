import { cloneElement, isValidElement, type ReactElement, type ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, contentWidthFor, layout, radii, spacing } from '../theme';
import { IconButton } from './Button';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export interface ScreenProps {
  children?: ReactNode;
  /** Pinned above the scroll area (app bar, progress). */
  header?: ReactNode;
  /** Pinned below the scroll area (primary CTA, tab bar). */
  footer?: ReactNode;
  scroll?: boolean;
  background?: string;
  padded?: boolean;
  contentStyle?: StyleProp<ViewStyle>;
}

/** Width of the centred content column: phone-sized on phones and in narrow iPad Split View, wider on tablets. */
export function useContentWidth(): number {
  return contentWidthFor(useWindowDimensions().width);
}

/**
 * Page scaffold: safe areas, background, centred max-width column (wider on
 * tablets), optional pinned header/footer. A TabBar footer runs edge to edge.
 */
export function Screen({
  children,
  header,
  footer,
  scroll = true,
  background = colors.background,
  padded = true,
  contentStyle,
}: ScreenProps) {
  const insets = useSafeAreaInsets();
  const maxWidth = useContentWidth();
  const column = [styles.column, { maxWidth }];
  const inner = [...column, padded ? styles.padded : null, contentStyle];
  const tabBar = isValidElement(footer) && footer.type === TabBar;
  return (
    <View style={[styles.root, { backgroundColor: background, paddingTop: insets.top }]}>
      {header ? <View style={column}>{header}</View> : null}
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[...inner, { paddingBottom: spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, ...inner]}>{children}</View>
      )}
      {tabBar ? (
        cloneElement(footer as ReactElement<TabBarProps>, { bottomInset: insets.bottom })
      ) : footer ? (
        <View style={[...column, styles.footer, { paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>{footer}</View>
      ) : (
        <View style={{ height: insets.bottom }} />
      )}
    </View>
  );
}

/** Top app bar: back/close, centred title, up to two trailing actions. */
export function AppBar({
  title,
  onBack,
  backIcon = 'chevronLeft',
  right,
  subtitle,
}: {
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  backIcon?: 'chevronLeft' | 'x';
  right?: ReactNode;
}) {
  return (
    <View style={styles.appBar}>
      <View style={styles.appBarSide}>
        {onBack ? <IconButton icon={backIcon} label={backIcon === 'x' ? 'Close' : 'Back'} onPress={onBack} /> : null}
      </View>
      <View style={styles.appBarTitle}>
        {title ? (
          <Text variant="h3" numberOfLines={1} align="center">
            {title}
          </Text>
        ) : null}
        {subtitle ? (
          <Text variant="caption" color="textSecondary" numberOfLines={1} align="center">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={[styles.appBarSide, { justifyContent: 'flex-end' }]}>{right}</View>
    </View>
  );
}

export type TabKey = 'home' | 'practice' | 'duels' | 'leaderboard' | 'profile';
const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'home', label: 'Home', icon: 'home' },
  { key: 'practice', label: 'Practice', icon: 'book' },
  { key: 'duels', label: 'Duels', icon: 'swords' },
  { key: 'leaderboard', label: 'Ranks', icon: 'trophy' },
  { key: 'profile', label: 'Profile', icon: 'user' },
];

interface TabBarProps {
  active: TabKey;
  onChange: (tab: TabKey) => void;
  /** Set by Screen: the home-indicator inset the bar's background extends under. */
  bottomInset?: number;
}

/** Bottom navigation, edge to edge; the tabs sit in the content column. Active tab: filled pill behind icon + bold label. */
export function TabBar({ active, onChange, bottomInset = 0 }: TabBarProps) {
  const maxWidth = useContentWidth();
  return (
    <View style={[styles.tabBarBleed, { paddingBottom: bottomInset }]}>
      <View style={[styles.tabBar, { maxWidth }]} accessibilityRole="tablist">
      {TABS.map((tab) => {
        const selected = tab.key === active;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            accessibilityRole="tab"
            aria-selected={selected}
            accessibilityLabel={tab.label}
            style={styles.tab}
          >
            <View style={[styles.tabPill, selected ? { backgroundColor: colors.primarySoft } : null]}>
              <Icon name={tab.icon} size={22} color={selected ? 'primary' : 'textSecondary'} strokeWidth={selected ? 2.5 : 2} />
            </View>
            <Text variant="caption" color={selected ? 'primary' : 'textSecondary'} style={{ fontWeight: selected ? '800' : '600' }}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
      </View>
    </View>
  );
}

/** Two-to-four way switch (Objective | Theory). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.segment} accessibilityRole="tablist">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="tab"
            aria-selected={selected}
            style={[styles.segmentItem, selected ? styles.segmentSelected : null]}
          >
            <Text variant="label" color={selected ? 'primary' : 'textSecondary'}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SectionHeader({ title, action, onAction }: { title: string; action?: string; onAction?: () => void }) {
  return (
    <View style={styles.section}>
      <Text variant="h3">{title}</Text>
      {action ? (
        <Pressable onPress={onAction} hitSlop={12} accessibilityRole="button">
          <Text variant="label" color="textLink">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function ListItem({
  icon,
  iconColor = 'primary',
  title,
  subtitle,
  right,
  onPress,
}: {
  icon?: IconName;
  iconColor?: 'primary' | 'successText' | 'dangerText' | 'warningText' | 'infoText' | 'textSecondary';
  title: string;
  subtitle?: string;
  right?: ReactNode;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      style={({ pressed }) => [styles.listItem, pressed ? { backgroundColor: colors.surfaceSunken } : null]}
    >
      {icon ? (
        <View style={styles.listIcon}>
          <Icon name={icon} size={20} color={iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        {subtitle ? (
          <Text variant="bodySm" color="textSecondary">
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevronRight" size={20} color="textMuted" /> : null)}
    </Pressable>
  );
}

/** On/off switch (brand colours on every platform). */
export function Toggle({ value, onChange, label, disabled = false }: { value: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      disabled={disabled}
      hitSlop={8}
      accessibilityRole="switch"
      accessibilityLabel={label}
      accessibilityState={{ checked: value, disabled }}
      aria-checked={value}
      style={[styles.toggle, { backgroundColor: value ? colors.primary : colors.border, opacity: disabled ? 0.5 : 1 }]}
    >
      <View style={[styles.toggleKnob, { alignSelf: value ? 'flex-end' : 'flex-start' }]} />
    </Pressable>
  );
}

export function Divider() {
  return <View style={styles.divider} />;
}

export const Row = ({ children, gap = spacing.sm, style }: { children?: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>
);

export const Stack = ({ children, gap = spacing.md, style }: { children?: ReactNode; gap?: number; style?: StyleProp<ViewStyle> }) => (
  <View style={[{ gap }, style]}>{children}</View>
);

const styles = StyleSheet.create({
  toggle: { width: 48, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  toggleKnob: { width: 22, height: 22, borderRadius: 11, backgroundColor: colors.surface },
  root: { flex: 1 },
  flex: { flex: 1 },
  column: { width: '100%', maxWidth: layout.maxContentWidth, alignSelf: 'center' },
  padded: { paddingHorizontal: layout.screenGutter },
  footer: { paddingHorizontal: layout.screenGutter, paddingTop: spacing.md, gap: spacing.sm },
  appBar: { height: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xs },
  appBarSide: { width: 88, flexDirection: 'row', alignItems: 'center' },
  appBarTitle: { flex: 1, alignItems: 'center' },
  tabBarBleed: { width: '100%', borderTopWidth: 1, borderTopColor: colors.border, backgroundColor: colors.surface },
  tabBar: { flexDirection: 'row', height: layout.tabBarHeight, width: '100%', alignSelf: 'center' },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  tabPill: { width: 56, height: 30, borderRadius: radii.pill, alignItems: 'center', justifyContent: 'center' },
  segment: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceSunken,
    borderRadius: radii.md,
    padding: spacing.xs,
  },
  segmentItem: { flex: 1, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: radii.sm },
  segmentSelected: { backgroundColor: colors.surface, borderWidth: 2, borderColor: colors.primarySoftBorder },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  listItem: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xs,
    borderRadius: radii.md,
  },
  listIcon: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  divider: { height: 2, backgroundColor: colors.border, marginVertical: spacing.sm },
});
