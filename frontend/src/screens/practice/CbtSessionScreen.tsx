import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  AppBar,
  Banner,
  Button,
  Dialog,
  Icon,
  IconButton,
  Mascot,
  OptionButton,
  ProgressBar,
  Row,
  Screen,
  Sheet,
  Skeleton,
  Stack,
  Tag,
  Text,
} from '../../components';
import { useNav } from '../../navigation/Navigator';
import type { Routes } from '../../navigation/routes';
import { CBT_QUESTION_COUNT, CBT_SECONDS, pickQuestions } from '../../practice/questions';
import type { CbtResult } from '../../practice/types';
import { useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';
import type { Question } from '../../types/question';

const WARN_AT = 5 * 60;
const DANGER_AT = 60;

export function formatClock(seconds: number): string {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/** Timer pill: neutral → amber at 5:00 → red at 1:00. */
export function TimerPill({ seconds }: { seconds: number }) {
  const tone = seconds <= DANGER_AT ? 'danger' : seconds <= WARN_AT ? 'warning' : 'neutral';
  const bg = tone === 'danger' ? colors.dangerSoft : tone === 'warning' ? colors.warningSoft : colors.surfaceSunken;
  const fg = tone === 'danger' ? 'dangerText' : tone === 'warning' ? 'warningText' : 'text';
  return (
    <View style={[styles.timer, { backgroundColor: bg }]} accessibilityLabel={`${formatClock(seconds)} remaining`} accessibilityLiveRegion="polite">
      <Icon name="clock" size={18} color={fg} />
      <Text variant="mono" color={fg}>
        {formatClock(seconds)}
      </Text>
    </View>
  );
}

/** Skeleton shown while the sprint is assembled from the local bank. */
export function QuestionSkeleton() {
  return (
    <Stack gap={spacing.md} style={{ paddingTop: spacing.lg }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Skeleton width="35%" height={16} />
        <Skeleton width={56} height={24} radius={radii.pill} />
      </Row>
      <Skeleton height={20} />
      <Skeleton width="80%" height={20} />
      <View style={{ height: spacing.md }} />
      {[0, 1, 2, 3].map((i) => (
        <Skeleton key={i} height={60} radius={radii.lg} />
      ))}
      <Row gap={spacing.sm} style={{ justifyContent: 'center', marginTop: spacing.md }}>
        <Mascot mood="think" size={56} />
        <Text variant="bodySm" color="textSecondary">
          Shuffling your questions…
        </Text>
      </Row>
    </Stack>
  );
}

export default function CbtSessionScreen({ params }: { params: Routes['CbtSession'] }) {
  const nav = useNav();
  const app = useApp();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flagged, setFlagged] = useState<string[]>([]);
  const [seconds, setSeconds] = useState(CBT_SECONDS);
  const [navigatorOpen, setNavigatorOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [timeUp, setTimeUp] = useState(false);
  const submitted = useRef(false);
  const sessionId = useRef<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Assemble the sprint from the on-device bank (works offline).
  useEffect(() => {
    const t = setTimeout(() => {
      const qs = pickQuestions(['JAMB'], params.subject, CBT_QUESTION_COUNT);
      setQuestions(qs);
      if (qs.length) {
        sessionId.current = app.startSession({ mode: 'cbt', subject: params.subject, examBody: 'JAMB', questionCount: qs.length, secondsAllowed: CBT_SECONDS });
      }
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- start one session per mount
  }, [params.subject]);

  useEffect(() => {
    if (!questions || timeUp) return;
    const id = setInterval(() => setSeconds((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [questions, timeUp]);

  useEffect(() => {
    if (seconds <= 0 && !timeUp) setTimeUp(true);
  }, [seconds, timeUp]);

  const q = questions?.[index];
  const answeredCount = Object.keys(answers).length;
  const unanswered = (questions?.length ?? 0) - answeredCount;

  const submit = useCallback(
    (timedOut: boolean) => {
      if (!questions || submitted.current || !sessionId.current) return;
      submitted.current = true;
      setSubmitting(true);
      const id = sessionId.current;
      const secondsUsed = CBT_SECONDS - Math.max(0, seconds);
      // CBT answers stay changeable until submit, so the final answers are recorded now.
      for (const item of questions) app.answer(id, item, answers[item.id] ?? null);
      void app.finishSession(id, { secondsUsed }).then((outcome) => {
        const result: CbtResult = {
          subject: params.subject,
          questions,
          answers,
          flagged,
          secondsUsed,
          secondsAllowed: CBT_SECONDS,
          xpEarned: outcome.xp,
          timedOut,
          synced: outcome.synced,
          newBadges: outcome.newBadges,
        };
        nav.replace('CbtResult', { result });
        const top = outcome.levelUps[outcome.levelUps.length - 1];
        if (top) nav.push('LevelUp', { level: top });
      });
    },
    [questions, answers, flagged, seconds, params.subject, app, nav],
  );

  const toggleFlag = () => {
    if (!q) return;
    setFlagged((f) => (f.includes(q.id) ? f.filter((x) => x !== q.id) : [...f, q.id]));
  };

  const header = (
    <View>
      <AppBar
        onBack={() => setConfirmLeave(true)}
        backIcon="x"
        title={undefined}
        right={
          questions ? (
            <Pressable onPress={() => setNavigatorOpen(true)} style={styles.navButton} accessibilityRole="button" accessibilityLabel="Open question navigator">
              <Icon name="grid" size={20} color="primary" />
              <Text variant="label" color="primary">
                {index + 1}/{questions.length}
              </Text>
            </Pressable>
          ) : null
        }
      />
      <View style={styles.timerRow}>{questions ? <TimerPill seconds={seconds} /> : <Skeleton width={96} height={36} radius={radii.pill} />}</View>
      <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.sm }}>
        <ProgressBar value={questions ? answeredCount / questions.length : 0} height={6} animated={false} />
      </View>
    </View>
  );

  const isLast = questions ? index === questions.length - 1 : false;

  return (
    <Screen
      header={header}
      footer={
        questions ? (
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button title="Previous" variant="secondary" icon="chevronLeft" disabled={index === 0} onPress={() => setIndex((i) => i - 1)} />
            </View>
            <View style={{ flex: 1 }}>
              {isLast ? (
                <Button title="Submit" onPress={() => setConfirmSubmit(true)} />
              ) : (
                <Button title="Next" iconRight="chevronRight" onPress={() => setIndex((i) => i + 1)} />
              )}
            </View>
          </Row>
        ) : undefined
      }
    >
      {!q ? (
        <QuestionSkeleton />
      ) : (
        <Stack gap={spacing.md} style={{ paddingTop: spacing.lg }}>
          {seconds <= WARN_AT && seconds > WARN_AT - 10 ? <Banner tone="warning" message="5 minutes left — check your flagged questions." /> : null}
          {!app.state.online ? <Banner tone="offline" message="Offline — your sprint and results are saved on this phone." /> : null}
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="label" color="textSecondary">
              Question {index + 1} of {questions!.length}
            </Text>
            <Row gap={spacing.xs}>
              <Tag label={`${q.examBody} ${q.year}`} />
              <Pressable onPress={toggleFlag} hitSlop={8} accessibilityRole="button" accessibilityLabel={flagged.includes(q.id) ? 'Unflag question' : 'Flag for review'}>
                <Tag label={flagged.includes(q.id) ? 'Flagged' : 'Flag'} tone={flagged.includes(q.id) ? 'flame' : 'neutral'} icon="flag" />
              </Pressable>
            </Row>
          </Row>
          <Text variant="bodyLg" style={{ fontWeight: '600' }}>
            {q.prompt}
          </Text>
          <Stack gap={spacing.sm} style={{ marginTop: spacing.sm }}>
            {q.options.map((o) => (
              <OptionButton
                key={o.key}
                optionKey={o.key}
                text={o.text}
                state={answers[q.id] === o.key ? 'selected' : 'default'}
                onPress={() => setAnswers((a) => ({ ...a, [q.id]: o.key }))}
              />
            ))}
          </Stack>
        </Stack>
      )}

      {/* Question navigator */}
      <Sheet visible={navigatorOpen} onClose={() => setNavigatorOpen(false)} title="Question navigator">
        <Row gap={spacing.md} style={{ flexWrap: 'wrap' }}>
          <Legend kind="answered" label={`Answered ${answeredCount}`} />
          <Legend kind="flagged" label={`Flagged ${flagged.length}`} />
          <Legend kind="empty" label={`Unanswered ${unanswered}`} />
        </Row>
        <View style={styles.grid}>
          {questions?.map((item, i) => (
            <NavCell
              key={item.id}
              n={i + 1}
              answered={Boolean(answers[item.id])}
              flagged={flagged.includes(item.id)}
              current={i === index}
              onPress={() => {
                setIndex(i);
                setNavigatorOpen(false);
              }}
            />
          ))}
        </View>
        <Button
          title="Submit sprint"
          onPress={() => {
            setNavigatorOpen(false);
            setConfirmSubmit(true);
          }}
        />
      </Sheet>

      <Dialog visible={confirmSubmit} onClose={() => setConfirmSubmit(false)}>
        <Text variant="h2">Submit your sprint?</Text>
        <Text color="textSecondary">
          {unanswered > 0 ? `${unanswered} unanswered` : 'All questions answered'}
          {flagged.length ? ` · ${flagged.length} flagged for review` : ''}. You still have {formatClock(seconds)} left.
        </Text>
        <Button title="Submit" loading={submitting} onPress={() => submit(false)} />
        <Button title="Keep going" variant="ghost" onPress={() => setConfirmSubmit(false)} />
      </Dialog>

      <Dialog visible={confirmLeave} onClose={() => setConfirmLeave(false)}>
        <Text variant="h2">Quit this sprint?</Text>
        <Text color="textSecondary">Your answers won't be scored and you won't earn XP for this attempt.</Text>
        <Button title="Keep practising" onPress={() => setConfirmLeave(false)} />
        <Button title="Quit" variant="ghost" onPress={nav.back} />
      </Dialog>

      <Dialog visible={timeUp}>
        <View style={{ alignItems: 'center' }}>
          <Mascot mood="wow" size={96} />
        </View>
        <Text variant="h2" align="center">
          Time's up!
        </Text>
        <Text color="textSecondary" align="center">
          Just like the real CBT, your answers were submitted automatically. You answered {answeredCount} of {questions?.length ?? 0}.
        </Text>
        <Button title="See my results" loading={submitting} onPress={() => submit(true)} />
      </Dialog>
    </Screen>
  );
}

function Legend({ kind, label }: { kind: 'answered' | 'flagged' | 'empty'; label: string }) {
  return (
    <Row gap={spacing.xs}>
      <View
        style={[
          styles.legendDot,
          kind === 'answered' ? { backgroundColor: colors.primary, borderColor: colors.primary } : null,
          kind === 'flagged' ? { borderColor: colors.streak, backgroundColor: colors.streakSoft } : null,
        ]}
      />
      <Text variant="caption" color="textSecondary">
        {label}
      </Text>
    </Row>
  );
}

function NavCell({ n, answered, flagged, current, onPress }: { n: number; answered: boolean; flagged: boolean; current: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Question ${n}${answered ? ', answered' : ''}${flagged ? ', flagged' : ''}`}
      style={[
        styles.cell,
        answered ? { backgroundColor: colors.primary, borderColor: colors.primary } : null,
        flagged && !answered ? { backgroundColor: colors.streakSoft, borderColor: colors.streak } : null,
        flagged && answered ? { borderColor: colors.streak } : null,
        current ? styles.cellCurrent : null,
      ]}
    >
      <Text variant="label" color={answered ? 'textOnPrimary' : 'text'}>
        {n}
      </Text>
      {flagged ? (
        <View style={styles.cellFlag}>
          <Icon name="flag" size={10} rawColor={colors.streak} filled strokeWidth={2} />
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  timer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs + 2,
    paddingHorizontal: spacing.md,
    height: 36,
    borderRadius: radii.pill,
  },
  timerRow: { position: 'absolute', top: 10, left: 0, right: 0, alignItems: 'center', pointerEvents: 'box-none' },
  navButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    height: 40,
    paddingHorizontal: spacing.sm + 2,
    marginRight: spacing.xs,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, justifyContent: 'flex-start' },
  cell: {
    width: 48,
    height: 48,
    borderRadius: radii.md,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
  },
  cellCurrent: { borderWidth: 3, borderColor: colors.text },
  cellFlag: { position: 'absolute', top: 2, right: 3 },
  legendDot: { width: 16, height: 16, borderRadius: 4, borderWidth: 2, borderColor: colors.borderStrong },
});
