import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  AppBar,
  Avatar,
  Banner,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  ListItem,
  Mascot,
  ProgressBar,
  Row,
  Screen,
  SectionHeader,
  Sheet,
  Stack,
  Tag,
  Text,
  TextField,
  type TagTone,
} from '../../components';
import { formatNaira } from '../../game/pricing';
import {
  AMBASSADOR_RULES,
  canRequestPayout,
  commissionFor,
  earnings,
  isValidAccountNumber,
  maskAccount,
  monthlyEarningsExample,
  PAYOUT_BANKS,
  purchaseStatus,
  type Referral,
  type ReferralStage,
} from '../../game/referral';
import { useNav } from '../../navigation/Navigator';
import { referralLink, referralMessage, waMeUrl } from '../../social/links';
import { useApp, type AppState } from '../../state/AppState';
import type { AmbassadorDashboardDTO, BankDTO, ResolveAccountResponse } from '../../../../shared/api';
import { api, ApiError } from '../../api/client';
import { colors, radii, spacing } from '../../theme';
import { ReferralCodeCard } from './ReferralCodeCard';

const pct = `${Math.round(AMBASSADOR_RULES.commissionRate * 100)}%`;

const DAY_MS = 24 * 60 * 60 * 1000;
const daysAgo = (iso: string) => Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / DAY_MS));

/** What the dashboard shows — from the API (live) or the prototype's demo referrals. */
interface DashModel {
  code: string;
  joinedDaysAgo: number;
  earnings: { pending: number; available: number; paid: number; lifetime: number };
  funnel: { joined: number; practising: number; subscribed: number };
  referrals: { name: string; joinedDaysAgo: number; stage: ReferralStage; earned: number; pending: boolean }[];
  payoutAccount: { bank: string; accountNumberMasked: string; accountName: string } | null;
  payoutInFlight: number | null;
}

function fromDTO(d: AmbassadorDashboardDTO): DashModel {
  return {
    code: d.code,
    joinedDaysAgo: daysAgo(d.joinedAt),
    earnings: d.earnings,
    funnel: d.funnel,
    referrals: d.referrals.map((r) => ({ name: r.name, joinedDaysAgo: daysAgo(r.joinedAt), stage: r.stage, earned: r.commission, pending: r.pending })),
    payoutAccount: d.payoutAccount ? { bank: d.payoutAccount.bank, accountNumberMasked: d.payoutAccount.accountNumberMasked, accountName: d.payoutAccount.accountName } : null,
    payoutInFlight: d.payoutInFlight?.amount ?? null,
  };
}

function fromDemo(code: string, amb: NonNullable<AppState['ambassador']>): DashModel {
  const e = earnings(amb.referrals);
  return {
    code,
    joinedDaysAgo: amb.joinedDaysAgo,
    earnings: { pending: e.pending, available: e.available, paid: e.paid, lifetime: e.lifetime },
    funnel: { joined: e.joined, practising: e.practising, subscribed: e.subscribed },
    referrals: amb.referrals.map((r) => ({
      name: r.name,
      joinedDaysAgo: r.joinedDaysAgo,
      stage: r.stage,
      earned: r.purchases.reduce((a, p) => a + commissionFor(p.product), 0),
      pending: r.purchases.some((p) => commissionFor(p.product) > 0 && purchaseStatus(p) === 'pending'),
    })),
    payoutAccount: amb.payoutAccount ? { bank: amb.payoutAccount.bank, accountNumberMasked: maskAccount(amb.payoutAccount.accountNumber), accountName: amb.payoutAccount.accountName } : null,
    payoutInFlight: amb.payoutRequested ?? null,
  };
}

/** Payout/account changes elsewhere tell the (still mounted) dashboard to refetch. */
const changeListeners = new Set<() => void>();
function notifyAmbassadorChanged(): void {
  changeListeners.forEach((l) => l());
}

