import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { Avatar, Banner, Button, CountUp, Dialog, EmptyState, Icon, OptionButton, PointsPop, PopIn, RoundTimer, Row, Screen, Stack, Tag, Text, type OptionState } from '../../components';
import { useNav } from '../../navigation/Navigator';
import type { Routes } from '../../navigation/routes';
import { DUEL_ROUNDS, DUEL_SECONDS_PER_QUESTION, type DuelOutcome } from '../../practice/types';
import { DUEL_REACTION_COOLDOWN_MS, DUEL_REACTIONS, type DuelReaction } from '../../../../shared/duel';
import { duelView, forfeit, leaveDuel, sendReaction, startMatchmaking, submitAnswer, useDuel, type DuelView } from '../../realtime/duelSession';
import { useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';

/** The result screen's shape, built from the server's duel:end. */
function toOutcome(v: DuelView): DuelOutcome {
  const end = v.end!;
  return {
    subject: v.subject,
    opponent: { name: v.opponent?.name ?? 'Opponent', level: v.opponent?.level ?? 1, skill: 0, bot: v.opponent?.bot },
    rounds: end.rounds.map((r) => ({
      questionId: r.questionId,
      myCorrect: r.youCorrect,
      mySeconds: (r.youMs ?? DUEL_SECONDS_PER_QUESTION * 1000) / 1000,
      theirCorrect: r.themCorrect,
      theirSeconds: (r.themMs ?? DUEL_SECONDS_PER_QUESTION * 1000) / 1000,
    })),
    myScore: end.you,
    theirScore: end.opponent,
    xp: end.xp,
    practice: end.practice,
    reason: end.reason,
  };
}

/**
 * Live battle (PRD §5.6). Everything shown comes from the duel session:
 * the server (or, in the prototype, the demo engine) owns the clock,
 * the questions and the points. The student only picks an option.
 */
export default function DuelBattleScreen({ params }: { params: Routes['DuelBattle'] }) {
  const nav = useNav();
  const app = useApp();
  const duel = useDuel();
  const [quitOpen, setQuitOpen] = useState(false);
  const [now, setNow] = useState(Date.now());
  const handled = useRef(false);

  // Opened directly (prototype index): start a demo duel here.
  useEffect(() => {
    if (duelView().phase === 'idle') startMatchmaking(params.subject, app.mode === 'live' ? 'live' : 'demo', { opponentIndex: params.opponentIndex, simulateDrop: params.simulateDrop, delayMs: 0 });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per mount
  }, []);

  // Seconds display ticks locally against the server deadline.
  useEffect(() => {
    if (duel.phase !== 'round') return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [duel.phase]);

  // The end: results (and level-ups), from the server's numbers.
  useEffect(() => {
    if (duel.phase !== 'ended' || !duel.end || handled.current) return;
    handled.current = true;
    const outcome = toOutcome(duel);
    const levelUps = [...duel.end.levelUps];
    if (app.mode === 'live') void app.refresh();
    else {
      app.recordDuel(duel.end.result === 'win');
      const lvl = app.awardXp(duel.end.xp);
      if (lvl) levelUps.push(lvl);
    }
    nav.replace('DuelResult', { outcome });
    const top = levelUps[levelUps.length - 1];
    if (top) nav.push('LevelUp', { level: top });
  }, [duel, app, nav]);

  if (duel.phase === 'error') {
    return (
      <Screen>
        <EmptyState mood="sad" title="The duel couldn't continue" message={duel.error ?? 'Check your connection and try again.'}>
          <Button
            title="Back to duels"
            onPress={() => {
              leaveDuel();
              nav.reset('DuelHub');
            }}
          />
        </EmptyState>
      </Screen>
    );
  }

  const r = duel.round;
  if (!r || duel.phase === 'found' || duel.phase === 'searching' || duel.phase === 'connecting') {
    return (
      <Screen scroll={false}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text variant="h3">Get ready…</Text>
        </View>
      </Screen>
    );
  }

  const q = r.question;
  const reveal = duel.reveal?.index === r.index ? duel.reveal : null;
  const timeLeft = Math.max(0, Math.min(DUEL_SECONDS_PER_QUESTION, (r.deadline - now) / 1000));
  const them = duel.opponent?.name.split(' ')[0] ?? 'Opponent';

  const optionState = (key: string): OptionState => {
    if (reveal) {
      if (key === reveal.correctKey) return 'correct';
      if (key === r.myKey) return 'incorrect';
      return 'dimmed';
    }
    return r.myKey === key ? 'selected' : 'default';
  };

  const header = (
    <View style={styles.header}>
      <Row style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <PlayerScore
          name={app.state.profile.name || 'You'}
          score={duel.scores.you}
          pips={duel.pips.you}
          side="me"
          popKey={reveal ? r.index + 1 : 0}
          lastPoints={reveal?.you.points ?? 0}
          reaction={duel.reactions.filter((x) => x.from === 'you').at(-1)}
        />
        <View style={{ alignItems: 'center', gap: 2 }}>
          <Text variant="caption" color="textSecondary">
            ROUND
          </Text>
          <Text variant="h2">
            {r.index + 1}/{r.total}
          </Text>
        </View>
        <PlayerScore
          name={duel.opponent?.name ?? 'Opponent'}
          bot={duel.opponent?.bot}
          score={duel.scores.opponent}
          pips={duel.pips.opponent}
          side="them"
          popKey={reveal ? r.index + 1 : 0}
          lastPoints={reveal?.opponent.points ?? 0}
          reaction={duel.reactions.filter((x) => x.from === 'opponent').at(-1)}
        />
      </Row>
      <View style={{ marginTop: spacing.md }}>
        <RoundTimer secondsLeft={timeLeft} total={DUEL_SECONDS_PER_QUESTION} running={duel.phase === 'round'} roundKey={r.index} />
      </View>
    </View>
  );

  return (
    <Screen header={header}>
      <Stack gap={spacing.md} style={{ paddingTop: spacing.md }}>
        {duel.phase === 'paused' ? (
          <Banner tone="warning" title="Connection lost — reconnecting…" message="Your answers are saved. The round clock is paused for both players." icon="wifiOff" />
        ) : null}
        {duel.opponent?.bot ? <Banner tone="info" message="Practice duel against Passy Bot — you earn XP, but it doesn't count toward your W–L record." /> : null}

        <Row style={{ justifyContent: 'space-between' }}>
          <Tag label={`${Math.ceil(timeLeft)}s`} tone={timeLeft <= 5 ? 'danger' : 'neutral'} icon="clock" />
          {r.opponentAnswered || reveal ? (
            <Tag label={`${them} answered`} tone="info" icon="check" />
          ) : (
            <Row gap={spacing.xs}>
              <ActivityIndicator size="small" color={colors.textSecondary} />
              <Text variant="caption" color="textSecondary">
                {them} is thinking…
              </Text>
            </Row>
          )}
        </Row>

        <Text variant="bodyLg" style={{ fontWeight: '600' }}>
          {q.prompt}
        </Text>
        <Stack gap={spacing.sm}>
          {q.options.map((o) => (
            <OptionButton
              key={o.key}
              optionKey={o.key}
              text={o.text}
              state={optionState(o.key)}
              disabled={r.myKey !== null || duel.phase !== 'round'}
              onPress={() => submitAnswer(o.key)}
            />
          ))}
        </Stack>

        {reveal ? (
          <Row gap={spacing.sm} style={{ justifyContent: 'center' }}>
            <Tag label={reveal.you.points ? `+${reveal.you.points} you` : 'You +0'} tone={reveal.you.points ? 'success' : 'danger'} />
            <Tag label={`${them} +${reveal.opponent.points}`} tone={reveal.opponent.points ? 'success' : 'danger'} />
          </Row>
        ) : r.myKey ? (
          <Text variant="bodySm" color="textSecondary" align="center">
            Locked in{r.myMs !== null ? ` at ${(r.myMs / 1000).toFixed(1)}s` : ''} — waiting for {them}…
          </Text>
        ) : null}

        {duel.opponent && !duel.opponent.bot ? <ReactionBar readyAt={duel.reactionReadyAt} /> : null}

        <Button title="Forfeit duel" variant="ghost" size="md" onPress={() => setQuitOpen(true)} />
      </Stack>

      {duel.phase === 'paused' ? (
        <View style={styles.reconnect}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : null}

      <Dialog visible={quitOpen} onClose={() => setQuitOpen(false)}>
        <Text variant="h2">Forfeit this duel?</Text>
        <Text color="textSecondary">{them} will get the win and you won't earn duel XP.</Text>
        <Button title="Keep battling" onPress={() => setQuitOpen(false)} />
        <Button
          title="Forfeit"
          variant="ghost"
          onPress={() => {
            setQuitOpen(false);
            forfeit();
          }}
        />
      </Dialog>
    </Screen>
  );
}

function PlayerScore({
  name,
  score,
  pips,
  side,
  popKey,
  lastPoints,
  bot = false,
  reaction,
}: {
  name: string;
  score: number;
  pips: (boolean | null)[];
  side: 'me' | 'them';
  popKey: number;
  lastPoints: number;
  bot?: boolean;
  reaction?: { id: number; emoji: DuelReaction };
}) {
  return (
    <View style={{ alignItems: side === 'me' ? 'flex-start' : 'flex-end', gap: spacing.xs, width: 128 }}>
      <Row gap={spacing.sm} style={{ flexDirection: side === 'me' ? 'row' : 'row-reverse' }}>
        <View>
          <Avatar name={name} size={36} ring={side === 'me' ? colors.primary : colors.streak} />
          {reaction ? (
            <View key={reaction.id} style={[styles.bubble, side === 'me' ? { left: 12 } : { right: 12 }]} accessibilityLiveRegion="polite" accessibilityLabel={`${side === 'me' ? 'You' : name} reacted ${reaction.emoji}`}>
              <PopIn>
                <Text style={styles.bubbleEmoji}>{reaction.emoji}</Text>
              </PopIn>
            </View>
          ) : null}
        </View>
        <View style={{ alignItems: side === 'me' ? 'flex-start' : 'flex-end' }}>
          <Text variant="caption" color="textSecondary" numberOfLines={1}>
            {side === 'me' ? 'YOU' : bot ? 'PASSY BOT' : name.split(' ')[0]!.toUpperCase()}
          </Text>
          <View>
            <CountUp value={score} duration={600} render={(n) => <Text variant="h3">{n}</Text>} />
            <PointsPop points={lastPoints} popKey={popKey} />
          </View>
        </View>
      </Row>
      <Row gap={3} style={{ flexDirection: side === 'me' ? 'row' : 'row-reverse' }}>
        {Array.from({ length: DUEL_ROUNDS }, (_, i) => {
          const ok = pips[i] ?? null;
          return (
            <View key={i} style={[styles.pip, ok === true ? { backgroundColor: colors.success } : ok === false ? { backgroundColor: colors.danger } : null]}>
              {ok === true ? <Icon name="check" size={8} color="textOnPrimary" strokeWidth={4} /> : null}
            </View>
          );
        })}
      </Row>
    </View>
  );
}

/** Quick reactions (fixed emoji set; the server relays them to the opponent). */
function ReactionBar({ readyAt }: { readyAt: number }) {
  const [, tick] = useState(0);
  const cooling = Date.now() < readyAt;
  useEffect(() => {
    if (!cooling) return;
    const id = setTimeout(() => tick((n) => n + 1), readyAt - Date.now() + 20);
    return () => clearTimeout(id);
  }, [cooling, readyAt]);
  return (
    <Row gap={spacing.sm} style={{ justifyContent: 'center' }}>
      {DUEL_REACTIONS.map((e) => (
        <Pressable
          key={e}
          onPress={() => sendReaction(e)}
          disabled={cooling}
          accessibilityRole="button"
          accessibilityLabel={`React ${e}`}
          accessibilityHint={`Sends ${e} to your opponent. One every ${DUEL_REACTION_COOLDOWN_MS / 1000} seconds.`}
          style={({ pressed }) => [styles.reaction, { opacity: cooling ? 0.4 : 1 }, pressed ? { backgroundColor: colors.primarySoft } : null]}
        >
          <Text style={styles.reactionEmoji}>{e}</Text>
        </Pressable>
      ))}
    </Row>
  );
}

const styles = StyleSheet.create({
  reaction: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  reactionEmoji: { fontSize: 22, lineHeight: 28 },
  bubble: { position: 'absolute', top: -12, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  bubbleEmoji: { fontSize: 16, lineHeight: 20 },
  header: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, paddingBottom: spacing.sm, backgroundColor: colors.surface, borderBottomWidth: 2, borderBottomColor: colors.border },
  pip: { width: 12, height: 12, borderRadius: radii.pill, backgroundColor: colors.surfaceSunken, alignItems: 'center', justifyContent: 'center' },
  reconnect: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', backgroundColor: 'rgba(248,250,252,0.6)' /* colors.background at 60% */, alignItems: 'center', justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
});
