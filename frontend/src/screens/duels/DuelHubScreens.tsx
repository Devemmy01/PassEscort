import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import { AppBar, Avatar, Button, Card, Chip, EmptyState, Icon, Row, Screen, SectionHeader, Stack, TabBar, Tag, Text, useReduceMotion } from '../../components';
import { useNav } from '../../navigation/Navigator';
import { api } from '../../api/client';
import { duelView, joinInvite, leaveDuel, startMatchmaking, useDuel } from '../../realtime/duelSession';
import { subjectMeta } from '../../practice/subjects';
import type { Routes } from '../../navigation/routes';
import { CORE_SUBJECTS } from '../../practice/questions';
import { DUEL_ROUNDS, DUEL_SECONDS_PER_QUESTION, OPPONENTS } from '../../practice/types';
import { DUEL_COUNTDOWN_MS } from '../../../../shared/duel';
import { useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';

interface RecentDuel {
  id: string;
  opponent: string;
  bot: boolean;
  subject: string;
  result: 'win' | 'loss' | 'draw';
  score: string;
}

/** Prototype data; live mode loads GET /duels/recent. */
const DEMO_RECENT: RecentDuel[] = [
  { id: '1', opponent: 'Chioma Eze', bot: false, subject: 'Chemistry', result: 'win', score: '820–610' },
  { id: '2', opponent: 'Musa Ibrahim', bot: false, subject: 'Mathematics', result: 'loss', score: '540–700' },
  { id: '3', opponent: 'Funmi Adeyemi', bot: false, subject: 'Physics', result: 'win', score: '760–720' },
];

const RESULT_TAG: Record<RecentDuel['result'], { label: string; tone: 'success' | 'danger' | 'neutral' }> = {
  win: { label: 'Won', tone: 'success' },
  loss: { label: 'Lost', tone: 'danger' },
  draw: { label: 'Draw', tone: 'neutral' },
};

export function DuelHubScreen() {
  const nav = useNav();
  const app = useApp();
  const { state } = app;
  const { progress, profile } = state;
  const subjects = profile.subjects.length ? profile.subjects : [...CORE_SUBJECTS].slice(0, 4);
  const [subject, setSubject] = useState(subjects[0]);
  const played = progress.duelsWon + progress.duelsLost;
  const [recent, setRecent] = useState<RecentDuel[]>(app.mode === 'live' ? [] : played ? DEMO_RECENT : []);
  useEffect(() => {
    if (app.mode !== 'live' || !state.online) return;
    api<RecentDuel[]>('GET', '/duels/recent')
      .then(setRecent)
      .catch(() => undefined);
  }, [app.mode, state.online, progress.duelsWon, progress.duelsLost]);
  const winRate = played ? Math.round((progress.duelsWon / played) * 100) : 0;

  return (
    <Screen header={<AppBar title="Duels" />} footer={<TabBar active="duels" onChange={nav.goTab} />}>
      <Stack gap={spacing.lg}>
        <Card tone="ink" padding="lg">
          <Row gap={spacing.lg}>
            <View style={styles.swords}>
              <Icon name="swords" size={32} color="textOnGold" strokeWidth={2.5} />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h2" color="textOnPrimary">
                {progress.duelsWon}W – {progress.duelsLost}L
              </Text>
              <Text variant="bodySm" color="textOnPrimary" style={{ opacity: 0.85 }}>
                {played ? `${winRate}% win rate` : 'No duels played yet'} · win = +30 XP
              </Text>
            </View>
          </Row>
        </Card>

        <Card>
          <Stack gap={spacing.md}>
            <Text variant="h3">Quick match</Text>
            <Text variant="bodySm" color="textSecondary">
              Get paired with a student near your level. {DUEL_ROUNDS} questions, {DUEL_SECONDS_PER_QUESTION}s each — faster correct answers score more.
            </Text>
            <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
              {subjects.map((s) => (
                <Chip key={s} label={s} icon={subjectMeta(s).icon} selected={s === subject} onPress={() => setSubject(s)} />
              ))}
            </Row>
            <Button title="Find an opponent" icon="search" disabled={!state.online} onPress={() => nav.push('Matchmaking', { subject })} />
            {!state.online ? (
              <Text variant="bodySm" color="textSecondary" align="center">
                Duels need an internet connection.
              </Text>
            ) : null}
          </Stack>
        </Card>

        <Card onPress={() => nav.push('DuelInvite', { subject })} accessibilityLabel="Challenge a friend">
          <Row gap={spacing.md}>
            <View style={[styles.swords, { backgroundColor: colors.primarySoft }]}>
              <Icon name="link" color="primary" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3">Challenge a friend</Text>
              <Text variant="bodySm" color="textSecondary">
                Send a duel link on WhatsApp
              </Text>
            </View>
            <Icon name="chevronRight" color="textMuted" />
          </Row>
        </Card>

        <SectionHeader title="Recent duels" />
        {recent.length === 0 ? (
          <Card>
            <EmptyState mood="sleep" title="No duels yet" message="Your battles will show up here." mascotSize={88} />
          </Card>
        ) : (
          <Card padding="sm">
            {recent.map((r, i) => (
              <Row key={r.id} gap={spacing.md} style={[styles.recent, i < recent.length - 1 ? styles.recentBorder : null]}>
                <Avatar name={r.opponent} size={40} />
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{r.opponent}</Text>
                  <Text variant="bodySm" color="textSecondary">
                    {r.subject} · {r.score}
                    {r.bot ? ' · practice' : ''}
                  </Text>
                </View>
                <Tag label={RESULT_TAG[r.result].label} tone={RESULT_TAG[r.result].tone} />
              </Row>
            ))}
          </Card>
        )}
      </Stack>
    </Screen>
  );
}

function PulseRings() {
  const v = useRef(new Animated.Value(0)).current;
  const reduce = useReduceMotion();
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(Animated.timing(v, { toValue: 1, duration: 1800, easing: Easing.out(Easing.quad), useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v, reduce]);
  // Reduce motion: no rings — the "Looking for…" copy and the elapsed timer carry the state.
  if (reduce) return null;
  return (
    <>
      {[0, 0.5].map((offset) => {
        const p = Animated.modulo(Animated.add(v, offset), 1);
        return (
          <Animated.View
            key={offset}
            style={[
              styles.ring,
              {
                opacity: p.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                transform: [{ scale: p.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1.6] }) }],
              },
            ]}
          />
        );
      })}
    </>
  );
}

