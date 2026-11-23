import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppBar, Button, Card, Confetti, CounterPill, EmptyState, Icon, Mascot, PopIn, Row, Screen, Stack, Tag, Text } from '../../components';
import { addDays, dayKey, WAT_OFFSET_MS } from '../../../../shared/clock';
import { formatNaira, MONTHLY_FREE_REPAIRS, PRODUCTS, STREAK_REPAIR_GEMS } from '../../game/pricing';
import { useNav } from '../../navigation/Navigator';
import { useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
/** Yesterday — the missed day — sits second from the right in the 7-day strip. */
const MISSED_DAY = 5;

/** Seconds until midnight in Lagos: a broken streak can be repaired until the end of today (WAT). */
function secondsToWatMidnight(): number {
  const t = Date.now() + WAT_OFFSET_MS;
  return Math.floor((86_400_000 - (t % 86_400_000)) / 1000);
}

/** Day letters for the last 7 WAT days, oldest → today. */
function lastSevenDays(): string[] {
  return Array.from({ length: 7 }, (_, i) => DAY_LETTERS[new Date(Date.parse(`${addDays(dayKey(new Date()), i - 6)}T12:00:00Z`)).getUTCDay()]!);
}

function useCountdown() {
  const [left, setLeft] = useState(secondsToWatMidnight);
  useEffect(() => {
    const id = setInterval(() => setLeft(secondsToWatMidnight()), 1000);
    return () => clearInterval(id);
  }, []);
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

/**
 * Streak-repair paywall moment. Loss-aversion framing, but honest: the free
 * "start over" path is always visible and never shamed.
 */
export default function StreakRepairScreen() {
  const nav = useNav();
  const app = useApp();
  const { progress } = app.state;
  const days = Math.max(progress.streakDays, 1);
  const [repaired, setRepaired] = useState(false);
  const [busy, setBusy] = useState<'gems' | 'plan' | null>(null);
  const [failed, setFailed] = useState(false);
  const countdown = useCountdown();
  const canAfford = progress.gems >= STREAK_REPAIR_GEMS;
  const freeRepairs = app.state.entitlement.freeRepairsLeft;
  const WEEK = lastSevenDays();

  const repair = async (method: 'gems' | 'plan') => {
    setBusy(method);
    setFailed(false);
    const ok = await app.repairStreak(method);
    setBusy(null);
    if (ok) setRepaired(true);
    else setFailed(true);
  };

  // Nothing to repair (already repaired elsewhere, or the window closed).
  if (!repaired && app.mode === 'live' && !progress.streakRepairable) {
    return (
      <Screen header={<AppBar onBack={nav.back} backIcon="x" />}>
        <EmptyState mood="happy" title="No streak to repair" message="Your streak is safe — or it's been more than a day, so a fresh one starts with your next session.">
          <Button title="Practise now" onPress={() => nav.reset('Home')} />
        </EmptyState>
      </Screen>
    );
  }

  if (repaired) {
    return (
      <Screen footer={<Button title="Keep it going" onPress={() => nav.reset('Home')} />}>
        <Confetti />
        <Stack gap={spacing.lg} style={{ alignItems: 'center', paddingTop: spacing.xxxl }}>
          <PopIn>
            <Mascot mood="cheer" size={180} />
          </PopIn>
          <View style={styles.bigFlame}>
            <Icon name="flame" size={44} rawColor={colors.streak} filled strokeWidth={1.5} />
            <Text variant="display">{days}</Text>
          </View>
          <Text variant="h1" align="center">
            Streak saved!
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            Your {days}-day streak is back. Practise today to make it {days + 1}. You also earned the Comeback Kid badge.
          </Text>
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen header={<AppBar onBack={nav.back} backIcon="x" right={<View style={{ paddingRight: spacing.md }}><CounterPill kind="gem" value={progress.gems} /></View>} />}>
      <Stack gap={spacing.lg}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <View>
            <Mascot mood="sad" size={140} />
          </View>
          <View style={[styles.bigFlame, { backgroundColor: colors.surfaceSunken }]}>
            <Icon name="flame" size={36} rawColor={colors.disabledText} strokeWidth={2.5} />
            <Text variant="h1" color="disabledText" style={{ textDecorationLine: 'line-through' }}>
              {days}
            </Text>
          </View>
          <Text variant="h1" align="center">
            Your {days}-day streak broke
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            You missed a day. Repair it before the timer runs out and keep every one of your {days} days.
          </Text>
          <Tag label={`${countdown} left to repair`} tone="danger" icon="clock" center />
        </View>

        <Card padding="md">
          <Row style={{ justifyContent: 'space-between' }}>
            {WEEK.map((d, i) => (
              <View key={i} style={{ alignItems: 'center', gap: spacing.xs }}>
                <View style={[styles.day, i === MISSED_DAY ? styles.dayMissed : i < MISSED_DAY && (progress.week[i] ?? 0) > 0 ? styles.dayDone : null]}>
                  {i < MISSED_DAY && (progress.week[i] ?? 0) > 0 ? (
                    <Icon name="flame" size={18} rawColor={colors.streak} filled strokeWidth={1.5} />
                  ) : i === MISSED_DAY ? (
                    <Icon name="x" size={18} color="dangerText" strokeWidth={3} />
                  ) : null}
                </View>
                <Text variant="caption" color={i === MISSED_DAY ? 'dangerText' : 'textSecondary'}>
                  {d}
                </Text>
              </View>
            ))}
          </Row>
        </Card>

        <Card tone={canAfford ? 'soft' : 'surface'} padding="md">
          <Stack gap={spacing.sm}>
            <Row gap={spacing.md}>
              <Icon name="shield" color="primary" />
              <View style={{ flex: 1 }}>
                <Text variant="h3">Streak Repair</Text>
                <Text variant="bodySm" color="textSecondary">
                  {STREAK_REPAIR_GEMS} gems · you have {progress.gems}
                </Text>
              </View>
            </Row>
            {freeRepairs > 0 ? (
              <Button
                title={`Use a Monthly repair (${freeRepairs} left)`}
                icon="shield"
                loading={busy === 'plan'}
                disabled={busy !== null || !app.state.online}
                onPress={() => void repair('plan')}
              />
            ) : null}
            <Button
              title={canAfford ? `Repair for ${STREAK_REPAIR_GEMS} gems` : `Need ${STREAK_REPAIR_GEMS - progress.gems} more gems`}
              icon="gem"
              variant={freeRepairs > 0 ? 'secondary' : 'primary'}
              loading={busy === 'gems'}
              disabled={!canAfford || busy !== null || !app.state.online}
              onPress={() => void repair('gems')}
            />
            {!app.state.online ? (
              <Text variant="bodySm" color="textSecondary">
                Repairs need an internet connection.
              </Text>
            ) : failed ? (
              <Text variant="bodySm" color="dangerText">
                That didn't go through. Your gems weren't touched — try again.
              </Text>
            ) : null}
          </Stack>
        </Card>

        {!canAfford ? (
          <Card tone="gold" padding="md">
            <Stack gap={spacing.sm}>
              <Row gap={spacing.md}>
                <Icon name="gem" rawColor={colors.gem} />
                <View style={{ flex: 1 }}>
                  <Text variant="h3">{PRODUCTS['gems-small'].name}</Text>
                  <Text variant="bodySm">{PRODUCTS['gems-small'].blurb}</Text>
                </View>
                <Text variant="h3">{formatNaira(PRODUCTS['gems-small'].priceNaira)}</Text>
              </Row>
              <Button title={`Get gems & repair · ${formatNaira(PRODUCTS['gems-small'].priceNaira)}`} variant="gold" onPress={() => nav.push('Checkout', { product: 'gems-small' })} />
            </Stack>
          </Card>
        ) : null}

        <Card padding="md" onPress={() => nav.push('Plans', { reason: 'streak' })} accessibilityLabel="See Monthly plan">
          <Row gap={spacing.md}>
            <Icon name="star" color="primary" />
            <View style={{ flex: 1 }}>
              <Text variant="label">Monthly includes {MONTHLY_FREE_REPAIRS} repairs every month</Text>
              <Text variant="bodySm" color="textSecondary">
                Plus unlimited AI explanations · {formatNaira(PRODUCTS.monthly.priceNaira)}/month
              </Text>
            </View>
            <Icon name="chevronRight" color="textMuted" />
          </Row>
        </Card>

        <Button
          title="Start a new streak instead"
          variant="ghost"
          onPress={() => {
            app.breakStreak();
            nav.reset('Home');
          }}
        />
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  bigFlame: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.sm,
    borderRadius: radii.pill,
    backgroundColor: colors.streakSoft,
  },
  day: { width: 36, height: 36, borderRadius: 18, borderWidth: 2, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  dayDone: { backgroundColor: colors.streakSoft, borderColor: colors.streakSoft },
  dayMissed: { backgroundColor: colors.dangerSoft, borderColor: colors.danger, borderStyle: 'dashed' },
});
