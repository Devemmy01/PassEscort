import { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppBar,
  Banner,
  Button,
  Card,
  EmptyState,
  Icon,
  Mascot,
  OptionButton,
  ProgressBar,
  Row,
  Screen,
  SegmentedControl,
  Stack,
  Tag,
  Text,
  XpBurst,
  type OptionState,
} from '../../components';
import { formatNaira, PREMIUM_NAME, PRODUCTS } from '../../game/pricing';
import { useNav } from '../../navigation/Navigator';
import type { Routes } from '../../navigation/routes';
import { pickQuestions } from '../../practice/questions';
import { theoryFor, type TheoryPart, type TheoryQuestion } from '../../practice/theory';
import { useApp, type SessionOutcome } from '../../state/AppState';
import { api } from '../../api/client';
import type { TheorySolutionDTO } from '../../../../shared/api';
import { colors, radii, spacing } from '../../theme';
import type { Question } from '../../types/question';
import { QuestionSkeleton } from './CbtSessionScreen';

const OBJECTIVE_SET_SIZE = 10;

export default function WaecSessionScreen({ params }: { params: Routes['WaecSession'] }) {
  const nav = useNav();
  const [tab, setTab] = useState<'objective' | 'theory'>(params.tab ?? 'objective');
  return (
    <Screen
      scroll
      header={
        <View>
          <AppBar title={params.subject} subtitle={`${params.examBody} · ${tab === 'objective' ? 'Objective' : 'Theory'}`} onBack={nav.back} backIcon="x" />
          <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
            <SegmentedControl
              value={tab}
              onChange={setTab}
              options={[
                { value: 'objective', label: 'Objective' },
                { value: 'theory', label: 'Theory' },
              ]}
            />
          </View>
        </View>
      }
    >
      {tab === 'objective' ? <ObjectivePractice subject={params.subject} examBody={params.examBody} /> : <TheoryPractice subject={params.subject} examBody={params.examBody} />}
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Objective: answer → check → instant feedback                        */
/* ------------------------------------------------------------------ */

function ObjectivePractice({ subject, examBody }: { subject: string; examBody: 'WAEC' | 'NECO' }) {
  const nav = useNav();
  const app = useApp();
  const [questions, setQuestions] = useState<Question[] | null>(null);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [combo, setCombo] = useState(0);
  const [score, setScore] = useState({ correct: 0, xp: 0 });
  const [burst, setBurst] = useState({ key: 0, amount: 0 });
  const [done, setDone] = useState(false);
  const [outcome, setOutcome] = useState<SessionOutcome | null>(null);
  const sessionId = useRef<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      const qs = pickQuestions([examBody], subject, OBJECTIVE_SET_SIZE);
      setQuestions(qs);
      if (qs.length) sessionId.current = app.startSession({ mode: 'objective', subject, examBody, questionCount: qs.length });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one session per mount
  }, [examBody, subject]);

  if (!questions) return <QuestionSkeleton />;
  if (questions.length === 0) {
    return (
      <EmptyState mood="think" title={`No ${examBody} ${subject} questions yet`} message="We're still digitising this subject. Try another one for now.">
        <Button title="Pick another subject" variant="secondary" onPress={nav.back} />
      </EmptyState>
    );
  }

  if (done) {
    const pct = Math.round((score.correct / questions.length) * 100);
    return (
      <Stack gap={spacing.lg} style={{ alignItems: 'center', paddingTop: spacing.xl }}>
        <Mascot mood={pct >= 60 ? 'cheer' : 'happy'} size={140} />
        <Text variant="h1" align="center">
          {score.correct} of {questions.length} correct
        </Text>
        <Row gap={spacing.xs}>
          <Icon name="bolt" rawColor={colors.xp} filled strokeWidth={1.5} />
          <Text variant="h3">{outcome ? `+${outcome.xp} XP` : 'Saving your XP…'}</Text>
        </Row>
        {outcome && !outcome.synced ? (
          <Banner tone="offline" title="Saved on your phone" message="XP and your streak update as soon as you're back online." />
        ) : null}
        <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
          <Button
            title="Finish"
            loading={!outcome}
            onPress={() => {
              nav.back();
              const top = outcome?.levelUps[outcome.levelUps.length - 1];
              if (top) nav.push('LevelUp', { level: top });
            }}
          />
          <Button title="Share my score" variant="secondary" icon="share" onPress={() => nav.push('ShareCard', { card: { kind: 'score', percent: pct, examBody, subject } })} />
        </View>
      </Stack>
    );
  }

  const q = questions[index];
  const isCorrect = selected === q.answerKey;
  const optionState = (key: string): OptionState => {
    if (!checked) return selected === key ? 'selected' : 'default';
    if (key === q.answerKey) return 'correct';
    if (key === selected) return 'incorrect';
    return 'dimmed';
  };

  const check = () => {
    if (!selected || !sessionId.current) return;
    // Provisional XP for the burst; the server re-marks and decides (PRD §6).
    const { correct, xp } = app.answer(sessionId.current, q, selected);
    setChecked(true);
    setCombo(correct ? combo + 1 : 0);
    setScore((s) => ({ correct: s.correct + (correct ? 1 : 0), xp: s.xp + xp }));
    if (xp > 0) setBurst((b) => ({ key: b.key + 1, amount: xp }));
  };

  const next = () => {
    if (index === questions.length - 1) {
      setDone(true);
      if (sessionId.current) void app.finishSession(sessionId.current).then(setOutcome);
      return;
    }
    setIndex((i) => i + 1);
    setSelected(null);
    setChecked(false);
  };

  return (
    <Stack gap={spacing.md} style={{ paddingTop: spacing.sm }}>
      {!app.state.online ? <Banner tone="offline" message="Offline — practice works; AI Explain is paused until you reconnect." /> : null}
      <Row gap={spacing.md}>
        <View style={{ flex: 1 }}>
          <ProgressBar value={(index + (checked ? 1 : 0)) / questions.length} height={10} />
        </View>
        {combo >= 2 ? <Tag label={`${combo} in a row`} tone="flame" icon="flame" /> : null}
      </Row>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="label" color="textSecondary">
          {index + 1} of {questions.length}
        </Text>
        <Row gap={spacing.xs}>
          <Tag label={`${q.examBody} ${q.year}`} />
          <Tag label={q.difficulty} tone={q.difficulty === 'hard' ? 'danger' : q.difficulty === 'medium' ? 'warning' : 'success'} />
        </Row>
      </Row>
      <Text variant="bodyLg" style={{ fontWeight: '600' }}>
        {q.prompt}
      </Text>
      <Stack gap={spacing.sm}>
        {q.options.map((o) => (
          <OptionButton key={o.key} optionKey={o.key} text={o.text} state={optionState(o.key)} disabled={checked} onPress={() => setSelected(o.key)} />
        ))}
      </Stack>

      <View style={{ height: 40 }}>
        <XpBurst amount={burst.amount} burstKey={burst.key} />
      </View>

      {checked ? (
        <Card tone={isCorrect ? 'success' : 'danger'}>
          <Stack gap={spacing.sm}>
            <Row gap={spacing.sm}>
              <Icon name={isCorrect ? 'check' : 'x'} color={isCorrect ? 'successText' : 'dangerText'} strokeWidth={3} />
              <Text variant="h3" color={isCorrect ? 'successText' : 'dangerText'}>
                {isCorrect ? (combo >= 5 ? 'Unstoppable!' : 'Correct!') : `Answer: ${q.answerKey}`}
              </Text>
            </Row>
            {q.explanation ? (
              <Text variant="bodySm" color="text">
                {q.explanation}
              </Text>
            ) : null}
            <Button
              title={app.state.online ? 'Step-by-step with AI' : 'AI Explain needs internet'}
              variant="secondary"
              size="md"
              icon="sparkles"
              disabled={!app.state.online}
              onPress={() => nav.push('AiExplain', { questionId: q.id })}
            />
            <Button title={index === questions.length - 1 ? 'See summary' : 'Next question'} iconRight="arrowRight" onPress={next} />
          </Stack>
        </Card>
      ) : (
        <Button title="Check answer" disabled={!selected} onPress={check} />
      )}
    </Stack>
  );
}

