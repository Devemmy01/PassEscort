import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { AppBar, Button, Card, EmptyState, Icon, IconButton, Mascot, Row, Screen, Skeleton, Stack, Tag, Text } from '../../components';
import { PREMIUM_NAME } from '../../game/pricing';
import { FREE_AI_EXPLAINS_PER_DAY, formatNaira, perDay, PRODUCTS } from '../../game/pricing';
import { useNav } from '../../navigation/Navigator';
import type { AiExplainState, Routes } from '../../navigation/routes';
import { buildExplanation, type Explanation } from '../../practice/aiExplain';
import { ApiError } from '../../api/client';
import { questionById } from '../../practice/questions';
import { useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';

function ThinkingDots() {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(v, { toValue: 3, duration: 1200, useNativeDriver: true }));
    loop.start();
    return () => loop.stop();
  }, [v]);
  return (
    <Row gap={6}>
      {[0, 1, 2].map((i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            { opacity: v.interpolate({ inputRange: [0, i, i + 0.5, i + 1, 3], outputRange: [0.3, 0.3, 1, 0.3, 0.3], extrapolate: 'clamp' }) },
          ]}
        />
      ))}
    </Row>
  );
}

export default function AiExplainScreen({ params }: { params: Routes['AiExplain'] }) {
  const nav = useNav();
  const app = useApp();
  const q = questionById(params.questionId);
  // The stored mark-scheme note, shaped like an explanation: step 1 of it is the free preview on the gate.
  const preview = useMemo(() => (q ? buildExplanation(q) : null), [q]);
  const [fetched, setFetched] = useState<Explanation | null>(null);
  const explanation = fetched ?? preview;
  const [helpful, setHelpful] = useState<boolean | null>(null);

  const initial: AiExplainState = params.state ?? (!app.state.online ? 'offline' : app.aiExplainsLeft <= 0 ? 'gate' : 'loading');
  const [phase, setPhase] = useState<AiExplainState>(initial);

  useEffect(() => {
    // `params.state` pins a design state (prototype index); otherwise ask the server.
    if (phase !== 'loading' || params.state === 'loading') return;
    let alive = true;
    const started = Date.now();
    app
      .explain(params.questionId)
      .then(async (r) => {
        // Keep the "thinking" moment readable even when the answer is cached.
        await new Promise((res) => setTimeout(res, Math.max(0, 900 - (Date.now() - started))));
        if (!alive) return;
        setFetched(r.explanation);
        setPhase('explanation');
      })
      .catch((e: unknown) => {
        if (!alive) return;
        if (e instanceof ApiError && e.code === 'ai_quota') setPhase('gate');
        else if (e instanceof ApiError && e.offline) setPhase('offline');
        else setPhase('error');
      });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one request per loading phase
  }, [phase, params.state, params.questionId]);

  if (!q || !explanation) {
    return (
      <Screen header={<AppBar onBack={nav.back} backIcon="x" title="AI Explain" />}>
        <EmptyState mood="sad" title="Question not found" />
      </Screen>
    );
  }

  const correctText = q.options.find((o) => o.key === q.answerKey)?.text;
  const left = app.aiExplainsLeft;

  return (
    <Screen
      header={
        <AppBar
          onBack={nav.back}
          backIcon="x"
          title="AI Explain"
          subtitle={app.hasPremium ? `Unlimited · ${PREMIUM_NAME}` : `${Number.isFinite(left) ? left : FREE_AI_EXPLAINS_PER_DAY} of ${FREE_AI_EXPLAINS_PER_DAY} free left today`}
        />
      }
    >
      <Stack gap={spacing.lg}>
        <Card padding="md">
          <Stack gap={spacing.sm}>
            <Row gap={spacing.xs}>
              <Tag label={`${q.examBody} ${q.year}`} />
              <Tag label={q.subject} tone="primary" />
              <Tag label={q.topic} />
            </Row>
            <Text variant="body" style={{ fontWeight: '600' }}>
              {q.prompt}
            </Text>
          </Stack>
        </Card>

        {phase === 'loading' ? (
          <Stack gap={spacing.md}>
            <Row gap={spacing.md}>
              <Mascot mood="ai" size={72} />
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text variant="h3">Passy is working it out</Text>
                <ThinkingDots />
                <Text variant="caption" color="textSecondary">
                  Usually 3–5 seconds
                </Text>
              </View>
            </Row>
            {[0, 1, 2].map((i) => (
              <Row key={i} gap={spacing.md} style={{ alignItems: 'flex-start' }}>
                <Skeleton width={28} height={28} radius={14} />
                <View style={{ flex: 1, gap: spacing.xs }}>
                  <Skeleton width="45%" height={14} />
                  <Skeleton height={14} />
                  <Skeleton width="70%" height={14} />
                </View>
              </Row>
            ))}
          </Stack>
        ) : null}

        {phase === 'explanation' || phase === 'gate' ? (
          <Stack gap={spacing.md}>
            <Card tone="success" padding="md">
              <Row gap={spacing.sm}>
                <Icon name="check" color="successText" strokeWidth={3} />
                <Text variant="bodyStrong" color="successText" style={{ flex: 1 }}>
                  Answer {q.answerKey}: {correctText}
                </Text>
              </Row>
            </Card>

            {(phase === 'gate' ? explanation.steps.slice(0, 1) : explanation.steps).map((s, i, arr) => (
              <View key={i} style={styles.step}>
                <View style={styles.rail}>
                  <View style={styles.stepNum}>
                    <Text variant="caption" color="textOnPrimary">
                      {i + 1}
                    </Text>
                  </View>
                  {i < arr.length - 1 ? <View style={styles.line} /> : null}
                </View>
                <View style={{ flex: 1, paddingBottom: spacing.md, gap: 2 }}>
                  <Text variant="label">{s.title}</Text>
                  <Text variant="body" color="textSecondary">
                    {s.body}
                  </Text>
                </View>
              </View>
            ))}

            {phase === 'gate' ? (
              <PaywallGate />
            ) : (
              <>
                <Card tone="gold" padding="md">
                  <Row gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
                    <Icon name="sparkles" color="warningText" />
                    <View style={{ flex: 1, gap: 2 }}>
                      <Text variant="overline" color="warningText">
                        KEY IDEA
                      </Text>
                      <Text variant="body">{explanation.keyIdea}</Text>
                    </View>
                  </Row>
                </Card>
                <Card padding="md">
                  <Text variant="label" style={{ marginBottom: spacing.sm }}>
                    Why not the others?
                  </Text>
                  <Stack gap={spacing.sm}>
                    {explanation.distractors.map((d) => (
                      <Row key={d.key} gap={spacing.sm} style={{ alignItems: 'flex-start' }}>
                        <View style={styles.optKey}>
                          <Text variant="caption" color="dangerText">
                            {d.key}
                          </Text>
                        </View>
                        <Text variant="bodySm" color="textSecondary" style={{ flex: 1 }}>
                          {d.reason}
                        </Text>
                      </Row>
                    ))}
                  </Stack>
                </Card>
                <Row style={{ justifyContent: 'space-between' }}>
                  <Text variant="label" color="textSecondary">
                    {helpful === null ? 'Was this helpful?' : 'Thanks — this helps Passy improve.'}
                  </Text>
                  <Row gap={0}>
                    <IconButton icon="thumbsUp" label="Helpful" color={helpful === true ? 'primary' : 'textSecondary'} onPress={() => setHelpful(true)} />
                    <IconButton icon="thumbsDown" label="Not helpful" color={helpful === false ? 'dangerText' : 'textSecondary'} onPress={() => setHelpful(false)} />
                  </Row>
                </Row>
                <Text variant="caption" color="textMuted">
                  Generated by AI from the official answer key. If something looks off, tap 👎 and we'll review it.
                </Text>
                <Button title="Back to question" onPress={nav.back} />
              </>
            )}
          </Stack>
        ) : null}

        {phase === 'offline' ? (
          <EmptyState mood="sleep" title="AI Explain needs internet" message="You're offline. We'll save this question so you can get the full breakdown when you reconnect.">
            {q.explanation ? (
              <Card padding="md">
                <Text variant="overline" color="textSecondary">
                  QUICK ANSWER (SAVED OFFLINE)
                </Text>
                <Text variant="body">{q.explanation}</Text>
              </Card>
            ) : null}
            <Button title="Save to “Explain later”" icon="bookmark" onPress={nav.back} />
            <Button title="Retry" variant="ghost" icon="refresh" onPress={() => setPhase(app.state.online ? 'loading' : 'error')} />
          </EmptyState>
        ) : null}

        {phase === 'error' ? (
          <EmptyState mood="sad" title="Passy couldn't finish that one" message="The explanation service didn't respond. This didn't use up any of your free explanations.">
            <Button title="Try again" icon="refresh" onPress={() => setPhase('loading')} />
          </EmptyState>
        ) : null}
      </Stack>
    </Screen>
  );
}