/** Live: the server's dashboard (refetch with `reload`). Demo: built from the prototype data. */
function useDashboard(): { model: DashModel | null; loading: boolean; error: string | null; reload: () => void } {
  const app = useApp();
  const [dto, setDto] = useState<AmbassadorDashboardDTO | null>(null);
  const [loading, setLoading] = useState(app.mode === 'live');
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    changeListeners.add(l);
    return () => {
      changeListeners.delete(l);
    };
  }, []);
  useEffect(() => {
    if (app.mode !== 'live') return;
    setLoading(true);
    api<AmbassadorDashboardDTO>('GET', '/ambassador/dashboard')
      .then((d) => {
        setDto(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof ApiError ? (e.code === 'not_ambassador' ? null : e.message) : 'Something went wrong.'))
      .finally(() => setLoading(false));
  }, [app.mode, tick]);
  const model = app.mode === 'live' ? (dto ? fromDTO(dto) : null) : app.state.ambassador ? fromDemo(app.state.referralCode, app.state.ambassador) : null;
  return { model, loading, error, reload: () => setTick((t) => t + 1) };
}

async function openWhatsApp(text: string) {
  try {
    await Linking.openURL(waMeUrl(text));
  } catch {
    await Share.share({ message: text });
  }
}

/* ------------------------------------------------------------------ */
/* Intro — what the program is, who can join                           */
/* ------------------------------------------------------------------ */

export function AmbassadorIntroScreen() {
  const nav = useNav();
  const app = useApp();
  const { state, joinAmbassador } = app;
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const sessions = state.progress.sessionsCompleted;
  const enoughSessions = sessions >= AMBASSADOR_RULES.minSessionsToJoin;
  const hasEmail = state.profile.email.length > 0;
  const eligible = enoughSessions && hasEmail && state.online;

  return (
    <Screen
      header={<AppBar onBack={nav.back} title="Ambassadors" />}
      footer={
        <>
          <Button
            title="Become an ambassador"
            variant="gold"
            icon="award"
            disabled={!eligible}
            loading={joining}
            onPress={async () => {
              if (app.mode !== 'live') {
                joinAmbassador();
                nav.replace('Ambassador');
                return;
              }
              setJoining(true);
              setJoinError(null);
              try {
                await api('POST', '/ambassador/join');
                await app.refresh();
                nav.replace('Ambassador');
              } catch (e) {
                setJoinError(e instanceof ApiError ? e.message : 'Something went wrong. Try again.');
              } finally {
                setJoining(false);
              }
            }}
          />
          {joinError ? <Banner tone="danger" message={joinError} /> : null}
          <Text variant="caption" color="textSecondary" align="center">
            By joining you agree to the Ambassador terms: no spam, no paid ads using the PassEscort name, one account per person.
          </Text>
        </>
      }
    >
      <Stack gap={spacing.lg}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Mascot mood="trophy" size={132} />
          <Text variant="h1" align="center">
            Earn while you study
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            Share your code with classmates. When they buy a Day Pass or Monthly plan with it, you earn {pct} — paid to your bank account.
          </Text>
        </View>

        <Card tone="gold">
          <Row gap={spacing.md}>
            <View style={[styles.iconBubble, { backgroundColor: colors.gold }]}>
              <Icon name="bank" color="textOnGold" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="h3">{monthlyEarningsExample(10)} every month</Text>
              <Text variant="bodySm" color="text">
                if 10 friends stay on Monthly ({formatNaira(commissionFor('monthly'))} each, every month they renew, for {AMBASSADOR_RULES.attributionMonths}{' '}
                months).
              </Text>
            </View>
          </Row>
        </Card>

        <SectionHeader title="How it works" />
        <Card>
          <Stack gap={spacing.md}>
            {[
              ['Share your code', 'Send it on WhatsApp, post it on your Status, or use the ready-made graphics in your starter kit.'],
              [`Friends get ${AMBASSADOR_RULES.inviteGems} gems`, 'They join with your code and start practising. You get the gems too.'],
              [`You earn ${pct}`, `On every Day Pass and Monthly plan they buy. It clears after ${AMBASSADOR_RULES.holdDays} days and you withdraw from ${formatNaira(AMBASSADOR_RULES.payoutMinimum)}.`],
            ].map(([title, body], i) => (
              <Row key={title} gap={spacing.md} style={{ alignItems: 'flex-start' }}>
                <View style={styles.step}>
                  <Text variant="label" color="textOnPrimary">
                    {i + 1}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{title}</Text>
                  <Text variant="bodySm" color="textSecondary">
                    {body}
                  </Text>
                </View>
              </Row>
            ))}
          </Stack>
        </Card>

        <SectionHeader title="Who can join" />
        <Card padding="md">
          <Requirement
            done={enoughSessions}
            title={`Finish ${AMBASSADOR_RULES.minSessionsToJoin} practice sessions`}
            detail={enoughSessions ? `${sessions} done` : `${sessions} of ${AMBASSADOR_RULES.minSessionsToJoin} — ambassadors use the app they recommend`}
          />
          <Divider />
          <Requirement done={hasEmail} title="A verified email" detail={hasEmail ? state.profile.email : 'Add one in Settings'} />
          <Divider />
          <Requirement done title="A Nigerian bank account for payouts" detail="You add it when you first withdraw. The name must match yours." />
        </Card>
        {!state.online ? <Banner tone="offline" message="You're offline. Joining needs a connection." /> : null}
      </Stack>
    </Screen>
  );
}

