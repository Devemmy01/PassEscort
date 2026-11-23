import { StyleSheet, View } from 'react-native';
import { Card, Chip, Divider, ListItem, Logo, Row, Screen, Stack, Tag, Text, type IconName } from '../components';
import { useNav, type Nav } from '../navigation/Navigator';
import { sampleCbtResult, sampleDuelOutcome } from '../practice/samples';
import { DEMO_AMBASSADOR, DEMO_PROFILE, NEW_PROFILE, useApp } from '../state/AppState';
import { sampleCbtResult as sampleScore } from '../practice/samples';
import { spacing } from '../theme';

interface Entry {
  label: string;
  sub?: string;
  icon: IconName;
  go: (nav: Nav, app: ReturnType<typeof useApp>) => void;
}

interface Week {
  week: string;
  title: string;
  ships: string;
  entries: Entry[];
}

const WEEKS: Week[] = [
  {
    week: 'WK 01',
    title: 'Visual identity & design system',
    ships: 'Component library every later screen is assembled from',
    entries: [
      { label: 'Brand: logo, colour, type, mascot', icon: 'star', go: (n) => n.push('DesignBrand') },
      { label: 'Component library', sub: 'Buttons, inputs, cards, nav, tags, states', icon: 'layers', go: (n) => n.push('DesignComponents') },
      { label: 'Subject iconography', sub: 'Added in WK 11', icon: 'grid', go: (n) => n.push('DesignSubjects') },
      { label: 'Splash screen', sub: 'Matches the native splash + app icon', icon: 'phone', go: (n) => n.push('Splash', { next: 'Prototype' }) },
    ],
  },
  {
    week: 'WK 02',
    title: 'Onboarding & auth',
    ships: 'Clickable onboarding prototype, end to end',
    entries: [
      {
        label: '▶ Run first-run flow',
        sub: 'Welcome → exam → subjects → target → sign up → Passy → Home',
        icon: 'play',
        go: (n, app) => {
          app.load(NEW_PROFILE);
          n.push('Welcome');
        },
      },
      { label: 'Sign up', icon: 'user', go: (n) => n.push('SignUp') },
      { label: 'Log in', icon: 'lock', go: (n) => n.push('Login') },
      { label: 'Log in — error state', icon: 'alert', go: (n) => n.push('Login', { error: true }) },
      { label: 'Forgot password', icon: 'mail', go: (n) => n.push('ForgotPassword') },
      { label: 'Exam selection', icon: 'flag', go: (n) => n.push('OnboardExam') },
      { label: 'Subject selection', icon: 'grid', go: (n) => n.push('OnboardSubjects') },
      { label: 'Daily study target', icon: 'target', go: (n) => n.push('OnboardTarget') },
      { label: 'Mascot welcome', icon: 'sparkles', go: (n) => n.push('OnboardMascot') },
      {
        label: 'Home — first open (empty state)',
        icon: 'home',
        go: (n, app) => {
          app.load({ ...NEW_PROFILE, profile: DEMO_PROFILE.profile });
          n.push('Home', { variant: 'new' });
        },
      },
    ],
  },
  {
    week: 'WK 03',
    title: 'Practice screens',
    ships: 'Hi-fi mocks + specs for every state of both modes',
    entries: [
      { label: 'Practice hub', icon: 'book', go: (n) => n.push('PracticeHub') },
      { label: 'JAMB CBT — sprint intro', icon: 'clock', go: (n) => n.push('CbtIntro', { subject: 'Physics' }) },
      { label: 'JAMB CBT — 40-question sprint', sub: 'Timer, navigator, flagging, submit', icon: 'play', go: (n) => n.push('CbtSession', { subject: 'Physics' }) },
      { label: 'JAMB CBT — results & review', icon: 'chart', go: (n) => n.push('CbtResult', { result: sampleCbtResult() }) },
      { label: 'WAEC — objective', sub: 'Instant feedback + XP burst', icon: 'check', go: (n) => n.push('WaecSession', { subject: 'Mathematics', examBody: 'WAEC' }) },
      { label: 'WAEC — theory step-by-step', icon: 'list', go: (n) => n.push('WaecSession', { subject: 'Mathematics', examBody: 'WAEC', tab: 'theory' }) },
      { label: 'NECO — theory (Chemistry)', icon: 'list', go: (n) => n.push('WaecSession', { subject: 'Chemistry', examBody: 'NECO', tab: 'theory' }) },
      { label: 'State: loading (CBT)', icon: 'refresh', go: (n) => n.push('PracticeStates', { mode: 'cbt', state: 'loading' }) },
      { label: 'State: loading (WAEC)', icon: 'refresh', go: (n) => n.push('PracticeStates', { mode: 'waec', state: 'loading' }) },
      { label: 'State: empty filter', icon: 'search', go: (n) => n.push('PracticeStates', { mode: 'cbt', state: 'empty' }) },
      { label: 'State: offline (pack available)', icon: 'wifiOff', go: (n) => n.push('PracticeStates', { mode: 'waec', state: 'offline' }) },
      { label: 'State: offline (pack missing)', icon: 'download', go: (n) => n.push('PracticeStates', { mode: 'cbt', state: 'offline-missing' }) },
      { label: 'State: load error', icon: 'alert', go: (n) => n.push('PracticeStates', { mode: 'cbt', state: 'error' }) },
    ],
  },
  {
    week: 'WK 04',
    title: 'Gamification & profile',
    ships: 'Every gamification moment has a screen or micro-interaction spec',
    entries: [
      { label: 'Home — XP bar, streak, daily goal', icon: 'home', go: (n) => n.push('Home') },
      { label: 'Streak repair paywall', icon: 'flame', go: (n) => n.push('StreakRepair') },
      { label: 'Level up — Level 10 "Scholar"', icon: 'award', go: (n) => n.push('LevelUp', { level: 10 }) },
      { label: 'Level up — Level 50 "UTME Legend"', icon: 'crown', go: (n) => n.push('LevelUp', { level: 50 }) },
      { label: 'Level roadmap (1 → 50)', icon: 'chart', go: (n) => n.push('Levels') },
      { label: 'Badge showcase', icon: 'trophy', go: (n) => n.push('Badges') },
      { label: 'Profile / mastery / stats', icon: 'user', go: (n) => n.push('Profile') },
      { label: 'Leaderboard (week / friends / all time)', icon: 'trophy', go: (n) => n.push('Leaderboard') },
      { label: 'Streak calendar', icon: 'calendar', go: (n) => n.push('StreakCalendar') },
      { label: 'Settings & notifications', icon: 'bell', go: (n) => n.push('Settings') },
    ],
  },
  {
    week: 'WK 05',
    title: 'AI explanations & monetization',
    ships: 'Full free-to-paid conversion path, end to end',
    entries: [
      { label: 'AI Explain — loading', icon: 'sparkles', go: (n) => n.push('AiExplain', { questionId: 'jamb-math-algebra-2', state: 'loading' }) },
      { label: 'AI Explain — explanation', icon: 'sparkles', go: (n) => n.push('AiExplain', { questionId: 'jamb-math-algebra-2', state: 'explanation' }) },
      { label: 'AI Explain — paywall gate', icon: 'lock', go: (n) => n.push('AiExplain', { questionId: 'jamb-math-algebra-2', state: 'gate' }) },
      { label: 'AI Explain — offline / error', icon: 'wifiOff', go: (n) => n.push('AiExplain', { questionId: 'jamb-math-algebra-2', state: 'offline' }) },
      { label: 'Day Pass vs Monthly', icon: 'star', go: (n) => n.push('Plans', { reason: 'ai' }) },
      { label: 'Checkout (Paystack)', icon: 'card', go: (n) => n.push('Checkout', { product: 'monthly' }) },
      { label: 'Payment — success', icon: 'check', go: (n) => n.push('PaymentResult', { product: 'monthly', status: 'success' }) },
      { label: 'Payment — pending (transfer)', icon: 'clock', go: (n) => n.push('PaymentResult', { product: 'day', status: 'pending' }) },
      { label: 'Payment — failed', icon: 'x', go: (n) => n.push('PaymentResult', { product: 'day', status: 'failed' }) },
    ],
  },
  {
    week: 'WK 06',
    title: 'Duels & social',
    ships: 'Ready-to-build spec for duels and sharing',
    entries: [
      { label: 'Duel hub', icon: 'swords', go: (n) => n.push('DuelHub') },
      { label: 'Matchmaking', icon: 'search', go: (n) => n.push('Matchmaking', { subject: 'Mathematics' }) },
      { label: 'Live battle', icon: 'bolt', go: (n) => n.push('DuelBattle', { subject: 'Mathematics', opponentIndex: 0 }) },
      { label: 'Live battle — connection drop', icon: 'wifiOff', go: (n) => n.push('DuelBattle', { subject: 'Mathematics', opponentIndex: 1, simulateDrop: true }) },
      { label: 'Victory summary', icon: 'trophy', go: (n) => n.push('DuelResult', { outcome: sampleDuelOutcome(true) }) },
      { label: 'Defeat summary', icon: 'flag', go: (n) => n.push('DuelResult', { outcome: sampleDuelOutcome(false) }) },
      { label: 'Invite via link (sender)', icon: 'link', go: (n) => n.push('DuelInvite') },
      { label: 'Invite opened (receiver)', icon: 'mail', go: (n) => n.push('DuelInviteReceived', { from: 'Tunde Bakare', subject: 'Physics' }) },
      { label: 'Share cards (all templates)', sub: 'Redrawn to Figma in WK 09', icon: 'share', go: (n) => n.push('ShareCard') },
      { label: 'wa.me friend invite', icon: 'message', go: (n) => n.push('WaInvite') },
    ],
  },
  {
    week: 'WK 07',
    title: 'Referral & store assets',
    ships: 'Every PRD surface has a design; store assets and handoff are ready',
    entries: [
      {
        label: 'Ambassador program — intro',
        sub: 'Eligible student (23 sessions)',
        icon: 'award',
        go: (n, app) => {
          app.load(DEMO_PROFILE);
          n.push('AmbassadorIntro');
        },
      },
      {
        label: 'Ambassador program — not eligible yet',
        sub: 'Brand-new profile: requirements locked',
        icon: 'lock',
        go: (n, app) => {
          app.load({ ...NEW_PROFILE, profile: { ...DEMO_PROFILE.profile } });
          n.push('AmbassadorIntro');
        },
      },
      {
        label: 'Earnings dashboard — a month in',
        sub: '11 friends, ₦1,000 ready to withdraw',
        icon: 'chart',
        go: (n, app) => {
          app.load(DEMO_AMBASSADOR);
          n.push('Ambassador');
        },
      },
      {
        label: 'Earnings dashboard — just joined',
        sub: 'Empty state',
        icon: 'users',
        go: (n, app) => {
          app.load({ ...DEMO_PROFILE, ambassador: { joinedDaysAgo: 0, referrals: [] } });
          n.push('Ambassador');
        },
      },
      {
        label: 'Withdraw — first payout',
        sub: 'Bank, NUBAN, name check, confirm',
        icon: 'bank',
        go: (n, app) => {
          app.load({ ...DEMO_AMBASSADOR, ambassador: { ...DEMO_AMBASSADOR.ambassador!, payoutAccount: undefined } });
          n.push('AmbassadorPayout');
        },
      },
      {
        label: 'Withdraw — saved account',
        icon: 'bank',
        go: (n, app) => {
          app.load(DEMO_AMBASSADOR);
          n.push('AmbassadorPayout');
        },
      },
      { label: 'Checkout — ambassador code field', sub: 'Validated with the referral rules', icon: 'card', go: (n) => n.push('Checkout', { product: 'monthly' }) },
    ],
  },
  {
    week: 'WK 09',
    title: 'Duel & share polish',
    ships: 'Duel and share experience matches spec, with real data',
    entries: [
      { label: 'Live battle — animated timer & score pops', icon: 'bolt', go: (n) => n.push('DuelBattle', { subject: 'Mathematics', opponentIndex: 0 }) },
      { label: 'Victory moment', sub: 'Trophy Passy, counted-up scores', icon: 'trophy', go: (n) => n.push('DuelResult', { outcome: sampleDuelOutcome(true) }) },
      { label: 'Good fight (loss) moment', sub: 'Figma copy; never "defeat"', icon: 'thumbsUp', go: (n) => n.push('DuelResult', { outcome: sampleDuelOutcome(false) }) },
      {
        label: 'Share card — score (real CBT result)',
        icon: 'share',
        go: (n) => {
          const r = sampleScore('Physics');
          const correct = r.questions.filter((q) => r.answers[q.id] === q.answerKey).length;
          n.push('ShareCard', { card: { kind: 'score', percent: Math.round((correct / r.questions.length) * 100), examBody: 'JAMB', subject: r.subject } });
        },
      },
      { label: 'Share card — longest subject name', sub: 'NECO Christian Religious Studies', icon: 'share', go: (n) => n.push('ShareCard', { card: { kind: 'score', percent: 72, examBody: 'NECO', subject: 'Christian Religious Studies' } }) },
      { label: 'Share card — streak / level / badge', sub: "From the student's own progress", icon: 'flame', go: (n) => n.push('ShareCard') },
    ],
  },
  {
    week: 'WK 10',
    title: 'Referral program materials',
    ships: 'An ambassador has a complete, on-brand kit for their code',
    entries: [
      {
        label: 'Ambassador starter kit',
        sub: 'Status, post and pass graphics + 4 message templates',
        icon: 'layers',
        go: (n, app) => {
          app.load(DEMO_AMBASSADOR);
          n.push('AmbassadorKit');
        },
      },
      {
        label: 'Referral code "pass"',
        sub: 'On the dashboard — tap to copy',
        icon: 'star',
        go: (n, app) => {
          app.load(DEMO_AMBASSADOR);
          n.push('Ambassador');
        },
      },
      { label: 'Friend invite (wa.me)', sub: 'Same personal code', icon: 'message', go: (n) => n.push('WaInvite') },
    ],
  },
  {
    week: 'WK 11',
    title: 'Content & subject consistency',
    ships: 'Every subject looks the same, whenever its content was added',
    entries: [
      { label: 'Subject iconography', sub: '25 subjects, 6 departments', icon: 'grid', go: (n) => n.push('DesignSubjects') },
      { label: 'Objective layout — a newer subject', sub: 'WAEC Literature-in-English', icon: 'check', go: (n) => n.push('WaecSession', { subject: 'Literature-in-English', examBody: 'WAEC' }) },
      { label: 'Theory layout — NECO Biology', icon: 'list', go: (n) => n.push('WaecSession', { subject: 'Biology', examBody: 'NECO', tab: 'theory' }) },
    ],
  },
];

