import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppBar,
  Avatar,
  BadgeMedal,
  Button,
  Card,
  Divider,
  IconButton,
  ListItem,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Sheet,
  Stack,
  StreakIndicator,
  SubjectIcon,
  TabBar,
  Tag,
  Text,
  type TagTone,
  XpBar,
} from '../../components';
import { BADGE_CATEGORIES, BADGES, type BadgeDef } from '../../game/badges';
import { LEVEL_TIERS, levelTitle, MAX_LEVEL, totalXpForLevel, xpToNext } from '../../game/levels';
import { formatNaira, PREMIUM_NAME, PRODUCTS } from '../../game/pricing';
import { AMBASSADOR_RULES } from '../../game/referral';
import { useNav } from '../../navigation/Navigator';
import { useApp, type Progress } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';

/* ------------------------------------------------------------------ */
/* Badge showcase                                                      */
/* ------------------------------------------------------------------ */

function badgeProgress(b: BadgeDef, p: Progress): number {
  // Live: the server tracks every badge's real progress.
  if (b.id in p.badgeProgress) return Math.min(b.target, p.badgeProgress[b.id] ?? 0);
  // Prototype only: illustrative numbers for the demo profile.
  const bestMastery = Math.max(0, ...Object.values(p.mastery)) * 100;
  const map: Record<string, number> = {
    'first-steps': p.sessionsCompleted,
    century: p.questionsAnswered,
    'question-machine': p.questionsAnswered,
    'on-fire': p.streakDays,
    unstoppable: p.streakDays,
    duelist: p.duelsWon,
    champion: p.duelsWon,
    'subject-master': Math.round(bestMastery),
    'all-rounder': Object.values(p.mastery).filter((m) => m >= 0.7).length,
    sharpshooter: 6,
    speedster: 0,
    'perfect-40': 0,
    comeback: 0,
    'early-bird': 5,
    'night-owl': 2,
    recruiter: 0,
    'show-off': 5,
  };
  return Math.min(b.target, map[b.id] ?? 0);
}

