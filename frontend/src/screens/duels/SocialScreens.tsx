import * as Clipboard from 'expo-clipboard';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Share, StyleSheet, useWindowDimensions, View } from 'react-native';
import {
  AppBar,
  Avatar,
  Banner,
  Button,
  Card,
  Chip,
  Confetti,
  CountUp,
  EmptyState,
  Icon,
  Mascot,
  PopIn,
  Row,
  Screen,
  SectionHeader,
  Stack,
  Tag,
  Text,
} from '../../components';
import { XP_RULES } from '../../game/levels';
import { useNav } from '../../navigation/Navigator';
import { subjectMeta } from '../../practice/subjects';
import type { Routes } from '../../navigation/routes';
import { CORE_SUBJECTS } from '../../practice/questions';
import { DUEL_ROUNDS, DUEL_SECONDS_PER_QUESTION, OPPONENTS } from '../../practice/types';
import { sampleCbtResult, sampleDuelOutcome } from '../../practice/samples';
import { SHARE_CARD_EXPORT, SHARE_CARD_KINDS, scorePercent, shareMessage, type ShareCardData, type ShareCardKind } from '../../social/shareCards';
import { ShareCardView } from './ShareCards';
import { duelInviteLink, duelInviteMessage, makeCode, referralLink, referralMessage, waMeUrl } from '../../social/links';
import { useApp } from '../../state/AppState';
import { api, ApiError } from '../../api/client';
import type { DuelInviteDTO } from '../../../../shared/api';
import { joinInvite, leaveDuel, useDuel } from '../../realtime/duelSession';
import { shareImage } from '../../social/exportImage';
import { AMBASSADOR_RULES, personalCode } from '../../game/referral';
import { colors, layout, palette, radii, spacing } from '../../theme';

