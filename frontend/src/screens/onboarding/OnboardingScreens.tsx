import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppBar, Banner, Button, Card, Chip, Icon, Mascot, PopIn, Row, Screen, Stack, StepProgress, Tag, Text } from '../../components';
import { useNav } from '../../navigation/Navigator';
import { allSubjects, CORE_SUBJECTS } from '../../practice/questions';
import { subjectMeta } from '../../practice/subjects';
import { dailyGoalQuestions, NEW_PROFILE, useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';
import type { ExamBody } from '../../types/question';

function StepHeader({ step, onBack }: { step: number; onBack: () => void }) {
  return (
    <View style={styles.stepHeader}>
      <AppBar onBack={onBack} right={<Text variant="label" color="textSecondary" style={{ paddingRight: spacing.md }}>{step} of 4</Text>} />
      <View style={{ paddingHorizontal: spacing.lg }}>
        <StepProgress step={step} total={4} />
      </View>
    </View>
  );
}

function PassySays({ text }: { text: string }) {
  return (
    <Row gap={spacing.sm} style={{ alignItems: 'flex-end' }}>
      <Mascot mood="happy" size={72} />
      <View style={styles.bubble}>
        <Text variant="bodyStrong">{text}</Text>
      </View>
    </Row>
  );
}

const EXAMS: { id: ExamBody; title: string; detail: string }[] = [
  { id: 'JAMB', title: 'JAMB UTME', detail: 'Computer-based · 4 subjects · 180 questions' },
  { id: 'WAEC', title: 'WAEC WASSCE', detail: 'Objective + theory · up to 9 subjects' },
  { id: 'NECO', title: 'NECO SSCE', detail: 'Objective + theory · up to 9 subjects' },
];

export function OnboardExamScreen() {
  const nav = useNav();
  const { state, updateProfile } = useApp();
  const [exams, setExams] = useState<ExamBody[]>(state.profile.exams);
  const toggle = (id: ExamBody) => setExams((e) => (e.includes(id) ? e.filter((x) => x !== id) : [...e, id]));

  return (
    <Screen
      header={<StepHeader step={1} onBack={nav.back} />}
      footer={
        <Button
          title="Continue"
          iconRight="arrowRight"
          disabled={exams.length === 0}
          onPress={() => {
            updateProfile({ exams });
            nav.push('OnboardSubjects');
          }}
        />
      }
    >
      <Stack gap={spacing.lg} style={{ paddingTop: spacing.md }}>
        <PassySays text="Which exam are you preparing for?" />
        <Text variant="body" color="textSecondary">
          Pick all that apply — most students write JAMB and WAEC in the same year.
        </Text>
        {EXAMS.map((e) => {
          const selected = exams.includes(e.id);
          return (
            <Card key={e.id} selected={selected} onPress={() => toggle(e.id)} accessibilityLabel={e.title}>
              <Row gap={spacing.md}>
                <View style={[styles.examBadge, selected ? { backgroundColor: colors.primary } : null]}>
                  <Text variant="label" color={selected ? 'textOnPrimary' : 'primary'}>
                    {e.id}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="h3">{e.title}</Text>
                  <Text variant="bodySm" color="textSecondary">
                    {e.detail}
                  </Text>
                </View>
                <View style={[styles.check, selected ? styles.checkOn : null]}>
                  {selected ? <Icon name="check" size={16} color="textOnPrimary" strokeWidth={3} /> : null}
                </View>
              </Row>
            </Card>
          );
        })}
      </Stack>
    </Screen>
  );
}

const JAMB_SUBJECT_COUNT = 4;

export function OnboardSubjectsScreen() {
  const nav = useNav();
  const { state, updateProfile } = useApp();
  const jamb = state.profile.exams.includes('JAMB') || state.profile.exams.length === 0;
  const [subjects, setSubjects] = useState<string[]>(
    state.profile.subjects.length ? state.profile.subjects : jamb ? ['English'] : [],
  );
  const [showAll, setShowAll] = useState(false);
  const all = allSubjects();
  const more = all.filter((s) => !(CORE_SUBJECTS as readonly string[]).includes(s));
  const limit = jamb ? JAMB_SUBJECT_COUNT : 9;
  const atLimit = subjects.length >= limit;
  const valid = jamb ? subjects.length === JAMB_SUBJECT_COUNT : subjects.length >= 1;

  const toggle = (s: string) => {
    if (jamb && s === 'English') return;
    setSubjects((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : cur.length >= limit ? cur : [...cur, s]));
  };

  const chip = (s: string) => (
    <Chip
      key={s}
      label={jamb && s === 'English' ? 'English · required' : s}
      icon={jamb && s === 'English' ? 'lock' : subjectMeta(s).icon}
      selected={subjects.includes(s)}
      disabled={!subjects.includes(s) && atLimit}
      onPress={() => toggle(s)}
    />
  );

  return (
    <Screen
      header={<StepHeader step={2} onBack={nav.back} />}
      footer={
        <>
          <Text variant="label" color={valid ? 'successText' : 'textSecondary'} align="center">
            {jamb ? `${subjects.length} of ${JAMB_SUBJECT_COUNT} JAMB subjects chosen` : `${subjects.length} chosen`}
          </Text>
          <Button
            title="Continue"
            iconRight="arrowRight"
            disabled={!valid}
            onPress={() => {
              updateProfile({ subjects });
              nav.push('OnboardTarget');
            }}
          />
        </>
      }
    >
      <Stack gap={spacing.lg} style={{ paddingTop: spacing.md }}>
        <PassySays text={jamb ? 'Pick your 4 JAMB subjects.' : 'Which subjects are you writing?'} />
        <Text variant="body" color="textSecondary">
          {jamb ? 'Use of English is compulsory. Choose 3 more that match your course.' : 'You can change these any time in your profile.'}
        </Text>
        <Text variant="overline" color="textSecondary">
          MOST POPULAR
        </Text>
        <View style={styles.chips}>{CORE_SUBJECTS.map(chip)}</View>
        {showAll ? (
          <>
            <Text variant="overline" color="textSecondary">
              MORE SUBJECTS
            </Text>
            <View style={styles.chips}>{more.map(chip)}</View>
          </>
        ) : (
          <Button title={`Show ${more.length} more subjects`} variant="ghost" icon="chevronDown" onPress={() => setShowAll(true)} />
        )}
      </Stack>
    </Screen>
  );
}

const TARGETS = [
  { minutes: 5, label: 'Casual' },
  { minutes: 10, label: 'Regular' },
  { minutes: 20, label: 'Serious', recommended: true },
  { minutes: 30, label: 'Intense' },
];

export function OnboardTargetScreen() {
  const nav = useNav();
  const app = useApp();
  const { state, updateProfile } = app;
  const [minutes, setMinutes] = useState(state.profile.dailyMinutes || 20);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Already signed in (finishing onboarding after log-in, or editing the plan): save now.
  const signedIn = app.mode === 'live' && app.status === 'signedIn';

  const next = async () => {
    updateProfile({ dailyMinutes: minutes });
    if (!signedIn) {
      nav.push('SignUp');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await app.saveProfile({ exams: state.profile.exams, subjects: state.profile.subjects, dailyMinutes: minutes, onboarded: true });
      nav.push('OnboardMascot');
    } catch {
      setError("Couldn't save your plan. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen
      header={<StepHeader step={3} onBack={nav.back} />}
      footer={
        <>
          {error ? <Banner tone="danger" message={error} /> : null}
          <Button title={signedIn ? 'Save my plan' : 'Continue'} iconRight={signedIn ? undefined : 'arrowRight'} loading={saving} onPress={() => void next()} />
        </>
      }
    >
      <Stack gap={spacing.lg} style={{ paddingTop: spacing.md }}>
        <PassySays text="How much time can you give me each day?" />
        <Text variant="body" color="textSecondary">
          Small and daily beats long and rare. Hit your goal to grow your streak.
        </Text>
        {TARGETS.map((t) => {
          const selected = t.minutes === minutes;
          return (
            <Card key={t.minutes} selected={selected} onPress={() => setMinutes(t.minutes)} accessibilityLabel={`${t.minutes} minutes a day`}>
              <Row gap={spacing.md}>
                <Icon name="clock" color={selected ? 'primary' : 'textSecondary'} />
                <View style={{ flex: 1 }}>
                  <Row gap={spacing.sm}>
                    <Text variant="h3">{t.minutes} min / day</Text>
                    {t.recommended ? <Tag label="Recommended" tone="success" /> : null}
                  </Row>
                  <Text variant="bodySm" color="textSecondary">
                    {t.label} · about {dailyGoalQuestions(t.minutes)} questions
                  </Text>
                </View>
              </Row>
            </Card>
          );
        })}
      </Stack>
    </Screen>
  );
}

export function OnboardMascotScreen() {
  const nav = useNav();
  const app = useApp();
  const { state, load } = app;
  const { profile } = state;
  const firstName = profile.name.split(' ')[0] || 'friend';

  return (
    <Screen
      footer={
        <Button
          title="Let's go!"
          iconRight="arrowRight"
          onPress={() => {
            if (app.mode === 'live') {
              // Live progress comes from the server; a student with no answers yet sees the first-open Home.
              nav.reset('Home', state.progress.questionsAnswered === 0 ? { variant: 'new' } : undefined);
              return;
            }
            // Demo: a brand-new profile, keeping the choices just made.
            load({ ...state, progress: NEW_PROFILE.progress, entitlement: NEW_PROFILE.entitlement });
            nav.reset('Home', { variant: 'new' });
          }}
        />
      }
    >
      <Stack gap={spacing.lg} style={{ alignItems: 'center', paddingTop: spacing.xxl }}>
        <PopIn>
          <Mascot mood="cheer" size={200} />
        </PopIn>
        <Text variant="h1" align="center">
          Welcome aboard, {firstName}!
        </Text>
        <Text variant="body" color="textSecondary" align="center">
          I'm Passy, your learning partner. Here's the plan I've made for you:
        </Text>
        <Card style={{ alignSelf: 'stretch' }}>
          <Stack gap={spacing.md}>
            <Row gap={spacing.md}>
              <Icon name="flag" color="primary" />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {profile.exams.length ? profile.exams.join(' + ') : 'JAMB'}
              </Text>
            </Row>
            <Row gap={spacing.md} style={{ alignItems: 'flex-start' }}>
              <Icon name="book" color="primary" />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {profile.subjects.length ? profile.subjects.join(', ') : 'English, Mathematics, Physics, Chemistry'}
              </Text>
            </Row>
            <Row gap={spacing.md}>
              <Icon name="target" color="primary" />
              <Text variant="bodyStrong" style={{ flex: 1 }}>
                {profile.dailyMinutes} min a day · {dailyGoalQuestions(profile.dailyMinutes)} questions
              </Text>
            </Row>
          </Stack>
        </Card>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stepHeader: { paddingBottom: spacing.sm },
  bubble: {
    flex: 1,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderBottomLeftRadius: radii.sm,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  examBadge: { width: 56, height: 56, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  check: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
});
