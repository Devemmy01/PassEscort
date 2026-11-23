import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Button, Confetti, Icon, Mascot, PopIn, Row, Stack, Text, TierShield, useContentWidth, type IconName } from '../../components';
import { tierArtFor } from '../../social/shareCards';
import { levelTitle, MAX_LEVEL } from '../../game/levels';
import { useNav } from '../../navigation/Navigator';
import type { Routes } from '../../navigation/routes';
import { colors, layout, palette, spacing } from '../../theme';

function rewardsFor(level: number): { icon: IconName; text: string }[] {
  if (level >= MAX_LEVEL) {
    return [
      { icon: 'crown', text: 'The UTME Legend crown on your profile' },
      { icon: 'gem', text: '+1,000 gems' },
      { icon: 'star', text: 'Legend share card unlocked' },
    ];
  }
  const newTier = levelTitle(level) !== levelTitle(level - 1);
  return [
    ...(newTier ? [{ icon: 'award' as IconName, text: `New title: ${levelTitle(level)}` }] : []),
    { icon: 'gem', text: `+${level * 10} gems` },
    { icon: 'bolt', text: `${level >= 10 ? 'Ranked' : 'Bonus'} duels unlocked` },
  ];
}

/**
 * Level-up celebration. Sequence: confetti starts (0ms) → medallion springs
 * in (150ms) → mascot pops (350ms) → rewards fade up (550ms). Tap anywhere
 * on Continue; nothing auto-dismisses.
 */
export default function LevelUpScreen({ params }: { params: Routes['LevelUp'] }) {
  const contentWidth = useContentWidth();
  const nav = useNav();
  const insets = useSafeAreaInsets();
  const legend = params.level >= MAX_LEVEL;
  const title = levelTitle(params.level);
  const bg = legend ? colors.ink : colors.primary;
  // Entering a tier that has Figma shield art (Novice, Scholar, Legend) shows the shield instead of the numbered medal.
  const newTier = params.level === 1 || title !== levelTitle(params.level - 1);
  const shield = newTier ? tierArtFor(title) : null;

  return (
    <View style={[styles.root, { backgroundColor: bg, paddingTop: insets.top + spacing.xl, paddingBottom: Math.max(insets.bottom, spacing.lg) }]}>
      <Confetti count={legend ? 60 : 40} />
      <View style={[styles.column, { maxWidth: contentWidth }]}>
        <Stack gap={spacing.lg} style={{ alignItems: 'center', flex: 1, justifyContent: 'center' }}>
          <Text variant="overline" color="textOnPrimary" style={{ opacity: 0.9 }}>
            {legend ? 'THE SUMMIT' : 'LEVEL UP!'}
          </Text>
          <PopIn delay={150}>
            {shield ? (
              <TierShield tier={shield} size={legend ? 168 : 150} label={title} />
            ) : (
              <View style={[styles.medal, legend ? styles.medalLegend : null]}>
                {legend ? <Icon name="crown" size={36} rawColor={palette.amber900} strokeWidth={2.5} /> : null}
                <Text variant="display" color="textOnGold" style={{ fontSize: legend ? 44 : 56, lineHeight: legend ? 50 : 64 }}>
                  {params.level}
                </Text>
              </View>
            )}
          </PopIn>
          <PopIn delay={350}>
            <Mascot mood="cheer" size={shield ? 104 : 140} />
          </PopIn>
          <View style={{ alignItems: 'center', gap: spacing.xs }}>
            <Text variant="h1" color="textOnPrimary" align="center">
              {legend ? 'You are a UTME Legend' : `Level ${params.level} · ${title}`}
            </Text>
            <Text variant="body" color="textOnPrimary" align="center" style={{ opacity: 0.9 }}>
              {legend ? 'Level 50. Every question, every streak, every duel led here.' : 'Your hard work is showing. Keep climbing!'}
            </Text>
          </View>
          <PopIn delay={550}>
            <View style={styles.rewards}>
              {rewardsFor(params.level).map((r) => (
                <Row key={r.text} gap={spacing.md}>
                  <View style={styles.rewardIcon}>
                    <Icon name={r.icon} size={18} color="textOnGold" />
                  </View>
                  <Text variant="bodyStrong" color="textOnPrimary" style={{ flex: 1 }}>
                    {r.text}
                  </Text>
                </Row>
              ))}
            </View>
          </PopIn>
        </Stack>
        <Stack gap={spacing.sm}>
          <Button title="Continue" variant="gold" onPress={nav.back} />
          <Button
            title="Share to WhatsApp Status"
            variant="whatsapp"
            icon="message"
            onPress={() => nav.replace('ShareCard', { card: { kind: 'level', level: params.level, title } })}
          />
        </Stack>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  column: { flex: 1, width: '100%', alignSelf: 'center', paddingHorizontal: layout.screenGutter },
  medal: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.gold,
    borderWidth: 6,
    borderColor: palette.amber100,
    borderBottomWidth: 12,
    borderBottomColor: colors.goldLedge,
    alignItems: 'center',
    justifyContent: 'center',
  },
  medalLegend: { width: 140, height: 140, borderRadius: 70 },
  rewards: { gap: spacing.md, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: spacing.lg, minWidth: 280 },
  rewardIcon: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
});
