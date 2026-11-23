import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppBar, Banner, Button, Card, Chip, Icon, Mascot, PopIn, ProgressBar, Row, Screen, SectionHeader, Stack, Tag, Text } from '../../components';
import { useNav } from '../../navigation/Navigator';
import type { Routes } from '../../navigation/routes';
import { useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';
import { formatClock } from './CbtSessionScreen';

type Filter = 'all' | 'wrong' | 'skipped' | 'flagged';

export default function CbtResultScreen({ params }: { params: Routes['CbtResult'] }) {
  const nav = useNav();
  const { state } = useApp();
  const { result } = params;
  const [filter, setFilter] = useState<Filter>('wrong');
  const [open, setOpen] = useState<string | null>(null);

  const total = result.questions.length;
  const correct = result.questions.filter((q) => result.answers[q.id] === q.answerKey).length;
  const skipped = result.questions.filter((q) => !result.answers[q.id]).length;
  const pct = total ? Math.round((correct / total) * 100) : 0;
  const mood = pct >= 70 ? 'cheer' : pct >= 50 ? 'happy' : 'think';
  const headline = pct >= 70 ? 'Excellent work!' : pct >= 50 ? 'Solid effort!' : 'Every sprint makes you sharper';

  const topics = useMemo(() => {
    const map = new Map<string, { correct: number; total: number }>();
    for (const q of result.questions) {
      const t = map.get(q.topic) ?? { correct: 0, total: 0 };
      t.total += 1;
      if (result.answers[q.id] === q.answerKey) t.correct += 1;
      map.set(q.topic, t);
    }
    return [...map.entries()].sort((a, b) => a[1].correct / a[1].total - b[1].correct / b[1].total);
  }, [result]);

  const reviewItems = result.questions.filter((q) => {
    const a = result.answers[q.id];
    if (filter === 'wrong') return a && a !== q.answerKey;
    if (filter === 'skipped') return !a;
    if (filter === 'flagged') return result.flagged.includes(q.id);
    return true;
  });

  return (
    <Screen
      header={<AppBar title="Sprint results" subtitle={`${result.subject} · JAMB CBT`} onBack={nav.back} backIcon="x" />}
      footer={
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}>
            <Button
              title="Share"
              variant="secondary"
              icon="share"
              onPress={() => nav.push('ShareCard', { card: { kind: 'score', percent: pct, examBody: 'JAMB', subject: result.subject } })}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Go again" icon="refresh" onPress={() => nav.replace('CbtIntro', { subject: result.subject })} />
          </View>
        </Row>
      }
    >
      <Stack gap={spacing.lg}>
        {result.synced === false ? (
          <Banner tone="offline" title="Saved on your phone" message="Your answers are safe. XP and your streak update as soon as you're back online." />
        ) : null}
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <PopIn>
            <Mascot mood={mood} size={128} />
          </PopIn>
          <Text variant="h2" align="center">
            {headline}
          </Text>
          {result.timedOut ? <Tag label="Auto-submitted at time-up" tone="warning" icon="clock" center /> : null}
        </View>

        <Card>
          <Row style={{ justifyContent: 'space-around' }}>
            <View style={styles.stat}>
              <Text variant="display">
                {correct}
                <Text variant="h2" color="textSecondary">
                  /{total}
                </Text>
              </Text>
              <Text variant="caption" color="textSecondary">
                SCORE · {pct}%
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Row gap={4}>
                <Icon name="bolt" rawColor={colors.xp} filled strokeWidth={1.5} />
                <Text variant="h1">+{result.xpEarned}</Text>
              </Row>
              <Text variant="caption" color="textSecondary">
                XP EARNED
              </Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.stat}>
              <Text variant="h1">{formatClock(result.secondsUsed)}</Text>
              <Text variant="caption" color="textSecondary">
                OF {formatClock(result.secondsAllowed)}
              </Text>
            </View>
          </Row>
        </Card>

        <SectionHeader title="By topic" />
        <Card>
          <Stack gap={spacing.md}>
            {topics.map(([topic, t], i) => {
              const ratio = t.correct / t.total;
              return (
                <View key={topic} style={{ gap: spacing.xs }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row gap={spacing.xs} style={{ flex: 1 }}>
                      <Text variant="label" numberOfLines={1} style={{ flexShrink: 1 }}>
                        {topic}
                      </Text>
                      {i === 0 && ratio < 0.7 ? <Tag label="Focus next" tone="danger" /> : null}
                    </Row>
                    <Text variant="label" color="textSecondary">
                      {t.correct}/{t.total}
                    </Text>
                  </Row>
                  <ProgressBar value={ratio} height={8} color={ratio >= 0.7 ? colors.success : ratio >= 0.4 ? colors.gold : colors.danger} />
                </View>
              );
            })}
          </Stack>
        </Card>

        <SectionHeader title="Review answers" />
        <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
          <Chip label={`Wrong ${total - correct - skipped}`} selected={filter === 'wrong'} onPress={() => setFilter('wrong')} />
          <Chip label={`Skipped ${skipped}`} selected={filter === 'skipped'} onPress={() => setFilter('skipped')} />
          <Chip label={`Flagged ${result.flagged.length}`} selected={filter === 'flagged'} onPress={() => setFilter('flagged')} />
          <Chip label="All" selected={filter === 'all'} onPress={() => setFilter('all')} />
        </Row>

        {reviewItems.length === 0 ? (
          <Card tone="success">
            <Row gap={spacing.md}>
              <Icon name="check" color="successText" strokeWidth={3} />
              <Text variant="body" color="successText" style={{ flex: 1 }}>
                Nothing here — nice!
              </Text>
            </Row>
          </Card>
        ) : null}

        {reviewItems.map((q) => {
          const n = result.questions.indexOf(q) + 1;
          const mine = result.answers[q.id];
          const right = mine === q.answerKey;
          const expanded = open === q.id;
          const correctText = q.options.find((o) => o.key === q.answerKey)?.text;
          const mineText = q.options.find((o) => o.key === mine)?.text;
          return (
            <Card key={q.id} padding="md">
              <Pressable onPress={() => setOpen(expanded ? null : q.id)} accessibilityRole="button" aria-expanded={expanded}>
                <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
                  <View style={[styles.qNum, { backgroundColor: right ? colors.successSoft : !mine ? colors.surfaceSunken : colors.dangerSoft }]}>
                    <Text variant="label" color={right ? 'successText' : !mine ? 'textSecondary' : 'dangerText'}>
                      {n}
                    </Text>
                  </View>
                  <Text variant="body" style={{ flex: 1 }} numberOfLines={expanded ? undefined : 2}>
                    {q.prompt}
                  </Text>
                  <Icon name={expanded ? 'chevronUp' : 'chevronDown'} color="textMuted" />
                </Row>
              </Pressable>
              {expanded ? (
                <Stack gap={spacing.sm} style={{ marginTop: spacing.md }}>
                  {mine && !right ? (
                    <Row gap={spacing.sm}>
                      <Icon name="x" size={18} color="dangerText" strokeWidth={3} />
                      <Text variant="bodySm" color="dangerText" style={{ flex: 1 }}>
                        You chose {mine}: {mineText}
                      </Text>
                    </Row>
                  ) : null}
                  <Row gap={spacing.sm}>
                    <Icon name="check" size={18} color="successText" strokeWidth={3} />
                    <Text variant="bodySm" color="successText" style={{ flex: 1 }}>
                      Correct: {q.answerKey}. {correctText}
                    </Text>
                  </Row>
                  {q.explanation ? (
                    <Text variant="bodySm" color="textSecondary">
                      {q.explanation}
                    </Text>
                  ) : null}
                  <Button
                    title={state.online ? 'AI Explain step by step' : 'AI Explain needs internet'}
                    variant="secondary"
                    size="md"
                    icon="sparkles"
                    disabled={!state.online}
                    onPress={() => nav.push('AiExplain', { questionId: q.id })}
                  />
                </Stack>
              ) : null}
            </Card>
          );
        })}
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stat: { alignItems: 'center', flex: 1 },
  divider: { width: 2, alignSelf: 'stretch', backgroundColor: colors.border },
  qNum: { width: 32, height: 32, borderRadius: radii.sm, alignItems: 'center', justifyContent: 'center' },
});