/** Paywall gate shown after the first step once the free daily quota is used. */
function PaywallGate() {
  const nav = useNav();
  return (
    <Card tone="soft" padding="lg">
      <Stack gap={spacing.md}>
        <Row gap={spacing.md}>
          <Mascot mood="ai" size={72} />
          <View style={{ flex: 1, gap: 2 }}>
            <Row gap={spacing.xs}>
              <Icon name="lock" size={18} color="primary" />
              <Text variant="h3">{FREE_AI_EXPLAINS_PER_DAY} free explanations used</Text>
            </Row>
            <Text variant="bodySm" color="textSecondary">
              Unlock the rest of this breakdown — and every other one — right now.
            </Text>
          </View>
        </Row>
        <Card padding="md" onPress={() => nav.push('Checkout', { product: 'day' })} accessibilityLabel="Buy Day Pass">
          <Row>
            <View style={{ flex: 1 }}>
              <Text variant="label">Day Pass</Text>
              <Text variant="bodySm" color="textSecondary">
                Unlimited for 24 hours
              </Text>
            </View>
            <Text variant="h3">{formatNaira(PRODUCTS.day.priceNaira)}</Text>
          </Row>
        </Card>
        <Card padding="md" selected onPress={() => nav.push('Checkout', { product: 'monthly' })} accessibilityLabel="Buy Monthly">
          <Row>
            <View style={{ flex: 1 }}>
              <Row gap={spacing.xs}>
                <Text variant="label">Monthly</Text>
                <Tag label="Best value" tone="gold" />
              </Row>
              <Text variant="bodySm" color="textSecondary">
                About {formatNaira(perDay(PRODUCTS.monthly))}/day
              </Text>
            </View>
            <Text variant="h3">{formatNaira(PRODUCTS.monthly.priceNaira)}</Text>
          </Row>
        </Card>
        <Button title="Compare plans" variant="ghost" onPress={() => nav.push('Plans', { reason: 'ai' })} />
        <Text variant="caption" color="textSecondary" align="center">
          Or come back tomorrow — free explanations reset at midnight.
        </Text>
      </Stack>
    </Card>
  );
}

const styles = StyleSheet.create({
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary },
  step: { flexDirection: 'row', gap: spacing.md },
  rail: { alignItems: 'center', width: 28 },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  line: { flex: 1, width: 2, backgroundColor: colors.primarySoftBorder, marginTop: 2 },
  optKey: { width: 24, height: 24, borderRadius: radii.sm, backgroundColor: colors.dangerSoft, alignItems: 'center', justifyContent: 'center' },
});
