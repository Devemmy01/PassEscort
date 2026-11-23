import { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LeaderboardDTO, LeaderboardEntry, LeaderboardScope } from '../../../../shared/api';
import { api } from '../../api/client';
import { AppBar, Avatar, Banner, Button, Card, EmptyState, Icon, Row, Screen, SegmentedControl, Skeleton, Stack, TabBar, Text } from '../../components';
import { useNav } from '../../navigation/Navigator';
import { demoLeaderboard, gapToNext, resetsInLabel } from '../../social/leaderboard';
import { useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';

const SCOPES: { value: LeaderboardScope; label: string }[] = [
  { value: 'week', label: 'This week' },
  { value: 'friends', label: 'Friends' },
  { value: 'all', label: 'All time' },
];

/** Gold, silver, bronze (dark text on the first two, white on bronze — all ≥ 4.5:1). */
const MEDAL = [colors.gold, colors.placeholder, '#C2410C'] as const;

/** Weekly / friends / all-time XP boards (GET /leaderboard). Weekly resets Monday 00:00 WAT. */
export function LeaderboardScreen() {
  const nav = useNav();
  const app = useApp();
  const live = app.mode === 'live';
  const [scope, setScope] = useState<LeaderboardScope>('week');
  const [board, setBoard] = useState<LeaderboardDTO | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    async (s: LeaderboardScope) => {
      setFailed(false);
      setBoard(null);
      if (!live) {
        const p = app.state.progress;
        setBoard(demoLeaderboard(s, { name: app.state.profile.name, totalXp: p.totalXp, weekXp: p.week.reduce((a, b) => a + b, 0) * 10 }));
        return;
      }
      try {
        setBoard(await api<LeaderboardDTO>('GET', `/leaderboard?scope=${s}`));
      } catch {
        setFailed(true);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [live],
  );

  useEffect(() => {
    void load(scope);
  }, [scope, load]);

  const gap = board ? gapToNext(board) : null;
  const mineInList = board?.entries.some((e) => e.me);

  return (
    <Screen header={<AppBar title="Leaderboard" />} footer={<TabBar active="leaderboard" onChange={nav.goTab} />}>
      <Stack gap={spacing.lg}>
        <SegmentedControl options={SCOPES} value={scope} onChange={setScope} />
        {scope !== 'all' && board ? (
          <Row gap={spacing.xs} style={{ justifyContent: 'center' }}>
            <Icon name="clock" size={16} color="textSecondary" />
            <Text variant="label" color="textSecondary">
              {resetsInLabel(board.resetsAt, new Date())} · Monday 12 am
            </Text>
          </Row>
        ) : null}

        {failed ? (
          <Banner
            tone={app.state.online ? 'danger' : 'offline'}
            message={app.state.online ? 'Couldn’t load the leaderboard.' : 'You’re offline — the leaderboard needs a connection.'}
            action="Try again"
            onAction={() => void load(scope)}
          />
        ) : null}

        {!board && !failed ? (
          <Card padding="sm">
            {[0, 1, 2, 3, 4].map((i) => (
              <View key={i} style={styles.row}>
                <Skeleton width={28} height={20} />
                <Skeleton width={40} height={40} radius={20} />
                <View style={{ flex: 1, gap: 6 }}>
                  <Skeleton width="60%" />
                  <Skeleton width="30%" height={12} />
                </View>
              </View>
            ))}
          </Card>
        ) : null}

        {board && board.entries.length === 0 && !board.me ? (
          scope === 'friends' ? (
            <EmptyState title="No friends on the board yet" message="Invite classmates or duel them — they’ll show up here with their weekly XP.">
              <Button title="Invite friends" icon="users" onPress={() => nav.push('WaInvite')} />
            </EmptyState>
          ) : (
            <EmptyState title="The board is wide open" message="Answer questions this week and you could be number one.">
              <Button title="Start practising" onPress={() => nav.goTab('practice')} />
            </EmptyState>
          )
        ) : null}

        {board && (board.entries.length > 0 || board.me) ? (
          <Card padding="sm">
            {board.entries.map((e) => (
              <EntryRow key={`${e.rank}-${e.name}`} entry={e} />
            ))}
            {!mineInList && board.me ? (
              <>
                <Text variant="label" color="textMuted" align="center" style={{ paddingVertical: spacing.xs }}>
                  ···
                </Text>
                <EntryRow entry={board.me} />
              </>
            ) : null}
          </Card>
        ) : null}

        {board && gap ? (
          <Banner tone="primary" icon="target" message={`${gap.xp.toLocaleString('en-NG')} XP to pass ${gap.name}. A quick sprint will do it.`} action="Practise" onAction={() => nav.goTab('practice')} />
        ) : null}
        {board && !mineInList && !board.me && board.entries.length > 0 ? (
          <Text variant="bodySm" color="textSecondary" align="center">
            Earn XP {scope === 'all' ? '' : 'this week '}to join the board.
          </Text>
        ) : null}
      </Stack>
    </Screen>
  );
}

function EntryRow({ entry }: { entry: LeaderboardEntry }) {
  const medal = entry.rank <= 3 ? MEDAL[entry.rank - 1] : undefined;
  return (
    <View
      style={[styles.row, entry.me ? styles.me : null]}
      accessibilityLabel={`Rank ${entry.rank}, ${entry.me ? 'you' : entry.name}, level ${entry.level}, ${entry.xp} XP`}
    >
      <View style={[styles.rank, medal ? { backgroundColor: medal } : null]}>
        <Text variant="label" color={entry.rank === 3 ? 'textOnPrimary' : medal ? 'text' : 'textSecondary'} style={{ fontWeight: '700' }}>
          {entry.rank}
        </Text>
      </View>
      <Avatar name={entry.name} size={40} />
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong" numberOfLines={1}>
          {entry.me ? `${entry.name} (you)` : entry.name}
        </Text>
        <Text variant="caption" color="textSecondary">
          Level {entry.level}
        </Text>
      </View>
      <Text variant="mono" color={entry.me ? 'primary' : 'text'}>
        {entry.xp.toLocaleString('en-NG')} XP
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, paddingHorizontal: spacing.sm, borderRadius: radii.md },
  me: { backgroundColor: colors.primarySoft },
  rank: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
});