async function openWhatsApp(text: string): Promise<boolean> {
  const url = waMeUrl(text);
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    await Share.share({ message: text });
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Duel result                                                         */
/* ------------------------------------------------------------------ */

export function DuelResultScreen({ params }: { params: Routes['DuelResult'] }) {
  const nav = useNav();
  const { state } = useApp();
  const { outcome } = params;
  // A forfeit decides the duel whatever the score was at the time.
  const won = outcome.reason === 'opponent-forfeit' || (outcome.reason !== 'forfeit' && outcome.myScore > outcome.theirScore);
  const draw = !outcome.reason?.includes('forfeit') && outcome.myScore === outcome.theirScore;
  const myCorrect = outcome.rounds.filter((r) => r.myCorrect).length;
  const theirCorrect = outcome.rounds.filter((r) => r.theirCorrect).length;
  const avg = (xs: number[]) => (xs.length ? (xs.reduce((a, b) => a + b, 0) / xs.length).toFixed(1) : '–');
  const xp = outcome.xp ?? (won ? XP_RULES.duelWin : draw ? XP_RULES.duelDraw : XP_RULES.duelLoss);
  const me = state.profile.name || 'You';
  const them = outcome.opponent.name.split(' ')[0];

  return (
    <Screen
      header={<AppBar onBack={nav.back} backIcon="x" title="Duel result" subtitle={outcome.subject} />}
      footer={
        <>
          <Row gap={spacing.sm}>
            <View style={{ flex: 1 }}>
              <Button
                title="Play again"
                icon="refresh"
                variant="secondary"
                onPress={() => {
                  leaveDuel();
                  nav.replace('Matchmaking', { subject: outcome.subject });
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Button
                title="Share"
                icon="share"
                variant={won ? 'gold' : 'primary'}
                onPress={() =>
                  nav.push('ShareCard', {
                    card: { kind: 'duel', opponent: outcome.opponent.name, myScore: outcome.myScore, theirScore: outcome.theirScore, subject: outcome.subject },
                  })
                }
              />
            </View>
          </Row>
          <Button
            title="Back to duels"
            variant="ghost"
            onPress={() => {
              leaveDuel();
              nav.reset('DuelHub');
            }}
          />
        </>
      }
    >
      {won ? <Confetti /> : null}
      <Stack gap={spacing.lg}>
        <View style={{ alignItems: 'center', gap: spacing.xs }}>
          <PopIn>
            <Mascot mood={won ? 'trophy' : draw ? 'happy' : 'sad'} size={140} />
          </PopIn>
          {/* Figma PvP result frames: "VICTORY!" and "GOOD FIGHT" — a loss is never called a defeat. */}
          <Text variant="overline" color={won ? 'warningText' : draw ? 'textSecondary' : 'primary'}>
            {won ? 'VICTORY!' : draw ? 'DRAW' : 'GOOD FIGHT'}
          </Text>
          <Text variant="h1" align="center">
            {outcome.reason === 'opponent-forfeit'
              ? `${them} left — the win is yours`
              : outcome.reason === 'forfeit'
                ? 'You left the duel'
                : won
                  ? `You beat ${them}!`
                  : draw
                    ? 'Dead heat!'
                    : `${them} edged it this time`}
          </Text>
          <Tag label={xp > 0 ? `+${xp} XP` : 'No duel XP for a forfeit'} tone={xp > 0 ? 'gold' : 'neutral'} icon="bolt" center />
          {outcome.practice ? (
            <Text variant="bodySm" color="textSecondary" align="center">
              Practice duel with Passy Bot — doesn't count toward your W–L record.
            </Text>
          ) : null}
        </View>

        <Card>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={styles.side}>
              <Avatar name={me} size={56} ring={won ? colors.gold : colors.primary} />
              <Text variant="label" numberOfLines={1}>
                You
              </Text>
              <CountUp
                value={outcome.myScore}
                from={0}
                duration={900}
                delay={350}
                render={(n) => (
                  <Text variant="display" color={won ? 'text' : 'textSecondary'}>
                    {n}
                  </Text>
                )}
              />
            </View>
            <Text variant="h3" color="textMuted">
              vs
            </Text>
            <View style={styles.side}>
              <Avatar name={outcome.opponent.name} size={56} ring={!won && !draw ? colors.gold : colors.streak} />
              <Text variant="label" numberOfLines={1}>
                {them}
              </Text>
              <CountUp
                value={outcome.theirScore}
                from={0}
                duration={900}
                delay={350}
                render={(n) => (
                  <Text variant="display" color={!won && !draw ? 'text' : 'textSecondary'}>
                    {n}
                  </Text>
                )}
              />
            </View>
          </Row>
          <View style={styles.compare}>
            <CompareRow label="Correct" mine={`${myCorrect}/${outcome.rounds.length}`} theirs={`${theirCorrect}/${outcome.rounds.length}`} />
            <CompareRow
              label="Avg. speed"
              mine={`${avg(outcome.rounds.filter((r) => r.myCorrect).map((r) => r.mySeconds))}s`}
              theirs={`${avg(outcome.rounds.filter((r) => r.theirCorrect).map((r) => r.theirSeconds))}s`}
            />
          </View>
        </Card>

        {outcome.rounds.length ? <SectionHeader title="Round by round" /> : null}
        {outcome.rounds.length ? <Card padding="md">
          {outcome.rounds.map((r, i) => (
            <Row key={i} style={[styles.roundRow, i < outcome.rounds.length - 1 ? styles.roundBorder : null]}>
              <Mark ok={r.myCorrect} seconds={r.mySeconds} />
              <Text variant="label" color="textSecondary" align="center" style={{ flex: 1 }}>
                Q{i + 1}
              </Text>
              <Mark ok={r.theirCorrect} seconds={r.theirSeconds} alignRight />
            </Row>
          ))}
        </Card> : null}
      </Stack>
    </Screen>
  );
}

function CompareRow({ label, mine, theirs }: { label: string; mine: string; theirs: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text variant="bodyStrong">{mine}</Text>
      <Text variant="caption" color="textSecondary">
        {label.toUpperCase()}
      </Text>
      <Text variant="bodyStrong">{theirs}</Text>
    </Row>
  );
}

function Mark({ ok, seconds, alignRight = false }: { ok: boolean; seconds: number; alignRight?: boolean }) {
  return (
    <Row gap={spacing.xs} style={{ width: 96, justifyContent: alignRight ? 'flex-end' : 'flex-start' }}>
      <Icon name={ok ? 'check' : 'x'} size={18} color={ok ? 'successText' : 'dangerText'} strokeWidth={3} />
      <Text variant="bodySm" color="textSecondary">
        {seconds.toFixed(1)}s
      </Text>
    </Row>
  );
}

/* ------------------------------------------------------------------ */
/* Duel invite — sender                                                */
/* ------------------------------------------------------------------ */

const INVITE_TTL_SECONDS = 15 * 60;

export function DuelInviteScreen({ params }: { params: Routes['DuelInvite'] }) {
  const nav = useNav();
  const app = useApp();
  const { state } = app;
  const live = app.mode === 'live';
  const duel = useDuel();
  const subjects = state.profile.subjects.length ? state.profile.subjects : [...CORE_SUBJECTS].slice(0, 4);
  const [subject, setSubject] = useState(params?.subject ?? subjects[0]!);
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(Date.now());
  const demoCode = useMemo(() => makeCode(Date.now()), []);
  const [invite, setInvite] = useState<DuelInviteDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const leaving = useRef(false);

  // Live: one real invite per chosen subject; wait in its room for the friend.
  useEffect(() => {
    if (!live) return;
    let alive = true;
    setInvite(null);
    setError(null);
    api<DuelInviteDTO>('POST', '/duels/invites', { subject })
      .then((inv) => {
        if (!alive) return;
        setInvite(inv);
        joinInvite(inv.code, subject, 'live');
      })
      .catch((e) => alive && setError(e instanceof ApiError ? e.message : "Couldn't create a duel link."));
    return () => {
      alive = false;
    };
  }, [live, subject]);

  // Friend arrived: on to the VS screen.
  useEffect(() => {
    if (live && invite && duel.phase === 'found') {
      leaving.current = true;
      nav.replace('Matchmaking', { subject, inviteCode: invite.code });
    }
  }, [live, invite, duel.phase, nav, subject]);

  // Leaving without a match stops waiting.
  useEffect(
    () => () => {
      if (live && !leaving.current) leaveDuel();
    },
    [live],
  );

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const code = live ? (invite?.code ?? '······') : demoCode;
  const link = live ? (invite?.link ?? '') : duelInviteLink(demoCode);
  const left = live ? Math.max(0, Math.floor(((invite ? Date.parse(invite.expiresAt) : now + INVITE_TTL_SECONDS * 1000) - now) / 1000)) : INVITE_TTL_SECONDS;
  const first = state.profile.name.split(' ')[0] || 'Your friend';
  const message = duelInviteMessage(first, subject, link);
  const ready = !live || Boolean(invite);

  return (
    <Screen
      header={<AppBar onBack={nav.back} title="Duel a friend" subtitle="Invite link" />}
      footer={
        <>
          <Button title="Send on WhatsApp" variant="whatsapp" icon="message" disabled={!ready} onPress={() => void openWhatsApp(message)} />
          <Button title="More sharing options" variant="secondary" icon="share" disabled={!ready} onPress={() => void Share.share({ message })} />
        </>
      }
    >
      <Stack gap={spacing.lg}>
        <Text variant="label">Subject</Text>
        <Row gap={spacing.sm} style={{ flexWrap: 'wrap' }}>
          {subjects.map((s) => (
            <Chip key={s} label={s} icon={subjectMeta(s).icon} selected={s === subject} onPress={() => setSubject(s)} />
          ))}
        </Row>
        {error ? <Banner tone="danger" message={error} /> : null}
        {!state.online && live ? <Banner tone="offline" message="Duel links need an internet connection." /> : null}

        <Card tone="soft">
          <Stack gap={spacing.sm}>
            <Text variant="overline" color="primary">
              YOUR DUEL LINK
            </Text>
            <Row gap={spacing.sm}>
              <Text variant="bodyStrong" style={{ flex: 1 }} selectable numberOfLines={1}>
                {link || 'Creating your link…'}
              </Text>
              <Button
                title={copied ? 'Copied' : 'Copy'}
                size="sm"
                variant="secondary"
                icon={copied ? 'check' : 'copy'}
                fullWidth={false}
                disabled={!ready}
                onPress={async () => {
                  await Clipboard.setStringAsync(link);
                  setCopied(true);
                }}
              />
            </Row>
            <Text variant="caption" color="textSecondary">
              {left > 0 ? `Code ${code} · expires in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')} · one opponent only` : 'This link has expired — pick the subject again for a new one.'}
            </Text>
          </Stack>
        </Card>

        <View>
          <Text variant="label" style={{ marginBottom: spacing.sm }}>
            Message preview
          </Text>
          <View style={styles.bubble}>
            <Text variant="body">{message}</Text>
          </View>
        </View>

        <Card padding="md">
          <Row gap={spacing.md}>
            <View style={styles.waiting}>
              <Icon name="clock" color="primary" />
            </View>
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">Waiting for your friend…</Text>
              <Text variant="bodySm" color="textSecondary">
                Keep this screen open — the duel starts the moment they open your link. No app yet? The link takes them to the Play Store first.
              </Text>
            </View>
          </Row>
          {live ? null : (
            <View style={{ marginTop: spacing.md }}>
              <Button
                title="Prototype: friend joined"
                size="sm"
                variant="ghost"
                onPress={() => nav.replace('Matchmaking', { subject, inviteFrom: OPPONENTS[1]!.name })}
              />
            </View>
          )}
        </Card>
      </Stack>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Duel invite — receiver (deep link landing)                          */
/* ------------------------------------------------------------------ */

export function DuelInviteReceivedScreen({ params }: { params: Routes['DuelInviteReceived'] }) {
  const nav = useNav();
  const app = useApp();
  const live = app.mode === 'live' && Boolean(params.code);
  const [invite, setInvite] = useState<DuelInviteDTO | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!live) return;
    api<DuelInviteDTO>('GET', `/duels/invites/${encodeURIComponent(params.code!)}`)
      .then((inv) => (inv.status === 'open' ? setInvite(inv) : setError(inv.status === 'expired' ? 'This duel link has expired.' : 'Someone already accepted this duel.')))
      .catch((e) => setError(e instanceof ApiError ? e.message : "Couldn't open this duel link."));
  }, [live, params.code]);

  const demoChallenger = OPPONENTS.find((o) => o.name === params.from) ?? OPPONENTS[0]!;
  const name = live ? (invite?.from.name ?? '') : demoChallenger.name;
  const levelShown = live ? (invite?.from.level ?? 1) : demoChallenger.level;
  const subject = live ? (invite?.subject ?? '') : (params.subject ?? 'Mathematics');

  if (live && error) {
    return (
      <Screen header={<AppBar onBack={nav.back} backIcon="x" />}>
        <EmptyState mood="sad" title="This duel isn't available" message={`${error} Ask your friend to send a new link.`}>
          <Button title="Start your own duel" onPress={() => nav.replace('DuelHub')} />
        </EmptyState>
      </Screen>
    );
  }
  if (live && !invite) {
    return (
      <Screen scroll={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      footer={
        <>
          <Button
            title="Accept duel"
            icon="swords"
            disabled={live && !app.state.online}
            onPress={() => nav.replace('Matchmaking', live ? { subject, inviteCode: invite!.code } : { subject, inviteFrom: demoChallenger.name })}
          />
          <Button title="Not now" variant="ghost" onPress={nav.back} />
        </>
      }
    >
      <Stack gap={spacing.lg} style={{ alignItems: 'center', paddingTop: spacing.xxl }}>
        <Mascot mood="wow" size={140} />
        <Text variant="overline" color="primary">
          YOU'VE BEEN CHALLENGED
        </Text>
        <Text variant="h1" align="center">
          {name.split(' ')[0] || 'A friend'} wants to duel you!
        </Text>
        <Card style={{ alignSelf: 'stretch' }}>
          <Row gap={spacing.md}>
            <Avatar name={name || 'Friend'} size={56} ring={colors.streak} />
            <View style={{ flex: 1 }}>
              <Text variant="h3">{name || 'A friend'}</Text>
              <Text variant="bodySm" color="textSecondary">
                Level {levelShown} · {subject}
              </Text>
            </View>
          </Row>
          <Row gap={spacing.xs} style={{ marginTop: spacing.md, flexWrap: 'wrap' }}>
            <Tag label={`${DUEL_ROUNDS} questions`} />
            <Tag label={`${DUEL_SECONDS_PER_QUESTION}s each`} icon="clock" />
            <Tag label={`Winner +${XP_RULES.duelWin} XP`} tone="gold" icon="bolt" />
          </Row>
        </Card>
        <Banner tone="info" message="This invite expires 15 minutes after it was sent." />
      </Stack>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* Share cards                                                         */
/* ------------------------------------------------------------------ */

export function ShareCardScreen({ params }: { params: Routes['ShareCard'] }) {
  const nav = useNav();
  const { state, level } = useApp();
  const { width } = useWindowDimensions();
  const { progress, profile } = state;
  const lastBadge = progress.earnedBadges[progress.earnedBadges.length - 1];

  // Real data for every kind: the card passed in, else the student's own
  // progress, else a result computed from the real question bank.
  const cards = useMemo(() => {
    const sampleScore = sampleCbtResult(profile.subjects.find((s) => s !== 'English') ?? 'Physics');
    const correct = sampleScore.questions.filter((q) => sampleScore.answers[q.id] === q.answerKey).length;
    const duel = sampleDuelOutcome(true, profile.subjects[1] ?? 'Mathematics');
    const derived: Record<ShareCardKind, ShareCardData | null> = {
      score: { kind: 'score', percent: scorePercent(correct, sampleScore.questions.length), examBody: 'JAMB', subject: sampleScore.subject },
      streak: progress.streakDays > 0 ? { kind: 'streak', days: progress.streakDays } : null,
      level: { kind: 'level', level: level.level, title: level.title },
      badge: lastBadge ? { kind: 'badge', badgeId: lastBadge } : null,
      duel: { kind: 'duel', opponent: duel.opponent.name, myScore: duel.myScore, theirScore: duel.theirScore, subject: duel.subject },
    };
    if (params?.card) derived[params.card.kind] = params.card;
    return derived;
  }, [params?.card, progress.streakDays, level.level, level.title, lastBadge, profile.subjects]);

  const [kind, setKind] = useState<ShareCardKind>(params?.card?.kind ?? 'score');
  const cardRef = useRef<View>(null);
  const [sharing, setSharing] = useState(false);
  const app = useApp();
  const card = cards[kind];
  // The card's link: the student's own code (friends who join get gems; ambassadors earn too).
  const code = state.referralCode || makeCode(profile.name.length * 31 + 7);
  const link = state.referralCode ? referralLink(state.referralCode) : duelInviteLink(code);
  const message = card ? shareMessage(card, link) : '';
  // Bigger preview on tablets; the exported image is always 1080 wide regardless.
  const cardWidth = Math.min(width >= layout.tabletBreakpoint ? 460 : 340, width - 32);

  return (
    <Screen
      header={<AppBar onBack={nav.back} backIcon="x" title="Share your win" />}
      footer={
        <>
          <Button
            title="Share to WhatsApp Status"
            variant="whatsapp"
            icon="message"
            disabled={!card}
            loading={sharing}
            onPress={async () => {
              setSharing(true);
              const how = await shareImage(cardRef, SHARE_CARD_EXPORT, message, 'Share your win');
              setSharing(false);
              if (how !== 'cancelled') app.reportShare();
            }}
          />
          <Button title="Send to a friend" variant="secondary" icon="share" disabled={!card} onPress={() => void openWhatsApp(message)} />
        </>
      }
    >
      <Stack gap={spacing.lg}>
        {params?.card ? null : (
          <Row gap={spacing.sm} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
            {SHARE_CARD_KINDS.map((t) => (
              <Chip key={t.kind} label={t.label} selected={t.kind === kind} disabled={!cards[t.kind]} onPress={() => setKind(t.kind)} />
            ))}
          </Row>
        )}
        <View style={{ alignItems: 'center' }}>
          {card ? (
            <View ref={cardRef} collapsable={false}>
              <ShareCardView data={card} width={cardWidth} link={link} />
            </View>
          ) : (
            <EmptyState mood="think" title="Nothing to share yet" message="Finish a session to start a streak or earn a badge, then show it off." />
          )}
        </View>
        <Text variant="bodySm" color="textSecondary" align="center">
          Shared as a {SHARE_CARD_EXPORT.width}×{SHARE_CARD_EXPORT.height} image. The caption with your link is copied too — paste it under the
          image so friends can tap through.
        </Text>
      </Stack>
    </Screen>
  );
}

/* ------------------------------------------------------------------ */
/* wa.me friend invite                                                 */
/* ------------------------------------------------------------------ */

export function WaInviteScreen() {
  const nav = useNav();
  const { state } = useApp();
  // One personal code for friend invites and the Ambassador program (src/game/referral.ts).
  const code = state.referralCode || personalCode(state.profile.name, state.profile.email.length + 7);
  const link = referralLink(code);
  const friends = state.ambassador?.referrals ?? [];
  const practising = friends.filter((r) => r.stage !== 'joined').length;
  const message = referralMessage(code, link);
  const [copied, setCopied] = useState(false);

  return (
    <Screen
      header={<AppBar onBack={nav.back} title="Invite friends" />}
      footer={
        <>
          <Button title="Invite on WhatsApp" variant="whatsapp" icon="message" onPress={() => void openWhatsApp(message)} />
          <Button title="Other apps" variant="secondary" icon="share" onPress={() => void Share.share({ message })} />
        </>
      }
    >
      <Stack gap={spacing.lg}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Mascot mood="cheer" size={128} />
          <Text variant="h1" align="center">
            Study is better with friends
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            When a friend joins with your code and finishes their first practice, you both get 100 gems.
          </Text>
        </View>

        <Pressable
          onPress={async () => {
            await Clipboard.setStringAsync(code);
            setCopied(true);
          }}
          accessibilityRole="button"
          accessibilityLabel={`Copy invite code ${code}`}
          style={styles.codeBox}
        >
          <Text variant="overline" color="textSecondary">
            YOUR INVITE CODE
          </Text>
          <Text variant="display" style={{ letterSpacing: 4 }}>
            {code}
          </Text>
          <Row gap={spacing.xs}>
            <Icon name={copied ? 'check' : 'copy'} size={16} color="primary" />
            <Text variant="label" color="primary">
              {copied ? 'Copied!' : 'Tap to copy'}
            </Text>
          </Row>
        </Pressable>

        <View>
          <Text variant="label" style={{ marginBottom: spacing.sm }}>
            Your friends will see
          </Text>
          <View style={styles.bubble}>
            <Text variant="body">{message}</Text>
          </View>
        </View>

        <Card padding="md">
          <Row gap={spacing.lg} style={{ justifyContent: 'space-around' }}>
            {[
              [String(friends.length), 'Joined'],
              [String(practising), 'Practising'],
              [String(practising * AMBASSADOR_RULES.inviteGems), 'Gems earned'],
            ].map(([n, l]) => (
              <View key={l} style={{ alignItems: 'center' }}>
                <Text variant="h2">{n}</Text>
                <Text variant="caption" color="textSecondary">
                  {l.toUpperCase()}
                </Text>
              </View>
            ))}
          </Row>
        </Card>

        <Card onPress={() => nav.push(state.ambassador ? 'Ambassador' : 'AmbassadorIntro')} tone="gold" accessibilityLabel="Ambassador program">
          <Row gap={spacing.md}>
            <Icon name="award" color="textOnGold" />
            <View style={{ flex: 1 }}>
              <Text variant="bodyStrong">{state.ambassador ? 'Your ambassador dashboard' : 'Earn cash with the same code'}</Text>
              <Text variant="bodySm" color="text">
                {state.ambassador
                  ? 'See earnings and withdraw.'
                  : `Ambassadors earn ${Math.round(AMBASSADOR_RULES.commissionRate * 100)}% when friends buy a plan with this code.`}
              </Text>
            </View>
            <Icon name="chevronRight" color="text" />
          </Row>
        </Card>
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  side: { alignItems: 'center', gap: spacing.xs, flex: 1 },
  compare: { marginTop: spacing.lg, gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 2, borderTopColor: colors.border },
  roundRow: { paddingVertical: spacing.sm },
  roundBorder: { borderBottomWidth: 1, borderBottomColor: colors.border },
  bubble: {
    backgroundColor: colors.successSoft,
    borderRadius: radii.lg,
    borderTopLeftRadius: radii.sm,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: colors.successSoftBorder,
  },
  waiting: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  card: { overflow: 'hidden' },
  cta: { backgroundColor: colors.gold },
  codeBox: {
    alignItems: 'center',
    gap: spacing.xs,
    padding: spacing.lg,
    borderRadius: radii.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.primary,
    backgroundColor: colors.primarySoft,
  },
});