/* ------------------------------------------------------------------ */
/* Theory: stem + parts, progressive step-by-step breakdown           */
/* ------------------------------------------------------------------ */

function TheoryPractice({ subject, examBody }: { subject: string; examBody: 'WAEC' | 'NECO' }) {
  const items = theoryFor(examBody, subject);
  const [i, setI] = useState(0);
  const q = items[i];
  if (!q) {
    return <EmptyState mood="sleep" title="No theory questions yet" message="Theory for this subject is coming in the next content drop." />;
  }
  return (
    <Stack gap={spacing.lg} style={{ paddingTop: spacing.sm }}>
      <TheoryQuestionView key={q.id} q={q} />
      {items.length > 1 ? (
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}>
            <Button title="Previous" variant="secondary" size="md" disabled={i === 0} onPress={() => setI(i - 1)} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Next question" size="md" disabled={i === items.length - 1} onPress={() => setI(i + 1)} />
          </View>
        </Row>
      ) : null}
    </Stack>
  );
}

/** Paid students load the full worked solution from the server (it isn't bundled — PRD §5.8). */
function useFullSolution(q: TheoryQuestion): { parts: TheoryPart[]; loading: boolean; failed: boolean } {
  const { hasPremium, mode, state } = useApp();
  const [full, setFull] = useState<TheorySolutionDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!hasPremium || mode !== 'live' || full) return;
    setLoading(true);
    setFailed(false);
    api<TheorySolutionDTO>('GET', `/questions/theory/${encodeURIComponent(q.id)}/solution`)
      .then(setFull)
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [hasPremium, mode, q.id, full, state.online]);
  const parts = full
    ? q.parts.map((p) => {
        const f = full.parts.find((x) => x.label === p.label);
        return f ? { ...p, steps: f.steps, stepCount: f.steps.length, answer: f.answer } : p;
      })
    : q.parts;
  return { parts, loading, failed };
}

