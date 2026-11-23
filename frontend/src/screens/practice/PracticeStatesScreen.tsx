import { View } from 'react-native';
import { AppBar, Banner, Button, EmptyState, OptionButton, ProgressBar, Row, Screen, SegmentedControl, Stack, Tag, Text } from '../../components';
import { useNav } from '../../navigation/Navigator';
import type { Routes } from '../../navigation/routes';
import { pickQuestions } from '../../practice/questions';
import { spacing } from '../../theme';
import { QuestionSkeleton, TimerPill } from './CbtSessionScreen';

/**
 * Frozen renders of the non-happy-path states for both practice modes, so
 * engineering can inspect each one without having to reproduce it.
 */
export default function PracticeStatesScreen({ params }: { params: Routes['PracticeStates'] }) {
  const nav = useNav();
  const cbt = params.mode === 'cbt';
  const subject = params.state === 'offline-missing' ? 'Biology' : 'Physics';

  const header = cbt ? (
    <View>
      <AppBar onBack={nav.back} backIcon="x" title={`${subject} sprint`} subtitle="JAMB CBT" />
      {params.state === 'loading' || params.state === 'offline' ? (
        <View style={{ alignItems: 'center', paddingBottom: spacing.sm }}>
          <TimerPill seconds={30 * 60} />
        </View>
      ) : null}
    </View>
  ) : (
    <View>
      <AppBar onBack={nav.back} backIcon="x" title={subject} subtitle="WAEC · Objective" />
      <View style={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
        <SegmentedControl value="objective" onChange={() => undefined} options={[{ value: 'objective', label: 'Objective' }, { value: 'theory', label: 'Theory' }]} />
      </View>
    </View>
  );

  return (
    <Screen header={header}>
      {params.state === 'loading' ? <QuestionSkeleton /> : null}

      {params.state === 'empty' ? (
        <EmptyState mood="think" title="No questions match these filters" message="There are no 2011 Physics questions on Optics yet. Try widening the year range or topic.">
          <Button title="Clear filters" onPress={nav.back} />
          <Button title="Pick another topic" variant="ghost" onPress={nav.back} />
        </EmptyState>
      ) : null}

      {params.state === 'offline-missing' ? (
        <EmptyState mood="sleep" title={`${subject} isn't downloaded yet`} message="Connect to Wi-Fi or data once to download this subject (2.4 MB). After that it works offline forever.">
          <Button title="Download when online" icon="download" disabled />
          <Tag label="Waiting for connection" tone="neutral" icon="wifiOff" center />
          <Button title="Practise Physics instead (downloaded)" variant="secondary" onPress={() => (cbt ? nav.replace('CbtIntro', { subject: 'Physics' }) : nav.replace('WaecSession', { subject: 'Physics', examBody: 'WAEC' }))} />
        </EmptyState>
      ) : null}

      {params.state === 'error' ? (
        <EmptyState mood="sad" title="We couldn't load your questions" message="Something went wrong reading the question bank on this phone. Your progress is safe.">
          <Button title="Try again" icon="refresh" onPress={nav.back} />
          <Button title="Report a problem" variant="ghost" onPress={nav.back} />
        </EmptyState>
      ) : null}

      {params.state === 'offline' ? <OfflinePreview cbt={cbt} /> : null}
    </Screen>
  );
}

function OfflinePreview({ cbt }: { cbt: boolean }) {
  const q = pickQuestions([cbt ? 'JAMB' : 'WAEC'], 'Physics', 1, 3)[0];
  if (!q) return null;
  return (
    <Stack gap={spacing.md} style={{ paddingTop: spacing.md }}>
      <Banner tone="offline" title="You're offline" message="Practice works fully offline. XP and streaks sync automatically when you reconnect." />
      <ProgressBar value={0.3} height={cbt ? 6 : 10} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Text variant="label" color="textSecondary">
          {cbt ? 'Question 12 of 40' : '3 of 10'}
        </Text>
        <Row gap={spacing.xs}>
          <Tag label={`${q.examBody} ${q.year}`} />
          <Tag label="Saved on phone" tone="info" icon="download" />
        </Row>
      </Row>
      <Text variant="bodyLg" style={{ fontWeight: '600' }}>
        {q.prompt}
      </Text>
      <Stack gap={spacing.sm}>
        {q.options.map((o, i) => (
          <OptionButton key={o.key} optionKey={o.key} text={o.text} state={cbt ? (i === 1 ? 'selected' : 'default') : o.key === q.answerKey ? 'correct' : 'dimmed'} />
        ))}
      </Stack>
      {!cbt ? (
        <Stack gap={spacing.sm}>
          <Button title="AI Explain needs internet" icon="wifiOff" variant="secondary" disabled />
          <Text variant="bodySm" color="textSecondary" align="center">
            We'll keep this question in “Explain later” for when you're back online.
          </Text>
        </Stack>
      ) : null}
    </Stack>
  );
}
