import { useCallback, useEffect, useMemo, useState } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { ActivityDTO } from '../../../../shared/api';
import { addDays, dayKey } from '../../../../shared/clock';
import { api } from '../../api/client';
import { AppBar, Banner, Card, IconButton, Row, Screen, Skeleton, Stack, StreakIndicator, Text } from '../../components';
import { monthGrid, monthLabel, monthSummary, shiftMonth } from '../../game/calendar';
import { useNav } from '../../navigation/Navigator';
import { useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';

const WEEKDAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
/** The API keeps 120 days of activity — show this month and the three before it. */
const MONTHS_BACK = 3;

/** Month-by-month practice history (GET /leaderboard/activity). */
export function StreakCalendarScreen() {
  const nav = useNav();
  const app = useApp();
  const live = app.mode === 'live';
  const today = dayKey(new Date());
  const thisMonth = today.slice(0, 7);
  const [month, setMonth] = useState(thisMonth);
  const [activity, setActivity] = useState<ActivityDTO | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    if (!live) {
      setActivity(demoActivity(app.state.progress.week, app.goalQuestions, today, app.state.progress));
      return;
    }
    try {
      setActivity(await api<ActivityDTO>('GET', '/leaderboard/activity'));
    } catch {
      setFailed(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [live]);
  useEffect(() => {
    void load();
  }, [load]);

  const byDay = useMemo(() => Object.fromEntries((activity?.days ?? []).map((d) => [d.day, d.answered])), [activity]);
  const goal = activity?.goalQuestions ?? app.goalQuestions;
  const grid = monthGrid(month, byDay, today, goal);
  const summary = monthSummary(grid);
  const earliest = shiftMonth(thisMonth, -MONTHS_BACK);

  return (
    <Screen header={<AppBar title="Streak calendar" onBack={nav.back} />}>
      <Stack gap={spacing.lg}>
        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <StreakIndicator days={activity?.streak.days ?? app.state.progress.streakDays} state={activity?.streak.state ?? app.state.progress.streakState} size="lg" />
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="h3">{activity?.streak.best ?? app.state.progress.bestStreak} days</Text>
              <Text variant="caption" color="textSecondary">
                BEST STREAK
              </Text>
            </View>
          </Row>
        </Card>

        {failed ? (
          <Banner tone={app.state.online ? 'danger' : 'offline'} message={app.state.online ? 'Couldn’t load your history.' : 'You’re offline — your history needs a connection.'} action="Try again" onAction={() => void load()} />
        ) : null}

        <Card>
          <Stack gap={spacing.md}>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ opacity: month <= earliest ? 0.3 : 1 }}>
                <IconButton icon="chevronLeft" label="Previous month" onPress={month <= earliest ? undefined : () => setMonth(shiftMonth(month, -1))} />
              </View>
              <Text variant="h3">{monthLabel(month)}</Text>
              <View style={{ opacity: month >= thisMonth ? 0.3 : 1 }}>
                <IconButton icon="chevronRight" label="Next month" onPress={month >= thisMonth ? undefined : () => setMonth(shiftMonth(month, 1))} />
              </View>
            </Row>
            <View style={styles.week}>
              {WEEKDAYS.map((d, i) => (
                <Text key={i} variant="caption" color="textMuted" align="center" style={styles.cell}>
                  {d}
                </Text>
              ))}
            </View>
            {activity || failed ? (
              grid.map((week, wi) => (
                <View key={wi} style={styles.week}>
                  {week.map((c, ci) => (
                    <View key={ci} style={styles.cell}>
                      {c ? (
                        <View
                          accessibilityLabel={`${c.day}: ${c.answered ? `${c.answered} questions${c.goalMet ? ', goal met' : ''}` : 'no practice'}`}
                          style={[
                            styles.day,
                            c.answered > 0 ? (c.goalMet ? styles.goalMet : styles.practised) : null,
                            c.today ? styles.today : null,
                          ]}
                        >
                          <Text variant="label" color={c.future ? 'placeholder' : 'text'} style={{ fontWeight: c.answered > 0 ? '700' : '500' }}>
                            {c.date}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ))}
                </View>
              ))
            ) : (
              <Skeleton height={220} radius={radii.md} />
            )}
            <Row gap={spacing.lg} style={{ justifyContent: 'center', flexWrap: 'wrap' }}>
              <Legend style={styles.goalMet} label="Goal met" />
              <Legend style={styles.practised} label="Practised" />
              <Legend style={styles.today} label="Today" />
            </Row>
          </Stack>
        </Card>

        <Row gap={spacing.md}>
          <Card padding="md" style={{ flex: 1 }}>
            <Text variant="h2">{summary.practised}</Text>
            <Text variant="caption" color="textSecondary">
              DAYS PRACTISED
            </Text>
          </Card>
          <Card padding="md" style={{ flex: 1 }}>
            <Text variant="h2">{summary.goalDays}</Text>
            <Text variant="caption" color="textSecondary">
              DAILY GOALS MET
            </Text>
          </Card>
        </Row>
        <Text variant="bodySm" color="textSecondary" align="center">
          Your daily goal is {goal} questions. Practise any amount to keep the streak; hit the goal to fill the day.
        </Text>
      </Stack>
    </Screen>
  );
}

function Legend({ style, label }: { style: StyleProp<ViewStyle>; label: string }) {
  return (
    <Row gap={spacing.xs}>
      <View style={[styles.swatch, style]} />
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </Row>
  );
}

/** Demo history: the last 7 days from the profile, plus the streak's earlier days. */
function demoActivity(week: number[], goal: number, today: string, p: { streakDays: number; bestStreak: number; streakState: 'active' | 'pending' | 'broken' }): ActivityDTO {
  const days: { day: string; answered: number }[] = [];
  for (let i = 60; i >= 7; i--) {
    const n = i === p.streakDays ? 0 : i < p.streakDays ? goal + ((i * 7) % 11) - 4 : (i * 13) % 5 === 0 ? 0 : (i * 5) % 17;
    if (n > 0) days.push({ day: addDays(today, -i), answered: n });
  }
  // Inside the current streak every day was practised (the sample week has a gap the streak covers).
  week.forEach((n, i) => {
    const answered = n > 0 ? n : 6 - i < p.streakDays && p.streakState !== 'broken' ? 6 : 0;
    if (answered > 0) days.push({ day: addDays(today, i - 6), answered });
  });
  return { days, streak: { days: p.streakDays, best: p.bestStreak, state: p.streakState }, goalQuestions: goal };
}

const styles = StyleSheet.create({
  week: { flexDirection: 'row' },
  cell: { flex: 1, alignItems: 'center', paddingVertical: 2 },
  day: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  today: { borderWidth: 2, borderColor: colors.primary },
  goalMet: { backgroundColor: colors.streak },
  /** Practised but short of the goal: an orange ring, so it reads on white as well as on the pale fill. */
  practised: { backgroundColor: colors.streakSoft, borderWidth: 1.5, borderColor: colors.streak },
  swatch: { width: 14, height: 14, borderRadius: 7 },
});