function TheoryQuestionView({ q }: { q: TheoryQuestion }) {
  const totalMarks = q.parts.reduce((a, p) => a + p.marks, 0);
  const { parts, loading, failed } = useFullSolution(q);
  return (
    <Stack gap={spacing.md}>
      <Row gap={spacing.xs}>
        <Tag label={`${q.examBody} ${q.year}`} />
        <Tag label={q.topic} tone="primary" />
        <Tag label={`${totalMarks} marks`} tone="warning" />
      </Row>
      <Text variant="bodyLg" style={{ fontWeight: '600' }}>
        {q.stem}
      </Text>
      {failed ? <Banner tone="offline" message="Couldn't load the full solution. Connect to the internet to see every step." /> : null}
      {parts.map((p) => (
        <TheoryPartView key={p.label} part={p} loading={loading} />
      ))}
    </Stack>
  );
}

function TheoryPartView({ part, loading }: { part: TheoryPart; loading: boolean }) {
  const nav = useNav();
  const [revealed, setRevealed] = useState(0);
  const available = part.steps.length;
  const allShown = revealed >= part.stepCount && part.answer !== undefined;
  // Locked when the student has seen every step we have but the full solution isn't loaded.
  const gated = revealed >= available && !allShown && !loading;

  return (
    <Card padding="md">
      <Stack gap={spacing.md}>
        <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
          <Text variant="h3">{part.label}</Text>
          <Text variant="body" style={{ flex: 1 }}>
            {part.prompt}
          </Text>
          <Tag label={`${part.marks}m`} tone="warning" />
        </Row>

        {part.steps.slice(0, revealed).map((s, idx) => (
          <View key={s.title} style={styles.step}>
            <View style={styles.stepRail}>
              <View style={styles.stepDot}>
                <Text variant="caption" color="textOnPrimary">
                  {idx + 1}
                </Text>
              </View>
              {idx < revealed - 1 ? <View style={styles.stepLine} /> : null}
            </View>
            <View style={{ flex: 1, gap: spacing.xs, paddingBottom: spacing.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Text variant="label">{s.title}</Text>
                {s.marks ? <Text variant="caption" color="warningText">+{s.marks} mark{s.marks > 1 ? 's' : ''}</Text> : null}
              </Row>
              <Text variant="bodySm" color="textSecondary">
                {s.body}
              </Text>
              {s.working ? (
                <View style={styles.working}>
                  <Text variant="mono" style={{ fontWeight: '600' }}>
                    {s.working}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        ))}

        {allShown ? (
          <View style={styles.answer}>
            <Text variant="overline" color="successText">
              FINAL ANSWER
            </Text>
            <Text variant="bodyStrong">{part.answer}</Text>
          </View>
        ) : gated ? (
          <Card tone="gold" padding="md">
            <Stack gap={spacing.sm}>
              <Row gap={spacing.sm}>
                <Icon name="lock" color="warningText" />
                <Text variant="label" style={{ flex: 1 }}>
                  {part.stepCount - revealed} more step{part.stepCount - revealed === 1 ? '' : 's'} + the marking-scheme answer
                </Text>
              </Row>
              <Text variant="bodySm">
                Full worked solutions come with {PREMIUM_NAME} — a Day Pass ({formatNaira(PRODUCTS.day.priceNaira)}) or Monthly.
              </Text>
              <Button title="Unlock full solutions" variant="gold" size="md" onPress={() => nav.push('Plans', { reason: 'solutions' })} />
            </Stack>
          </Card>
        ) : (
          <Button
            title={revealed === 0 ? 'Show step-by-step' : 'Next step'}
            variant={revealed === 0 ? 'primary' : 'secondary'}
            size="md"
            icon={revealed === 0 ? 'list' : 'chevronDown'}
            loading={loading && revealed >= available}
            onPress={() => setRevealed((r) => Math.min(r + 1, available))}
          />
        )}
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  step: { flexDirection: 'row', gap: spacing.md },
  stepRail: { alignItems: 'center', width: 24 },
  stepDot: { width: 24, height: 24, borderRadius: 12, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  stepLine: { flex: 1, width: 2, backgroundColor: colors.primarySoftBorder, marginTop: 2 },
  working: { backgroundColor: colors.surfaceSunken, borderRadius: radii.sm, padding: spacing.md, borderLeftWidth: 4, borderLeftColor: colors.primary },
  answer: { backgroundColor: colors.successSoft, borderRadius: radii.md, padding: spacing.md, gap: 2 },
});