function Requirement({ done, title, detail }: { done: boolean; title: string; detail: string }) {
  return (
    <Row gap={spacing.md} style={{ paddingVertical: spacing.xs }}>
      <View style={[styles.check, { backgroundColor: done ? colors.successSoft : colors.surfaceSunken }]}>
        <Icon name={done ? 'check' : 'lock'} size={18} color={done ? 'successText' : 'textSecondary'} strokeWidth={done ? 3 : 2} />
      </View>
      <View style={{ flex: 1 }}>
        <Text variant="bodyStrong">{title}</Text>
        <Text variant="bodySm" color="textSecondary">
          {detail}
        </Text>
      </View>
    </Row>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard — code, earnings, referred students                       */
/* ------------------------------------------------------------------ */

const STAGE: Record<ReferralStage, { label: string; tone: TagTone }> = {
  joined: { label: 'Joined', tone: 'neutral' },
  practising: { label: 'Practising', tone: 'info' },
  subscribed: { label: 'Subscribed', tone: 'success' },
};

export function AmbassadorDashboardScreen() {
  const nav = useNav();
  const { state } = useApp();
  const { width } = useWindowDimensions();
  const [copied, setCopied] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const { model: amb, loading, error, reload } = useDashboard();
  const code = amb?.code ?? state.referralCode;
  const link = referralLink(code);

  if (loading && !amb) {
    return (
      <Screen header={<AppBar onBack={nav.back} title="Ambassador" />} scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }
  if (error) {
    return (
      <Screen header={<AppBar onBack={nav.back} title="Ambassador" />}>
        <EmptyState mood="sad" title="Couldn't load your dashboard" message={error}>
          <Button title="Try again" icon="refresh" onPress={reload} />
        </EmptyState>
      </Screen>
    );
  }

  if (!amb) {
    return (
      <Screen header={<AppBar onBack={nav.back} title="Ambassador" />}>
        <EmptyState mood="happy" title="You're not an ambassador yet" message="Join the program to get your earnings dashboard.">
          <Button title="See the program" onPress={() => nav.replace('AmbassadorIntro')} />
        </EmptyState>
      </Screen>
    );
  }

  const e = { ...amb.earnings, ...amb.funnel };
  const toMinimum = Math.max(0, AMBASSADOR_RULES.payoutMinimum - e.available);
  const ready = canRequestPayout(e.available) && amb.payoutInFlight === null;
  const sorted = [...amb.referrals].sort((a, b) => a.joinedDaysAgo - b.joinedDaysAgo);

  return (
    <Screen
      header={
        <AppBar
          onBack={nav.back}
          title="Ambassador"
          subtitle={amb.joinedDaysAgo === 0 ? 'Joined today' : `Joined ${amb.joinedDaysAgo} days ago`}
          right={
            <Pressable onPress={() => setRulesOpen(true)} hitSlop={12} accessibilityRole="button" accessibilityLabel="How commission works" style={styles.help}>
              <Icon name="alert" color="primary" />
            </Pressable>
          }
        />
      }
    >
      <Stack gap={spacing.lg}>
        <Pressable
          onPress={async () => {
            await Clipboard.setStringAsync(code);
            setCopied(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Copy code ${code}`}
          style={{ alignItems: 'center', gap: spacing.xs }}
        >
          <ReferralCodeCard code={code} width={Math.min(width - 32, 448)} ambassador />
          <Row gap={spacing.xs}>
            <Icon name={copied ? 'check' : 'copy'} size={16} color="primary" />
            <Text variant="label" color="primary">
              {copied ? 'Code copied' : 'Tap the pass to copy your code'}
            </Text>
          </Row>
        </Pressable>
        <Row gap={spacing.sm}>
          <View style={{ flex: 1 }}>
            <Button title="WhatsApp" variant="whatsapp" icon="message" size="md" onPress={() => void openWhatsApp(referralMessage(code, link))} />
          </View>
          <View style={{ flex: 1 }}>
            <Button title="Starter kit" variant="secondary" icon="layers" size="md" onPress={() => nav.push('AmbassadorKit')} />
          </View>
        </Row>

        {amb.payoutInFlight ? (
          <Banner
            tone="success"
            title={`${formatNaira(amb.payoutInFlight)} is on its way`}
            message={`Sent on ${AMBASSADOR_RULES.payoutDay} to ${amb.payoutAccount?.bank ?? 'your bank'} ${amb.payoutAccount?.accountNumberMasked ?? ''}.`}
          />
        ) : null}

        <Card>
          <Stack gap={spacing.md}>
            <View>
              <Text variant="overline" color="textSecondary">
                READY TO WITHDRAW
              </Text>
              <Text variant="display">{formatNaira(e.available)}</Text>
            </View>
            {ready ? (
              <Button title={`Withdraw ${formatNaira(e.available)}`} icon="bank" onPress={() => nav.push('AmbassadorPayout')} />
            ) : amb.payoutInFlight ? (
              <Text variant="bodySm" color="textSecondary">
                You can withdraw again once this payout lands.
              </Text>
            ) : (
              <Stack gap={spacing.xs}>
                <ProgressBar value={e.available / AMBASSADOR_RULES.payoutMinimum} color={colors.success} />
                <Text variant="bodySm" color="textSecondary">
                  {formatNaira(toMinimum)} more and you can withdraw (minimum {formatNaira(AMBASSADOR_RULES.payoutMinimum)}).
                </Text>
              </Stack>
            )}
            <Divider />
            <Row style={{ justifyContent: 'space-between' }}>
              <Money label="Clearing" value={e.pending} hint={`${AMBASSADOR_RULES.holdDays}-day hold`} />
              <Money label="Paid out" value={e.paid} />
              <Money label="All time" value={e.lifetime} />
            </Row>
          </Stack>
        </Card>

        <SectionHeader title="Your friends" />
        {amb.referrals.length === 0 ? (
          <Card>
            <EmptyState mood="wow" title="Your first friend is one message away" message="Post your pass on your WhatsApp Status today — classmates see it for 24 hours.">
              <Button title="Open the starter kit" variant="secondary" icon="layers" onPress={() => nav.push('AmbassadorKit')} />
            </EmptyState>
          </Card>
        ) : (
          <>
            <Card padding="md">
              <Funnel joined={e.joined} practising={e.practising} subscribed={e.subscribed} />
            </Card>
            <Card padding="sm">
              {sorted.map((r, i) => (
                <View key={r.name}>
                  {i > 0 ? <Divider /> : null}
                  <ReferralRow referral={r} />
                </View>
              ))}
            </Card>
          </>
        )}
        <Text variant="caption" color="textSecondary" align="center">
          Friends are shown by first name and initial only. Earnings update after each purchase is confirmed by Paystack.
        </Text>
      </Stack>

      <Sheet visible={rulesOpen} onClose={() => setRulesOpen(false)} title="How commission works">
        <Stack gap={spacing.sm}>
          {[
            `You earn ${pct} of every Day Pass and Monthly plan bought with your code. Gem packs don't count.`,
            `A friend's purchases count for ${AMBASSADOR_RULES.attributionMonths} months after they join with your code.`,
            `Commission clears after ${AMBASSADOR_RULES.holdDays} days, in case of a refund.`,
            `Withdraw from ${formatNaira(AMBASSADOR_RULES.payoutMinimum)} to a Nigerian bank account in your own name. Payouts go out every ${AMBASSADOR_RULES.payoutDay}.`,
            'Buying with your own code, fake accounts or spam ends your membership and cancels unpaid commission.',
          ].map((rule) => (
            <Row key={rule} gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
              <Icon name="check" size={18} color="successText" strokeWidth={3} />
              <Text variant="body" style={{ flex: 1 }}>
                {rule}
              </Text>
            </Row>
          ))}
        </Stack>
        <Button title="Got it" onPress={() => setRulesOpen(false)} />
      </Sheet>
    </Screen>
  );
}

function Money({ label, value, hint }: { label: string; value: number; hint?: string }) {
  return (
    <View style={{ flex: 1 }}>
      <Text variant="caption" color="textSecondary">
        {label.toUpperCase()}
      </Text>
      <Text variant="h3">{formatNaira(value)}</Text>
      {hint ? (
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

function Funnel({ joined, practising, subscribed }: { joined: number; practising: number; subscribed: number }) {
  const rows: [string, number, string][] = [
    ['Joined with your code', joined, colors.primary],
    ['Started practising', practising, colors.accent],
    ['Bought a plan', subscribed, colors.success],
  ];
  return (
    <Stack gap={spacing.sm}>
      {rows.map(([label, n, color]) => (
        <View key={label} style={{ gap: spacing.xs }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <Text variant="label">{label}</Text>
            <Text variant="label">{n}</Text>
          </Row>
          <ProgressBar value={joined ? n / joined : 0} color={color} height={8} />
        </View>
      ))}
    </Stack>
  );
}

function ReferralRow({ referral }: { referral: DashModel['referrals'][number] }) {
  const [first, last] = referral.name.split(' ');
  // The server already shortens names ("Chidi N."); the prototype's full names are shortened here.
  const shown = last && !last.endsWith('.') ? `${first} ${last[0]}.` : referral.name;
  const { earned, pending } = referral;
  const stage = STAGE[referral.stage];
  return (
    <Row gap={spacing.md} style={{ paddingVertical: spacing.sm, paddingHorizontal: spacing.xs }}>
      <Avatar name={referral.name} size={40} />
      <View style={{ flex: 1, gap: 2 }}>
        <Text variant="bodyStrong">{shown}</Text>
        <Row gap={spacing.xs}>
          <Tag label={stage.label} tone={stage.tone} />
          <Text variant="caption" color="textSecondary">
            {referral.joinedDaysAgo === 0 ? 'today' : `${referral.joinedDaysAgo}d ago`}
          </Text>
        </Row>
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text variant="bodyStrong" color={earned ? 'successText' : 'textSecondary'}>
          {earned ? `+${formatNaira(earned)}` : '—'}
        </Text>
        {pending ? (
          <Text variant="caption" color="textSecondary">
            clearing
          </Text>
        ) : null}
      </View>
    </Row>
  );
}

/* ------------------------------------------------------------------ */
/* Payout — bank account → confirm → sent                              */
/* ------------------------------------------------------------------ */

type PayoutStep = 'account' | 'confirm' | 'sent';

export function AmbassadorPayoutScreen() {
  const nav = useNav();
  const app = useApp();
  const { state, savePayoutAccount, requestPayout } = app;
  const live = app.mode === 'live';
  const { model: amb, reload } = useDashboard();
  const available = amb?.earnings.available ?? 0;
  const [step, setStep] = useState<PayoutStep | null>(null);
  const [banks, setBanks] = useState<BankDTO[]>(live ? [] : PAYOUT_BANKS.map((name) => ({ code: name, name })));
  const [bank, setBank] = useState<BankDTO | null>(null);
  const [bankOpen, setBankOpen] = useState(false);
  const [account, setAccount] = useState('');
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState<ResolveAccountResponse | null>(null);
  const [resolveError, setResolveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentAmount, setSentAmount] = useState(0);

  // First step depends on whether an account is already saved.
  useEffect(() => {
    if (amb && step === null) setStep(amb.payoutAccount ? 'confirm' : 'account');
  }, [amb, step]);

  useEffect(() => {
    if (!live) return;
    api<BankDTO[]>('GET', '/ambassador/banks')
      .then(setBanks)
      .catch(() => setError("Couldn't load the list of banks. Check your connection."));
  }, [live]);

  // The bank's own name for the account (Paystack "Resolve Account Number"); the demo uses the profile name.
  useEffect(() => {
    if (!bank || !isValidAccountNumber(account) || resolved) return;
    let alive = true;
    setResolving(true);
    setResolveError(null);
    const done = () => alive && setResolving(false);
    if (!live) {
      const t = setTimeout(() => {
        if (alive) setResolved({ accountName: (state.profile.name || 'Account holder').toUpperCase(), matchesProfile: true });
        done();
      }, 900);
      return () => {
        alive = false;
        clearTimeout(t);
      };
    }
    api<ResolveAccountResponse>('POST', '/ambassador/payout-account/resolve', { bankCode: bank.code, accountNumber: account })
      .then((r) => alive && setResolved(r))
      .catch((e) => alive && setResolveError(e instanceof ApiError ? e.message : "Couldn't check this account."))
      .finally(done);
    return () => {
      alive = false;
    };
  }, [bank, account, resolved, live, state.profile.name]);

  if (!amb || step === null) {
    return (
      <Screen header={<AppBar onBack={nav.back} title="Withdraw" />}>
        {live && !amb ? <ActivityIndicator style={{ marginTop: spacing.xxxl }} color={colors.primary} /> : <EmptyState mood="happy" title="Join the Ambassador program first" />}
      </Screen>
    );
  }

  if (step === 'sent') {
    const acct = amb.payoutAccount;
    return (
      <Screen footer={<Button title="Back to dashboard" onPress={nav.back} />}>
        <EmptyState mood="cheer" title={`${formatNaira(sentAmount)} is on its way`} message={`We send payouts every ${AMBASSADOR_RULES.payoutDay}. You'll get an email when it lands.`}>
          <Card padding="md">
            <Detail label="To" value={acct ? `${acct.bank} ${acct.accountNumberMasked}` : '—'} />
            <Detail label="Name" value={acct?.accountName ?? '—'} />
            <Detail label="Amount" value={formatNaira(sentAmount)} />
          </Card>
        </EmptyState>
      </Screen>
    );
  }

  if (step === 'account') {
    const accountError = account.length === 10 && !isValidAccountNumber(account) ? 'Use the 10 digits of your NUBAN account number.' : null;
    const nameOk = Boolean(resolved?.matchesProfile);
    const save = async () => {
      if (!bank || !resolved) return;
      setSaving(true);
      setError(null);
      try {
        if (live) {
          await api('PUT', '/ambassador/payout-account', { bankCode: bank.code, accountNumber: account });
          reload();
          notifyAmbassadorChanged();
        } else savePayoutAccount({ bank: bank.name, accountNumber: account, accountName: resolved.accountName });
        setStep('confirm');
      } catch (e) {
        setError(e instanceof ApiError ? e.message : "Couldn't save this account. Try again.");
      } finally {
        setSaving(false);
      }
    };
    return (
      <Screen
        header={<AppBar onBack={nav.back} title="Payout account" subtitle="Step 1 of 2" />}
        footer={
          <>
            {error ? <Banner tone="danger" message={error} /> : null}
            <Button title="Save account" loading={saving} disabled={!bank || !nameOk || !state.online} onPress={() => void save()} />
          </>
        }
      >
        <Stack gap={spacing.lg}>
          <Text variant="body" color="textSecondary">
            Payouts go to a Nigerian bank account in your own name. We check the name with your bank before saving it.
          </Text>
          <View style={{ gap: spacing.xs }}>
            <Text variant="label">Bank</Text>
            <Pressable onPress={() => setBankOpen(true)} accessibilityRole="button" accessibilityLabel={bank ? `Bank: ${bank.name}. Change` : 'Choose your bank'} style={styles.select}>
              <Icon name="bank" size={20} color={bank ? 'primary' : 'textMuted'} />
              <Text variant="body" color={bank ? 'text' : 'textSecondary'} style={{ flex: 1 }}>
                {bank?.name ?? 'Choose your bank'}
              </Text>
              <Icon name="chevronDown" size={20} color="textMuted" />
            </Pressable>
          </View>
          <TextField
            label="Account number"
            icon="hash"
            value={account}
            onChangeText={(t) => {
              setAccount(t.replace(/\D/g, '').slice(0, 10));
              setResolved(null);
              setResolveError(null);
            }}
            keyboardType="number-pad"
            maxLength={10}
            placeholder="10 digits"
            error={accountError ?? resolveError}
            helper={account.length < 10 ? `${account.length}/10 digits` : undefined}
          />
          {resolving ? (
            <Banner tone="info" icon="refresh" message="Checking the account name with your bank…" />
          ) : resolved ? (
            <Card tone={nameOk ? 'success' : 'danger'} padding="md">
              <Row gap={spacing.md}>
                <Icon name={nameOk ? 'check' : 'alert'} color={nameOk ? 'successText' : 'dangerText'} strokeWidth={3} />
                <View style={{ flex: 1 }}>
                  <Text variant="caption" color={nameOk ? 'successText' : 'dangerText'}>
                    ACCOUNT NAME
                  </Text>
                  <Text variant="bodyStrong">{resolved.accountName}</Text>
                  {!nameOk ? (
                    <Text variant="bodySm" color="dangerText">
                      This account isn't in your name ({state.profile.name || 'add your name in your profile'}). Payouts can only go to your own account.
                    </Text>
                  ) : null}
                </View>
              </Row>
            </Card>
          ) : null}
        </Stack>

        <Sheet visible={bankOpen} onClose={() => setBankOpen(false)} title="Choose your bank">
          <ScrollView style={{ maxHeight: 420 }}>
            {banks.map((b) => (
              <ListItem
                key={b.code}
                title={b.name}
                right={b.code === bank?.code ? <Icon name="check" color="primary" strokeWidth={3} /> : undefined}
                onPress={() => {
                  setBank(b);
                  setResolved(null);
                  setResolveError(null);
                  setBankOpen(false);
                }}
              />
            ))}
          </ScrollView>
        </Sheet>
      </Screen>
    );
  }

  const acct = amb.payoutAccount;
  const withdraw = async () => {
    setSending(true);
    setError(null);
    try {
      if (live) {
        const r = await api<{ amount: number }>('POST', '/ambassador/payouts');
        setSentAmount(r.amount);
        reload();
        notifyAmbassadorChanged();
      } else {
        setSentAmount(available);
        requestPayout(available);
      }
      setStep('sent');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Nothing was sent — try again.');
    } finally {
      setSending(false);
    }
  };
  return (
    <Screen
      header={<AppBar onBack={nav.back} title="Withdraw" subtitle="Step 2 of 2" />}
      footer={
        <>
          {error ? <Banner tone="danger" message={error} /> : null}
          <Button title={`Withdraw ${formatNaira(available)}`} icon="bank" loading={sending} disabled={!canRequestPayout(available) || !state.online} onPress={() => void withdraw()} />
        </>
      }
    >
      <Stack gap={spacing.lg}>
        <View style={{ alignItems: 'center', paddingTop: spacing.md }}>
          <Text variant="overline" color="textSecondary">
            YOU'RE WITHDRAWING
          </Text>
          <Text variant="display">{formatNaira(available)}</Text>
        </View>
        <Card padding="md">
          <Detail label="To" value={acct ? `${acct.bank} ${acct.accountNumberMasked}` : '—'} />
          <Detail label="Name" value={acct?.accountName ?? '—'} />
          <Detail label="Arrives" value={`By ${AMBASSADOR_RULES.payoutDay}`} />
          <Detail label="Fee" value="Free" />
          <Pressable onPress={() => setStep('account')} hitSlop={12} accessibilityRole="button" style={{ marginTop: spacing.sm }}>
            <Text variant="label" color="textLink">
              Change account
            </Text>
          </Pressable>
        </Card>
        {!state.online ? <Banner tone="offline" message="You're offline. Withdrawals need a connection." /> : null}
        <Text variant="caption" color="textSecondary" align="center">
          Only cleared commission can be withdrawn. Amounts still in the {AMBASSADOR_RULES.holdDays}-day hold stay in your dashboard.
        </Text>
      </Stack>
    </Screen>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between', paddingVertical: spacing.xs }}>
      <Text variant="body" color="textSecondary">
        {label}
      </Text>
      <Text variant="bodyStrong" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  iconBubble: { width: 48, height: 48, borderRadius: radii.md, alignItems: 'center', justifyContent: 'center' },
  step: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  check: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  help: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  select: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
  },
});