/**
 * Matchmaking: searching (pulse) → found (VS card) → 3-2-1 → battle.
 * The duel session decides each phase (server in live mode, demo engine in
 * the prototype). Nobody around? The server offers a labelled practice bot.
 */
export function MatchmakingScreen({ params }: { params: Routes['Matchmaking'] }) {
  const nav = useNav();
  const app = useApp();
  const { state, level } = app;
  const duel = useDuel();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const current = duelView();
    const active = current.phase !== 'idle' && current.phase !== 'ended' && current.phase !== 'error' && current.subject === params.subject;
    if (!active) {
      const mode = app.mode === 'live' ? 'live' : 'demo';
      const opponentIndex = params.inviteFrom ? Math.max(0, OPPONENTS.findIndex((o) => o.name === params.inviteFrom)) : 0;
      if (params.inviteCode) joinInvite(params.inviteCode, params.subject, mode, { opponentIndex });
      else startMatchmaking(params.subject, mode, { opponentIndex, delayMs: params.inviteFrom ? 1000 : 3000 });
    }
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  useEffect(() => {
    if (duel.phase === 'round') nav.replace('DuelBattle', { subject: params.subject });
  }, [duel.phase, nav, params.subject]);

  const cancel = () => {
    leaveDuel();
    nav.back();
  };

  const me = state.profile.name || 'You';
  const found = duel.phase === 'found';
  const elapsed = Math.max(0, Math.floor((now - (duel.searchStartedAt || now)) / 1000));
  // Read the clock at render (the ticker only triggers re-renders) and never show more than the real countdown.
  const countdown = Math.min(Math.ceil(DUEL_COUNTDOWN_MS / 1000), Math.max(0, Math.ceil((duel.startsAt - Date.now()) / 1000)));
  const opponent = duel.opponent;

  if (duel.phase === 'error') {
    return (
      <Screen header={<AppBar onBack={cancel} backIcon="x" title="Duel" />}>
        <EmptyState mood="sad" title="Couldn't start the duel" message={duel.error ?? 'Check your connection and try again.'}>
          <Button title="Back" onPress={cancel} />
        </EmptyState>
      </Screen>
    );
  }

  return (
    <Screen header={<AppBar onBack={cancel} backIcon="x" title={found ? 'Match found!' : 'Matchmaking'} subtitle={`${params.subject} duel`} />} scroll={false}>
      {!found || !opponent ? (
        <View style={styles.center}>
          <View style={styles.radar}>
            <PulseRings />
            <Avatar name={me} size={96} ring={colors.surface} />
          </View>
          <Text variant="h2" align="center">
            {duel.phase === 'connecting' ? 'Connecting…' : params.inviteCode ? 'Waiting for your friend…' : 'Searching…'}
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            {params.inviteCode ? 'The duel starts the moment they open your link.' : `Looking for a ${params.subject} player around Level ${level.level}`}
          </Text>
          <Tag label={`${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, '0')}`} icon="clock" center />
          <View style={{ alignSelf: 'stretch', gap: spacing.sm, marginTop: spacing.xl }}>
            <Button title="Cancel" variant="secondary" onPress={cancel} />
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          <Row gap={spacing.lg} style={{ justifyContent: 'center' }}>
            <View style={styles.player}>
              <Avatar name={me} size={80} ring={colors.primary} />
              <Text variant="label" numberOfLines={1}>
                {me.split(' ')[0]}
              </Text>
              <Tag label={`Lv ${level.level}`} tone="gold" />
            </View>
            <View style={styles.vs}>
              <Text variant="h2" color="textOnGold">
                VS
              </Text>
            </View>
            <View style={styles.player}>
              <Avatar name={opponent.name} size={80} ring={colors.streak} />
              <Text variant="label" numberOfLines={1}>
                {opponent.name.split(' ')[0]}
              </Text>
              <Tag label={opponent.bot ? 'Practice bot' : `Lv ${opponent.level}`} tone={opponent.bot ? 'info' : 'gold'} />
            </View>
          </Row>
          <Text variant="body" color="textSecondary" align="center">
            {params.subject} · {DUEL_ROUNDS} questions · {DUEL_SECONDS_PER_QUESTION}s each
          </Text>
          {opponent.bot ? (
            <Text variant="bodySm" color="textSecondary" align="center">
              No one else is free right now, so Passy Bot will practise with you. You earn XP; it doesn't count toward your W–L record.
            </Text>
          ) : null}
          <View style={styles.countdown}>
            <Text variant="display" color="textOnPrimary" style={{ fontSize: 44, lineHeight: 52 }}>
              {countdown || 'GO'}
            </Text>
          </View>
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  swords: { width: 56, height: 56, borderRadius: radii.lg, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  recent: { paddingVertical: spacing.md, paddingHorizontal: spacing.sm },
  recentBorder: { borderBottomWidth: 2, borderBottomColor: colors.border },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  radar: { width: 220, height: 220, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.lg },
  ring: { position: 'absolute', width: 200, height: 200, borderRadius: 100, borderWidth: 4, borderColor: colors.primary },
  player: { alignItems: 'center', gap: spacing.xs, width: 100 },
  vs: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 4, borderBottomColor: colors.goldLedge },
  countdown: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg },
});
