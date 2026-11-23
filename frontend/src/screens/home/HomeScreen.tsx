import { Pressable, StyleSheet, View } from 'react-native';
import {
  Avatar,
  BadgeMedal,
  Banner,
  Button,
  Card,
  CounterPill,
  EmptyState,
  Icon,
  Mascot,
  ProgressBar,
  ProgressRing,
  Row,
  Screen,
  SectionHeader,
  Stack,
  StreakIndicator,
  SubjectIcon,
  TabBar,
  Text,
  XpBar,
} from '../../components';
import { BADGES } from '../../game/badges';
import { XP_RULES } from '../../game/levels';
import { useNav } from '../../navigation/Navigator';
import { usePushPrompt } from '../../notifications/usePushPrompt';
import type { Routes } from '../../navigation/routes';
import { CORE_SUBJECTS } from '../../practice/questions';
import { DUEL_ROUNDS, DUEL_SECONDS_PER_QUESTION } from '../../practice/types';
import { NEW_PROFILE, useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';

function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function HomeScreen({ params }: { params: Routes['Home'] }) {
  const pushPrompt = usePushPrompt();
  const nav = useNav();
  const app = useApp();
  const { profile, online } = app.state;
  const isNew = params?.variant === 'new' || app.state.progress.questionsAnswered === 0;
  const progress = isNew ? { ...NEW_PROFILE.progress, gems: app.state.progress.gems } : app.state.progress;
  const subjects = profile.subjects.length ? profile.subjects : [...CORE_SUBJECTS].slice(0, 4);
  const jamb = profile.exams.includes('JAMB') || profile.exams.length === 0;
  const firstName = profile.name.split(' ')[0] || 'there';
  const goalLeft = Math.max(0, app.goalQuestions - progress.todayAnswered);
  const goalDone = goalLeft === 0;

  const startPractice = (subject: string) =>
    jamb ? nav.push('CbtIntro', { subject }) : nav.push('WaecSession', { subject, examBody: profile.exams.includes('NECO') ? 'NECO' : 'WAEC' });

  return (
    <Screen footer={<TabBar active="home" onChange={nav.goTab} />} contentStyle={{ paddingTop: spacing.md }}>
      <Stack gap={spacing.lg}>
        {/* Top bar */}
        <Row style={{ justifyContent: 'space-between' }}>
          <Row gap={spacing.sm} style={{ flex: 1 }}>
            <Avatar name={profile.name || 'New Student'} size={44} />
            <View style={{ flex: 1 }}>
              <Text variant="caption" color="textSecondary">
                {greeting()}
              </Text>
              <Text variant="h3" numberOfLines={1}>
                {firstName}
              </Text>
            </View>
          </Row>
          <Row gap={spacing.xs}>
            <Pressable onPress={() => nav.push('StreakCalendar')} accessibilityRole="button" accessibilityLabel={`${progress.streakDays}-day streak. Open streak calendar`} hitSlop={6}>
              <StreakIndicator days={progress.streakDays} state={progress.streakState} />
            </Pressable>
            <CounterPill kind="gem" value={progress.gems} />
          </Row>
        </Row>

        {!online ? <Banner tone="offline" title="You're offline" message="Practice still works. XP and streaks sync when you reconnect." /> : null}

        {isNew ? (
          <>
            <Card tone="primary" padding="lg">
              <Row gap={spacing.md}>
                <View style={{ flex: 1, gap: spacing.sm }}>
                  <Text variant="overline" color="textOnPrimary">
                    DAY 1
                  </Text>
                  <Text variant="h2" color="textOnPrimary">
                    Your first practice is 2 minutes away
                  </Text>
                  <Text variant="bodySm" color="textOnPrimary">
                    Answer 5 questions to earn your first XP and start a streak.
                  </Text>
                </View>
                <Mascot mood="happy" size={96} />
              </Row>
              <View style={{ marginTop: spacing.lg }}>
                <Button title={`Start ${subjects[0]}`} variant="gold" icon="play" onPress={() => startPractice(subjects[0])} />
              </View>
            </Card>

            <Card>
              <Stack gap={spacing.sm}>
                <XpBar level={1} current={0} needed={100} />
                <Text variant="bodySm" color="textSecondary">
                  Every correct answer = +10 XP. Level 2 unlocks after about 10 right answers.
                </Text>
              </Stack>
            </Card>

            <SectionHeader title="Badges" />
            <Card>
              <Row gap={spacing.md} style={{ justifyContent: 'center' }}>
                {BADGES.slice(0, 4).map((b) => (
                  <BadgeMedal key={b.id} icon={b.icon} tier={b.tier} locked size={56} />
                ))}
              </Row>
              <Text variant="bodySm" color="textSecondary" align="center" style={{ marginTop: spacing.sm }}>
                Your first badge, “First Steps”, is one session away.
              </Text>
            </Card>

            <SectionHeader title="Duels" />
            <Card>
              <EmptyState mood="sleep" title="No duels yet" message="Once you've warmed up, challenge a classmate to a 7-question battle." mascotSize={88} />
            </Card>
          </>
        ) : (
          <>
            <Card onPress={() => nav.push('Levels')} accessibilityLabel="Your level">
              <Stack gap={spacing.sm}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="h3">
                    Level {app.level.level} · {app.level.title}
                  </Text>
                  <Icon name="chevronRight" color="textMuted" />
                </Row>
                <XpBar level={app.level.level} current={app.level.current} needed={app.level.needed} />
              </Stack>
            </Card>

            <Card tone={goalDone ? 'success' : 'surface'}>
              <Row gap={spacing.lg}>
                <ProgressRing value={app.goalQuestions ? progress.todayAnswered / app.goalQuestions : 0} size={76} stroke={9}>
                  <Text variant="label">
                    {progress.todayAnswered}/{app.goalQuestions}
                  </Text>
                </ProgressRing>
                <View style={{ flex: 1, gap: 2 }}>
                  <Text variant="h3">{goalDone ? 'Daily goal smashed!' : 'Daily goal'}</Text>
                  <Text variant="bodySm" color="textSecondary">
                    {goalDone
                      ? `Your ${progress.streakDays}-day streak is safe. Bonus XP from here.`
                      : `${goalLeft} more questions to keep your ${progress.streakDays}-day streak alive.`}
                  </Text>
                </View>
              </Row>
              {!goalDone ? (
                <View style={{ marginTop: spacing.md }}>
                  <Button title="Continue practising" icon="play" onPress={() => startPractice(subjects[0])} />
                </View>
              ) : null}
            </Card>

            {pushPrompt.show && progress.streakState !== 'broken' ? (
              <Card>
                <Stack gap={spacing.sm}>
                  <Text variant="h3">Never lose your streak to a busy day</Text>
                  <Text color="textSecondary">Get one reminder at 6 pm when today’s practice is still to do — plus duel invites from friends.</Text>
                  <Row gap={spacing.sm}>
                    <Button title="Not now" variant="secondary" size="sm" fullWidth={false} onPress={pushPrompt.dismiss} />
                    <Button title="Remind me" icon="bell" size="sm" fullWidth={false} onPress={() => void pushPrompt.accept()} />
                  </Row>
                </Stack>
              </Card>
            ) : null}

            {progress.streakState === 'broken' ? (
              <Banner tone="danger" title="Your streak broke" message="Repair it within 48 hours to keep your progress." action="Repair" onAction={() => nav.push('StreakRepair')} />
            ) : null}

            <SectionHeader title="Your subjects" action="All" onAction={() => nav.goTab('practice')} />
            <View style={styles.grid}>
              {subjects.map((s) => {
                const m = progress.mastery[s] ?? 0;
                return (
                  <View key={s} style={styles.gridItem}>
                    <Card onPress={() => startPractice(s)} accessibilityLabel={`Practise ${s}`}>
                      <Stack gap={spacing.sm}>
                        <Row gap={spacing.sm}>
                          <SubjectIcon subject={s} size={32} />
                          <Text variant="label" numberOfLines={1} style={{ flex: 1 }}>
                            {s}
                          </Text>
                        </Row>
                        <ProgressBar value={m} color={m >= 0.7 ? colors.success : colors.primary} height={8} />
                        <Text variant="caption" color="textSecondary">
                          {Math.round(m * 100)}% mastery
                        </Text>
                      </Stack>
                    </Card>
                  </View>
                );
              })}
            </View>

            <Card tone="ink" onPress={() => nav.goTab('duels')} accessibilityLabel="Duel a friend">
              <Row gap={spacing.md}>
                <View style={styles.duelIcon}>
                  <Icon name="swords" color="textOnGold" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3" color="textOnPrimary">
                    Duel a friend
                  </Text>
                  <Text variant="bodySm" color="textOnPrimary" style={{ opacity: 0.85 }}>
                    {DUEL_ROUNDS} questions · {DUEL_SECONDS_PER_QUESTION}s each · winner takes +{XP_RULES.duelWin} XP
                  </Text>
                </View>
                <Icon name="chevronRight" color="textOnPrimary" />
              </Row>
            </Card>

            <SectionHeader title="This week" />
            <Card>
              <View style={styles.week}>
                {progress.week.map((n, i) => {
                  const max = Math.max(...progress.week, 1);
                  return (
                    <View key={i} style={styles.weekCol}>
                      <View style={[styles.weekBar, { height: 8 + (n / max) * 72, backgroundColor: n === 0 ? colors.surfaceSunken : i === 6 ? colors.gold : colors.primary }]} />
                      <Text variant="caption" color={i === 6 ? 'text' : 'textSecondary'}>
                        {DAYS[i]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </Card>

            <SectionHeader title="Badges" action="See all" onAction={() => nav.push('Badges')} />
            <Row gap={spacing.md}>
              {BADGES.filter((b) => progress.earnedBadges.includes(b.id))
                .slice(0, 4)
                .map((b) => (
                  <BadgeMedal key={b.id} icon={b.icon} tier={b.tier} size={64} />
                ))}
            </Row>
          </>
        )}
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginHorizontal: -spacing.xs },
  gridItem: { width: '50%', padding: spacing.xs },
  duelIcon: { width: 44, height: 44, borderRadius: radii.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  week: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', height: 100 },
  weekCol: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  weekBar: { width: 20, borderRadius: radii.sm },
});