export default function PrototypeScreen() {
  const nav = useNav();
  const app = useApp();
  const { state, load, setOnline } = app;
  const isNew = state.progress.questionsAnswered === 0;

  return (
    <Screen>
      <Stack gap={spacing.lg} style={{ paddingTop: spacing.lg }}>
        <Logo size={40} />
        <View>
          <Text variant="h1">Design deliverables</Text>
          <Text variant="body" color="textSecondary">
            Hi-fi, clickable prototype for design weeks 1–11. Every screen is built from the shared component library; store assets (WK 07, 13)
            are in frontend/store and the QA list (WK 12) in docs/design.
          </Text>
        </View>

        <Card tone="soft">
          <Stack gap={spacing.sm}>
            <Text variant="overline" color="primary">
              PROTOTYPE DATA
            </Text>
            <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
              <Chip label="Active student" selected={!isNew} onPress={() => load(DEMO_PROFILE)} />
              <Chip label="Brand-new profile" selected={isNew} onPress={() => load(NEW_PROFILE)} />
              <Chip label="Simulate offline" icon="wifiOff" selected={!state.online} onPress={() => setOnline(!state.online)} />
            </Row>
          </Stack>
        </Card>

        {WEEKS.map((w) => (
          <Card key={w.week} padding="md">
            <View style={styles.weekHeader}>
              <Tag label={w.week} tone="primary" />
              <Text variant="h3" style={{ flex: 1 }}>
                {w.title}
              </Text>
            </View>
            <Text variant="bodySm" color="textSecondary" style={{ marginTop: spacing.xs }}>
              Ships when: {w.ships}
            </Text>
            <Divider />
            {w.entries.map((e) => (
              <ListItem key={e.label} icon={e.icon} title={e.label} subtitle={e.sub} onPress={() => e.go(nav, app)} />
            ))}
          </Card>
        ))}

        <Card padding="md">
          <ListItem icon="search" title="Question bank engine demo" subtitle="Offline SQLite + FTS5 (existing)" onPress={() => nav.push('QuestionBank')} />
        </Card>
        <Text variant="caption" color="textMuted" align="center" style={{ marginBottom: spacing.lg }}>
          Specs: docs/design/DESIGN_SPEC.md · QA: docs/design/DESIGN_QA.md · Tokens: src/theme/tokens.ts
        </Text>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  weekHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
});