export function BadgesScreen() {
  const nav = useNav();
  const { state } = useApp();
  const [selected, setSelected] = useState<BadgeDef | null>(null);
  const earned = state.progress.earnedBadges;

  return (
    <Screen header={<AppBar title="Badges" subtitle={`${earned.length} of ${BADGES.length} earned`} onBack={nav.back} />}>
      <Stack gap={spacing.lg}>
        <Card tone="gold" padding="md">
          <Row gap={spacing.md}>
            <BadgeMedal icon="trophy" tier="gold" size={56} />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text variant="h3">{earned.length} badges collected</Text>
              <ProgressBar value={earned.length / BADGES.length} color={colors.gold} height={10} />
            </View>
          </Row>
        </Card>
        {BADGE_CATEGORIES.map((cat) => (
          <View key={cat}>
            <SectionHeader title={cat} />
            <View style={styles.badgeGrid}>
              {BADGES.filter((b) => b.category === cat).map((b) => {
                const has = earned.includes(b.id);
                const prog = badgeProgress(b, state.progress);
                return (
                  <Pressable key={b.id} style={styles.badgeCell} onPress={() => setSelected(b)} accessibilityRole="button" accessibilityLabel={`${b.name}${has ? ', earned' : ', locked'}`}>
                    <BadgeMedal icon={b.icon} tier={b.tier} locked={!has} size={72} />
                    <Text variant="label" align="center" numberOfLines={1} color={has ? 'text' : 'textSecondary'}>
                      {b.name}
                    </Text>
                    {!has ? (
                      <View style={{ width: '80%' }}>
                        <ProgressBar value={prog / b.target} height={6} animated={false} />
                      </View>
                    ) : (
                      <Tag label={b.tier === 'legend' ? 'Legendary' : b.tier[0].toUpperCase() + b.tier.slice(1)} tone={b.tier === 'gold' || b.tier === 'legend' ? 'gold' : 'neutral'} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </View>
        ))}
      </Stack>

      <Sheet visible={selected !== null} onClose={() => setSelected(null)}>
        {selected ? (
          <Stack gap={spacing.md} style={{ alignItems: 'center', paddingVertical: spacing.md }}>
            <BadgeMedal icon={selected.icon} tier={selected.tier} locked={!earned.includes(selected.id)} size={120} />
            <Text variant="h1" align="center">
              {selected.name}
            </Text>
            <Text variant="body" color="textSecondary" align="center">
              {selected.description}
            </Text>
            {earned.includes(selected.id) ? (
              <>
                <Tag label="Earned" tone="success" icon="check" center />
                <View style={{ alignSelf: 'stretch' }}>
                  <Button
                    title="Share to WhatsApp Status"
                    variant="whatsapp"
                    icon="message"
                    onPress={() => {
                      setSelected(null);
                      nav.push('ShareCard', { card: { kind: 'badge', badgeId: selected.id } });
                    }}
                  />
                </View>
              </>
            ) : (
              <View style={{ alignSelf: 'stretch', gap: spacing.xs }}>
                <ProgressBar value={badgeProgress(selected, state.progress) / selected.target} />
                <Text variant="label" color="textSecondary" align="center">
                  {badgeProgress(selected, state.progress)} / {selected.target} {selected.unit}
                </Text>
              </View>
            )}
          </Stack>
        ) : null}
      </Sheet>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Profile / mastery / stats                                           */
/* ------------------------------------------------------------------ */

function masteryLabel(m: number): { label: string; tone: TagTone } {
  if (m >= 0.9) return { label: 'Mastered', tone: 'gold' };
  if (m >= 0.7) return { label: 'Strong', tone: 'success' };
  if (m >= 0.4) return { label: 'Getting there', tone: 'warning' };
  return { label: 'Needs work', tone: 'danger' };
}

export function ProfileScreen() {
  const nav = useNav();
  const app = useApp();
  const { profile, progress, entitlement } = app.state;
  const accuracy = progress.questionsAnswered ? Math.round((progress.correctAnswers / progress.questionsAnswered) * 100) : 0;
  const subjects = profile.subjects.length ? profile.subjects : Object.keys(progress.mastery);

  const stats: [string, string][] = [
    ['Total XP', progress.totalXp.toLocaleString('en-NG')],
    ['Questions', String(progress.questionsAnswered)],
    ['Accuracy', `${accuracy}%`],
    ['Best streak', `${progress.bestStreak} days`],
    ['Duels W–L', `${progress.duelsWon}–${progress.duelsLost}`],
    ['Badges', `${progress.earnedBadges.length}/${BADGES.length}`],
  ];

  return (
    <Screen header={<AppBar title="Profile" right={<IconButton icon="settings" label="Settings" onPress={() => nav.push('Settings')} />} />} footer={<TabBar active="profile" onChange={nav.goTab} />}>
      <Stack gap={spacing.lg}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Avatar name={profile.name || 'New Student'} size={88} ring={colors.gold} />
          <Text variant="h1">{profile.name || 'New Student'}</Text>
          <Row gap={spacing.xs}>
            <Tag label={`Level ${app.level.level} · ${app.level.title}`} tone="gold" icon="star" />
            {(profile.exams.length ? profile.exams : ['JAMB']).map((e) => (
              <Tag key={e} label={e} tone="primary" />
            ))}
          </Row>
        </View>

        <Card>
          <Stack gap={spacing.md}>
            <XpBar level={app.level.level} current={app.level.current} needed={app.level.needed} />
            <Row style={{ justifyContent: 'space-between' }}>
              <Pressable onPress={() => nav.push('StreakCalendar')} accessibilityRole="button" accessibilityLabel={`${progress.streakDays}-day streak. Open streak calendar`}>
                <StreakIndicator days={progress.streakDays} state={progress.streakState} size="lg" />
              </Pressable>
              <Button title="Level roadmap" size="sm" variant="secondary" fullWidth={false} iconRight="chevronRight" onPress={() => nav.push('Levels')} />
            </Row>
          </Stack>
        </Card>

        <View style={styles.statGrid}>
          {stats.map(([label, value]) => (
            <View key={label} style={styles.statCell}>
              <Card padding="md">
                <Text variant="h2">{value}</Text>
                <Text variant="caption" color="textSecondary">
                  {label.toUpperCase()}
                </Text>
              </Card>
            </View>
          ))}
        </View>

        <SectionHeader title="Subject mastery" />
        <Card>
          <Stack gap={spacing.lg}>
            {subjects.length === 0 ? (
              <Text color="textSecondary">Practise a subject to see your mastery here.</Text>
            ) : (
              subjects.map((s) => {
                const m = progress.mastery[s] ?? 0;
                const l = masteryLabel(m);
                return (
                  <View key={s} style={{ gap: spacing.xs }}>
                    <Row style={{ justifyContent: 'space-between' }}>
                      <Row gap={spacing.sm} style={{ flex: 1 }}>
                        <SubjectIcon subject={s} size={28} />
                        <Text variant="label" numberOfLines={1} style={{ flex: 1 }}>
                          {s}
                        </Text>
                      </Row>
                      <Row gap={spacing.sm}>
                        <Tag label={l.label} tone={l.tone} />
                        <Text variant="label">{Math.round(m * 100)}%</Text>
                      </Row>
                    </Row>
                    <ProgressBar value={m} height={10} color={m >= 0.7 ? colors.success : m >= 0.4 ? colors.gold : colors.danger} />
                  </View>
                );
              })
            )}
            <Text variant="bodySm" color="textSecondary">
              Mastery blends accuracy, difficulty and recency over your last 50 answers per subject.
            </Text>
          </Stack>
        </Card>

        <SectionHeader title="Badges" action="See all" onAction={() => nav.push('Badges')} />
        <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
          {BADGES.filter((b) => progress.earnedBadges.includes(b.id)).map((b) => (
            <BadgeMedal key={b.id} icon={b.icon} tier={b.tier} size={56} />
          ))}
        </Row>

        <Card padding="sm">
          <ListItem
            icon="star"
            title={entitlement.plan === 'free' ? 'Free plan' : `${PREMIUM_NAME} · ${entitlement.plan === 'monthly' ? 'Monthly' : 'Day Pass'}`}
            subtitle={entitlement.plan === 'free' ? `Upgrade from ${formatNaira(PRODUCTS.day.priceNaira)}` : entitlement.expiresLabel}
            onPress={() => nav.push('Plans')}
          />
          <Divider />
          <ListItem icon="users" title="Invite friends" subtitle="Earn the Recruiter badge" onPress={() => nav.push('WaInvite')} />
          <Divider />
          <ListItem
            icon="award"
            title={app.state.ambassador ? 'Ambassador dashboard' : 'Become an ambassador'}
            subtitle={app.state.ambassador ? 'Your code, earnings and payouts' : `Earn ${Math.round(AMBASSADOR_RULES.commissionRate * 100)}% when friends subscribe`}
            onPress={() => nav.push(app.state.ambassador ? 'Ambassador' : 'AmbassadorIntro')}
          />
          <Divider />
          <ListItem icon="pencil" title="Edit exams & subjects" onPress={() => nav.push('OnboardExam')} />
          <Divider />
          <ListItem icon="settings" title="Settings" subtitle="Notifications, account" onPress={() => nav.push('Settings')} />
        </Card>
      </Stack>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Level roadmap                                                       */
/* ------------------------------------------------------------------ */

export function LevelsScreen() {
  const nav = useNav();
  const { level, state } = useApp();
  return (
    <Screen header={<AppBar title="Level roadmap" subtitle={`${state.progress.totalXp.toLocaleString('en-NG')} XP total`} onBack={nav.back} />}>
      <Stack gap={spacing.sm}>
        {LEVEL_TIERS.map((tier, i) => {
          const to = LEVEL_TIERS[i + 1] ? LEVEL_TIERS[i + 1].from - 1 : MAX_LEVEL;
          const current = level.level >= tier.from && level.level <= to;
          const done = level.level > to;
          return (
            <Card key={tier.title} tone={current ? 'soft' : 'surface'} selected={current} padding="md">
              <Row gap={spacing.md}>
                <View style={[styles.tierDot, done ? { backgroundColor: colors.success } : current ? { backgroundColor: colors.gold } : null]}>
                  <Text variant="label" color={done ? 'textOnPrimary' : current ? 'textOnGold' : 'textSecondary'}>
                    {tier.from}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3">{tier.title}</Text>
                  <Text variant="bodySm" color="textSecondary">
                    {tier.from === to ? `Level ${tier.from}` : `Levels ${tier.from}–${to}`} · from {totalXpForLevel(tier.from).toLocaleString('en-NG')} XP
                  </Text>
                </View>
                {current ? <Tag label="You" tone="gold" /> : done ? <Tag label="Done" tone="success" icon="check" /> : null}
              </Row>
              {current && level.level < MAX_LEVEL ? (
                <View style={{ marginTop: spacing.md }}>
                  <XpBar level={level.level} current={level.current} needed={xpToNext(level.level)} />
                  <Text variant="caption" color="textSecondary" style={{ marginTop: spacing.xs }}>
                    Next title: {levelTitle(to + 1)} at level {to + 1}
                  </Text>
                </View>
              ) : null}
            </Card>
          );
        })}
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm },
  badgeCell: { width: '33.33%', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm },
  statGrid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  statCell: { width: '50%', padding: spacing.xs },
  tierDot: { width: 40, height: 40, borderRadius: radii.pill, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
});
