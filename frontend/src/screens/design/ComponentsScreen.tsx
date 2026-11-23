import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import {
  AppBar,
  Avatar,
  BadgeMedal,
  Banner,
  Button,
  Card,
  Chip,
  CounterPill,
  Dialog,
  EmptyState,
  IconButton,
  ListItem,
  OptionButton,
  ProgressBar,
  ProgressRing,
  Row,
  Screen,
  SectionHeader,
  SegmentedControl,
  Sheet,
  Skeleton,
  Stack,
  StepProgress,
  StreakIndicator,
  TabBar,
  Tag,
  Text,
  TextField,
  XpBar,
  XpBurst,
  type TabKey,
} from '../../components';
import { useNav } from '../../navigation/Navigator';
import { colors, radii, spacing } from '../../theme';

function Spec({ title, note, children }: { title: string; note?: string; children?: React.ReactNode }) {
  return (
    <Card padding="md">
      <Text variant="label">{title}</Text>
      {note ? (
        <Text variant="bodySm" color="textSecondary" style={{ marginTop: 2 }}>
          {note}
        </Text>
      ) : null}
      <View style={{ marginTop: spacing.md, gap: spacing.md }}>{children}</View>
    </Card>
  );
}

export default function ComponentsScreen() {
  const nav = useNav();
  const [tab, setTab] = useState<TabKey>('home');
  const [seg, setSeg] = useState<'objective' | 'theory'>('objective');
  const [chips, setChips] = useState<string[]>(['Physics']);
  const [sheet, setSheet] = useState(false);
  const [dialog, setDialog] = useState(false);
  const [burst, setBurst] = useState(0);
  const [email, setEmail] = useState('ada@example.com');

  return (
    <Screen header={<AppBar title="Component library" subtitle="WK 01" onBack={nav.back} />}>
      <Stack gap={spacing.lg}>
        <SectionHeader title="Buttons" />
        <Spec title="Variants" note="Flat (Figma 14:38): 56dp default, 12px radius, darker fill when pressed, trailing arrow on forward actions. One primary per screen.">
          <Button title="Continue" iconRight="arrowRight" />
          <Button title="Secondary" variant="secondary" />
          <Button title="Gold · rewards & upsell" variant="gold" icon="star" />
          <Button title="Danger" variant="danger" />
          <Button title="Share to WhatsApp" variant="whatsapp" icon="message" />
          <Button title="Ghost" variant="ghost" />
        </Spec>
        <Spec title="Sizes & states">
          <Button title="Medium 48" size="md" />
          <Row>
            <Button title="Small" size="sm" fullWidth={false} />
            <Button title="With icon" size="sm" icon="plus" variant="secondary" fullWidth={false} />
          </Row>
          <Button title="Loading" loading />
          <Button title="Disabled" disabled />
          <Row>
            <IconButton icon="x" label="Close" />
            <IconButton icon="share" label="Share" tone="soft" />
            <IconButton icon="settings" label="Settings" tone="soft" />
          </Row>
        </Spec>

        <SectionHeader title="Inputs" />
        <Spec title="Text field" note="Label always visible (no placeholder-as-label). 2dp border; focus = indigo; error = red + icon + message.">
          <TextField label="Email" icon="mail" value={email} onChangeText={setEmail} keyboardType="email-address" />
          <TextField label="Password" icon="lock" password placeholder="At least 8 characters" helper="Use 8+ characters." />
          <TextField label="Email" icon="mail" value="ada@" error="Enter a valid email address." />
          <TextField label="Referral code" value="ACE-2026" disabled />
        </Spec>

        <SectionHeader title="Cards" />
        <Spec title="Tones" note="1px border, 12px radius, no shadows. Selected = 2px navy border.">
          <Card>
            <Text>Flat surface card</Text>
          </Card>
          <Card onPress={() => undefined}>
            <Text>Pressable (fills on press)</Text>
          </Card>
          <Card selected onPress={() => undefined}>
            <Text>Selected</Text>
          </Card>
          <Row>
            <View style={{ flex: 1 }}>
              <Card tone="gold">
                <Text>Gold</Text>
              </Card>
            </View>
            <View style={{ flex: 1 }}>
              <Card tone="success">
                <Text>Success</Text>
              </Card>
            </View>
            <View style={{ flex: 1 }}>
              <Card tone="danger">
                <Text>Danger</Text>
              </Card>
            </View>
          </Row>
          <Card tone="primary">
            <Text color="textOnPrimary">Primary hero card</Text>
          </Card>
        </Spec>

        <SectionHeader title="Tags & chips" />
        <Spec title="Status tags">
          <Row style={{ flexWrap: 'wrap' }}>
            <Tag label="2019" />
            <Tag label="Easy" tone="success" />
            <Tag label="Hard" tone="danger" />
            <Tag label="Medium" tone="warning" />
            <Tag label="JAMB" tone="primary" />
            <Tag label="Offline ready" tone="info" icon="download" />
            <Tag label="PRO" tone="gold" icon="star" />
            <Tag label="12 days" tone="flame" icon="flame" />
          </Row>
        </Spec>
        <Spec title="Choice chips" note="48dp, check-mark on select (not colour alone).">
          <Row style={{ flexWrap: 'wrap' }}>
            {['English', 'Physics', 'Chemistry', 'Biology'].map((s) => (
              <Chip
                key={s}
                label={s}
                selected={chips.includes(s)}
                onPress={() => setChips((c) => (c.includes(s) ? c.filter((x) => x !== s) : [...c, s]))}
              />
            ))}
            <Chip label="French" disabled />
          </Row>
        </Spec>

        <SectionHeader title="Navigation" />
        <Spec title="App bar">
          <View style={styles.frame}>
            <AppBar title="Physics" subtitle="JAMB · 2019" onBack={() => undefined} right={<IconButton icon="share" label="Share" />} />
          </View>
        </Spec>
        <Spec title="Bottom tab bar" note="Four destinations. Active = tinted pill + bold label.">
          <View style={styles.frame}>
            <TabBar active={tab} onChange={setTab} />
          </View>
        </Spec>
        <Spec title="Segmented control & step progress">
          <SegmentedControl
            value={seg}
            onChange={setSeg}
            options={[
              { value: 'objective', label: 'Objective' },
              { value: 'theory', label: 'Theory' },
            ]}
          />
          <StepProgress step={2} total={4} />
        </Spec>

        <SectionHeader title="Progress & rewards" />
        <Spec title="XP bar, ring, streak, counters">
          <XpBar level={7} current={180} needed={250} />
          <XpBar level={7} current={180} needed={250} compact />
          <ProgressBar value={0.4} />
          <Row gap={spacing.lg}>
            <ProgressRing value={0.65}>
              <Text variant="label">65%</Text>
            </ProgressRing>
            <Stack gap={spacing.sm}>
              <Row>
                <StreakIndicator days={12} state="active" />
                <StreakIndicator days={12} state="pending" />
                <StreakIndicator days={0} state="broken" />
              </Row>
              <Row>
                <CounterPill kind="gem" value={120} />
                <CounterPill kind="xp" value={1830} />
              </Row>
            </Stack>
          </Row>
          <View style={{ height: 48, justifyContent: 'flex-end' }}>
            <XpBurst amount={10} burstKey={burst} />
          </View>
          <Button title="Play +XP burst" size="sm" variant="secondary" fullWidth={false} onPress={() => setBurst((b) => b + 1)} />
        </Spec>

        <SectionHeader title="Answer options" />
        <Spec title="States" note="Correct/incorrect pair colour with ✓/✕ — readable for colour-blind students.">
          <OptionButton optionKey="A" text="Default" />
          <OptionButton optionKey="B" text="Selected" state="selected" />
          <OptionButton optionKey="C" text="Correct" state="correct" />
          <OptionButton optionKey="D" text="Incorrect" state="incorrect" />
          <OptionButton optionKey="E" text="Dimmed (after reveal)" state="dimmed" disabled />
        </Spec>

        <SectionHeader title="Feedback" />
        <Spec title="Banners">
          <Banner tone="offline" title="You're offline" message="Practice still works. XP syncs when you're back." />
          <Banner tone="info" message="New 2025 past questions are available." action="Get" />
          <Banner tone="warning" message="5 minutes left in this sprint." />
          <Banner tone="success" message="Payment confirmed. Enjoy PassEscort+!" />
          <Banner tone="danger" message="Couldn't reach the server." action="Retry" />
          <Banner tone="primary" message="2 free AI explanations left today." />
        </Spec>
        <Spec title="Overlays">
          <Row>
            <Button title="Open sheet" size="sm" variant="secondary" fullWidth={false} onPress={() => setSheet(true)} />
            <Button title="Open dialog" size="sm" variant="secondary" fullWidth={false} onPress={() => setDialog(true)} />
          </Row>
        </Spec>
        <Spec title="Skeleton (loading)">
          <Skeleton width="40%" height={14} />
          <Skeleton height={56} radius={radii.lg} />
          <Skeleton height={56} radius={radii.lg} />
        </Spec>
        <Spec title="Empty state">
          <EmptyState mood="sleep" title="No duels yet" message="Challenge a friend and your history shows up here." mascotSize={96}>
            <Button title="Start a duel" size="md" />
          </EmptyState>
        </Spec>

        <SectionHeader title="Identity" />
        <Spec title="Avatars, list items, badges">
          <Row>
            <Avatar name="Adaeze Okafor" />
            <Avatar name="Tunde Bakare" ring={colors.gold} />
            <Avatar name="Musa Ibrahim" size={36} />
          </Row>
          <ListItem icon="trophy" title="List item" subtitle="With icon, subtitle and chevron" onPress={() => undefined} />
          <Row gap={spacing.md}>
            <BadgeMedal icon="flame" tier="bronze" size={64} />
            <BadgeMedal icon="target" tier="silver" size={64} />
            <BadgeMedal icon="trophy" tier="gold" size={64} />
            <BadgeMedal icon="star" tier="legend" size={64} />
            <BadgeMedal icon="star" tier="gold" locked size={64} />
          </Row>
        </Spec>
      </Stack>

      <Sheet visible={sheet} onClose={() => setSheet(false)} title="Bottom sheet">
        <Text color="textSecondary">Used for the question navigator, badge details and filters. Drag handle + close; tap backdrop to dismiss.</Text>
        <Button title="Got it" onPress={() => setSheet(false)} />
      </Sheet>
      <Dialog visible={dialog} onClose={() => setDialog(false)}>
        <Text variant="h2">Submit sprint?</Text>
        <Text color="textSecondary">Dialogs are reserved for blocking, irreversible choices.</Text>
        <Button title="Submit" onPress={() => setDialog(false)} />
        <Button title="Keep going" variant="ghost" onPress={() => setDialog(false)} />
      </Dialog>
    </Screen>
  );
}

const styles = StyleSheet.create({
  frame: { borderWidth: 2, borderColor: colors.border, borderRadius: radii.md, overflow: 'hidden', backgroundColor: colors.surface },
});
