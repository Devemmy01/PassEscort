import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppBar, Button, Card, Icon, Mascot, Row, Screen, Stack, Tag, Text } from '../../components';
import { MONTHLY_FREE_REPAIRS, PREMIUM_NAME } from '../../game/pricing';
import { formatNaira, perDay, PLAN_FEATURES, PRODUCTS, type PlanFeature } from '../../game/pricing';
import { useNav } from '../../navigation/Navigator';
import type { Routes } from '../../navigation/routes';
import { useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';

const HEADLINES: Record<NonNullable<NonNullable<Routes['Plans']>['reason']> | 'default', { title: string; body: string }> = {
  ai: { title: 'Unlimited AI explanations', body: 'Never get stuck on a question again — every answer, broken down step by step.' },
  streak: { title: 'Protect your streak', body: `${PREMIUM_NAME} Monthly includes ${MONTHLY_FREE_REPAIRS} streak repairs every month, plus everything else.` },
  solutions: { title: 'Full worked solutions', body: 'See every step of every WAEC & NECO theory answer, the way examiners mark it.' },
  default: { title: `Go further with ${PREMIUM_NAME}`, body: 'Everything you need to walk into the exam hall confident.' },
};

function Cell({ value }: { value: string | boolean }) {
  if (value === true) return <Icon name="check" size={20} color="successText" strokeWidth={3} />;
  if (value === false) return <Icon name="minus" size={20} color="textMuted" />;
  return (
    <Text variant="caption" align="center">
      {value}
    </Text>
  );
}

export default function PlansScreen({ params }: { params: Routes['Plans'] }) {
  const nav = useNav();
  const { state } = useApp();
  const [choice, setChoice] = useState<'monthly' | 'day'>('monthly');
  const h = HEADLINES[params?.reason ?? 'default'];
  const monthly = PRODUCTS.monthly;
  const day = PRODUCTS.day;
  const savings = Math.round((1 - perDay(monthly) / day.priceNaira) * 100);
  const selected = PRODUCTS[choice];

  if (state.entitlement.plan !== 'free') {
    return (
      <Screen header={<AppBar onBack={nav.back} backIcon="x" title="Your plan" />}>
        <Stack gap={spacing.lg} style={{ alignItems: 'center', paddingTop: spacing.xl }}>
          <Mascot mood="cheer" size={140} />
          <Text variant="h1" align="center">
            You're on {PREMIUM_NAME} {state.entitlement.plan === 'monthly' ? 'Monthly' : 'Day Pass'}
          </Text>
          <Tag label={state.entitlement.expiresLabel ?? 'Active'} tone="success" icon="check" center />
          <Text variant="body" color="textSecondary" align="center">
            Unlimited AI explanations and full worked solutions are unlocked.
          </Text>
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen
      header={<AppBar onBack={nav.back} backIcon="x" />}
      footer={
        <>
          <Button title={`Continue · ${formatNaira(selected.priceNaira)}`} variant="gold" onPress={() => nav.push('Checkout', { product: choice })} />
          <Text variant="caption" color="textSecondary" align="center">
            Pay by card, bank transfer or USSD via Paystack. Cancel any time.
          </Text>
        </>
      }
    >
      <Stack gap={spacing.lg}>
        <View style={{ alignItems: 'center', gap: spacing.sm }}>
          <Mascot mood="wow" size={112} />
          <Text variant="h1" align="center">
            {h.title}
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            {h.body}
          </Text>
        </View>

        <Card selected={choice === 'monthly'} onPress={() => setChoice('monthly')} accessibilityLabel="Monthly plan">
          <View style={styles.ribbon}>
            <Text variant="caption" color="textOnGold">
              BEST VALUE · SAVE {savings}%
            </Text>
          </View>
          <Row gap={spacing.md}>
            <Radio on={choice === 'monthly'} />
            <View style={{ flex: 1 }}>
              <Text variant="h3">Monthly</Text>
              <Text variant="bodySm" color="textSecondary">
                30 days · just {formatNaira(perDay(monthly))}/day · 2 streak repairs
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="h2">{formatNaira(monthly.priceNaira)}</Text>
              <Text variant="caption" color="textSecondary">
                per month
              </Text>
            </View>
          </Row>
        </Card>

        <Card selected={choice === 'day'} onPress={() => setChoice('day')} accessibilityLabel="Day Pass">
          <Row gap={spacing.md}>
            <Radio on={choice === 'day'} />
            <View style={{ flex: 1 }}>
              <Text variant="h3">Day Pass</Text>
              <Text variant="bodySm" color="textSecondary">
                24 hours of everything — perfect for exam eve
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text variant="h2">{formatNaira(day.priceNaira)}</Text>
              <Text variant="caption" color="textSecondary">
                one-off
              </Text>
            </View>
          </Row>
        </Card>

        <Card padding="md">
          <View style={styles.tableHead}>
            <Text variant="label" style={{ flex: 1.6 }}>
              What you get
            </Text>
            {['Free', 'Day', 'Month'].map((c) => (
              <Text key={c} variant="label" align="center" style={styles.col} color={c === 'Month' ? 'primary' : 'text'}>
                {c}
              </Text>
            ))}
          </View>
          {PLAN_FEATURES.map((f: PlanFeature) => (
            <View key={f.label} style={styles.tableRow}>
              <Text variant="bodySm" style={{ flex: 1.6 }}>
                {f.label}
              </Text>
              <View style={styles.col}>
                <Cell value={f.free} />
              </View>
              <View style={styles.col}>
                <Cell value={f.day} />
              </View>
              <View style={[styles.col, styles.colHighlight]}>
                <Cell value={f.monthly} />
              </View>
            </View>
          ))}
        </Card>
      </Stack>
    </Screen>
  );
}

function Radio({ on }: { on: boolean }) {
  return (
    <View style={[styles.radio, on ? { borderColor: colors.primary } : null]}>
      {on ? <View style={styles.radioDot} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ribbon: {
    position: 'absolute',
    top: -14,
    right: spacing.lg,
    backgroundColor: colors.gold,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radii.pill,
  },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  tableHead: { flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.sm, borderBottomWidth: 2, borderBottomColor: colors.border },
  tableRow: { flexDirection: 'row', alignItems: 'center', minHeight: 48, borderBottomWidth: 1, borderBottomColor: colors.border },
  col: { flex: 1, alignItems: 'center', justifyContent: 'center', alignSelf: 'stretch' },
  colHighlight: { backgroundColor: colors.primarySoft },
});
