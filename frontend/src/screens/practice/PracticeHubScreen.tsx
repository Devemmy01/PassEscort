import { useState } from 'react';
import { View } from 'react-native';
import { AppBar, Banner, Button, Card, Chip, Icon, Row, Screen, SegmentedControl, Stack, SubjectIcon, TabBar, Tag, Text } from '../../components';
import { useNav } from '../../navigation/Navigator';
import type { Routes } from '../../navigation/routes';
import { CBT_QUESTION_COUNT, CBT_SECONDS, CORE_SUBJECTS, countQuestions } from '../../practice/questions';
import { useApp } from '../../state/AppState';
import { spacing } from '../../theme';

type Mode = 'cbt' | 'waec';

export default function PracticeHubScreen() {
  const nav = useNav();
  const { state } = useApp();
  const { profile, online } = state;
  const [mode, setMode] = useState<Mode>(profile.exams.length && !profile.exams.includes('JAMB') ? 'waec' : 'cbt');
  const [body, setBody] = useState<'WAEC' | 'NECO'>(profile.exams.includes('NECO') && !profile.exams.includes('WAEC') ? 'NECO' : 'WAEC');
  const subjects = profile.subjects.length ? profile.subjects : [...CORE_SUBJECTS];

  return (
    <Screen header={<AppBar title="Practice" />} footer={<TabBar active="practice" onChange={nav.goTab} />}>
      <Stack gap={spacing.lg}>
        <SegmentedControl
          value={mode}
          onChange={setMode}
          options={[
            { value: 'cbt', label: 'JAMB CBT' },
            { value: 'waec', label: 'WAEC / NECO' },
          ]}
        />
        {!online ? <Banner tone="offline" title="Offline mode" message="All downloaded subjects work without data." /> : null}

        {mode === 'cbt' ? (
          <Card tone="soft">
            <Row gap={spacing.md}>
              <Icon name="clock" color="primary" />
              <Text variant="bodySm" style={{ flex: 1 }}>
                Timed {CBT_QUESTION_COUNT}-question sprints in {CBT_SECONDS / 60} minutes — just like the real CBT centre. Answers are revealed at the end.
              </Text>
            </Row>
          </Card>
        ) : (
          <Stack gap={spacing.sm}>
            <Row>
              <Chip label="WAEC" selected={body === 'WAEC'} onPress={() => setBody('WAEC')} />
              <Chip label="NECO" selected={body === 'NECO'} onPress={() => setBody('NECO')} />
            </Row>
            <Text variant="bodySm" color="textSecondary">
              Objective questions with instant feedback, plus theory questions broken down step by step.
            </Text>
          </Stack>
        )}

        {subjects.map((s) => {
          const count = countQuestions([mode === 'cbt' ? 'JAMB' : body], s);
          return (
            <Card
              key={s}
              onPress={() => (mode === 'cbt' ? nav.push('CbtIntro', { subject: s }) : nav.push('WaecSession', { subject: s, examBody: body }))}
              accessibilityLabel={`Practise ${s}`}
            >
              <Row gap={spacing.md}>
                <SubjectIcon subject={s} size={48} />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Text variant="h3">{s}</Text>
                  <Row gap={spacing.xs}>
                    <Tag label={`${count} questions`} />
                    <Tag label="Offline ready" tone="info" icon="download" />
                  </Row>
                </View>
                <Icon name="chevronRight" color="textMuted" />
              </Row>
            </Card>
          );
        })}
        <Button title="Browse full question bank" variant="secondary" icon="search" onPress={() => nav.push('QuestionBank')} />
      </Stack>
    </Screen>
  );
}

export function CbtIntroScreen({ params }: { params: Routes['CbtIntro'] }) {
  const nav = useNav();
  const available = countQuestions(['JAMB'], params.subject);
  const count = Math.min(available, CBT_QUESTION_COUNT);
  const rules: [Parameters<typeof Icon>[0]['name'], string][] = [
    ['list', `${count} questions${available < CBT_QUESTION_COUNT ? ` (all ${available} available offline)` : ''}`],
    ['clock', `${CBT_SECONDS / 60} minutes — auto-submits when time runs out`],
    ['flag', 'Flag tricky questions and jump around with the navigator'],
    ['eye', 'No instant feedback — answers and explanations come at the end'],
    ['bolt', '+10 XP per correct answer, +25 XP for finishing'],
  ];
  return (
    <Screen
      header={<AppBar title={`${params.subject} sprint`} subtitle="JAMB UTME · CBT mode" onBack={nav.back} />}
      footer={<Button title="Start sprint" icon="play" onPress={() => nav.replace('CbtSession', { subject: params.subject })} />}
    >
      <Stack gap={spacing.lg} style={{ paddingTop: spacing.md }}>
        <Text variant="h1">Ready for the real thing?</Text>
        <Card>
          <Stack gap={spacing.md}>
            {rules.map(([icon, text]) => (
              <Row key={text} gap={spacing.md} style={{ alignItems: 'flex-start' }}>
                <Icon name={icon} color="primary" />
                <Text variant="body" style={{ flex: 1 }}>
                  {text}
                </Text>
              </Row>
            ))}
          </Stack>
        </Card>
        <Banner tone="info" message="Tip: find a quiet spot. Leaving the app pauses nothing — the clock keeps running, like the exam hall." />
      </Stack>
    </Screen>
  );
}
