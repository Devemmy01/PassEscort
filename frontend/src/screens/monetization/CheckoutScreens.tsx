import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Linking, Modal, Pressable, StyleSheet, View } from 'react-native';
import {
  AppBar,
  Banner,
  Button,
  Card,
  Confetti,
  Divider,
  Icon,
  Mascot,
  PopIn,
  Row,
  Screen,
  Sheet,
  Stack,
  Tag,
  Text,
  TextField,
  type IconName,
} from '../../components';
import { isWellFormedCode, normalizeCode } from '../../game/referral';
import { formatNaira, PREMIUM_NAME, PRODUCTS, type ProductId } from '../../game/pricing';
import { useNav } from '../../navigation/Navigator';
import type { Routes } from '../../navigation/routes';
import * as WebBrowser from 'expo-web-browser';
import type { CheckoutResponse, PaymentStatusResponse } from '../../../../shared/api';
import { api, ApiError } from '../../api/client';
import { config } from '../../config';
import { useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';

type Method = 'card' | 'transfer' | 'ussd';
const METHODS: { id: Method; title: string; detail: string; icon: IconName }[] = [
  { id: 'card', title: 'Debit card', detail: 'Verve, Mastercard, Visa', icon: 'card' },
  { id: 'transfer', title: 'Bank transfer', detail: 'Pay from any bank app', icon: 'bank' },
  { id: 'ussd', title: 'USSD', detail: 'No internet banking needed', icon: 'hash' },
];

/**
 * Checkout. Our screen owns the summary, method choice and ambassador code;
 * Paystack's hosted checkout (popup/WebView) owns card entry and OTP, so we
 * never touch card data. After Paystack returns, the server verifies the
 * transaction before the entitlement is granted (PRD §6).
 */
export function CheckoutScreen({ params }: { params: Routes['Checkout'] }) {
  const nav = useNav();
  const app = useApp();
  const { state } = app;
  const live = app.mode === 'live';
  const product = PRODUCTS[params.product];
  const [method, setMethod] = useState<Method>('card');
  const [email, setEmail] = useState(state.profile.email || 'adaeze@example.com');
  // A friend's code from their invite link pre-fills the field.
  const [showCode, setShowCode] = useState(Boolean(state.referredBy));
  const [code, setCode] = useState(state.referredBy ?? '');
  const [codeError, setCodeError] = useState<string | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [hosted, setHosted] = useState(false);
  const [verifying, setVerifying] = useState<null | 'success' | 'failed' | 'pending'>(null);
  const [busy, setBusy] = useState(false);

  /** Live: server transaction → Paystack hosted page → back to the app → server verification. */
  const payLive = async () => {
    setBusy(true);
    setPayError(null);
    setCodeError(null);
    try {
      const co = await api<CheckoutResponse>('POST', '/payments/checkout', {
        product: params.product,
        method: method === 'transfer' ? 'bank_transfer' : method,
        ...(code && isWellFormedCode(code) ? { ambassadorCode: code } : {}),
      });
      await WebBrowser.openAuthSessionAsync(co.authorizationUrl, `${config.scheme}://payment`);
      setVerifying('pending');
      const st = await api<PaymentStatusResponse>('GET', `/payments/${co.reference}`);
      app.applyMe(st.me);
      const status = st.status === 'success' ? 'success' : st.status === 'pending' ? 'pending' : 'failed';
      nav.replace('PaymentResult', { product: params.product, status, reference: co.reference });
    } catch (e) {
      setVerifying(null);
      if (e instanceof ApiError && (e.code === 'unknown_code' || e.code === 'own_code')) {
        setShowCode(true);
        setCodeError(e.message);
      } else setPayError(e instanceof ApiError ? e.message : 'Something went wrong. You have not been charged.');
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (!verifying || live) return;
    const t = setTimeout(() => nav.replace('PaymentResult', { product: params.product, status: verifying }), 1400);
    return () => clearTimeout(t);
  }, [verifying, nav, params.product, live]);

  const finish = (status: 'success' | 'failed' | 'pending') => {
    setHosted(false);
    setVerifying(status);
  };

  return (
    <Screen
      header={<AppBar title="Checkout" onBack={nav.back} />}
      footer={
        <>
          {payError ? <Banner tone="danger" message={payError} /> : null}
          <Button
            title={`Pay ${formatNaira(product.priceNaira)} securely`}
            icon="lock"
            loading={busy}
            disabled={!state.online || (Boolean(code) && !isWellFormedCode(code))}
            onPress={() => (live ? void payLive() : setHosted(true))}
          />
          <Row gap={spacing.xs} style={{ justifyContent: 'center' }}>
            <Icon name="shield" size={16} color="textSecondary" />
            <Text variant="caption" color="textSecondary">
              Payments processed by Paystack. We never see your card details.
            </Text>
          </Row>
        </>
      }
    >
      <Stack gap={spacing.lg}>
        {!state.online ? <Banner tone="offline" title="You're offline" message="Connect to the internet to complete your payment." /> : null}

        <Card>
          <Stack gap={spacing.sm}>
            <Text variant="overline" color="textSecondary">
              ORDER SUMMARY
            </Text>
            <Row style={{ justifyContent: 'space-between' }}>
              <View style={{ flex: 1 }}>
                <Text variant="h3">PassEscort {product.name}</Text>
                <Text variant="bodySm" color="textSecondary">
                  {product.blurb}
                </Text>
              </View>
              <Text variant="h3">{formatNaira(product.priceNaira)}</Text>
            </Row>
            <Divider />
            <Row style={{ justifyContent: 'space-between' }}>
              <Text variant="bodyStrong">Total</Text>
              <Text variant="h2">{formatNaira(product.priceNaira)}</Text>
            </Row>
          </Stack>
        </Card>

        {live ? (
          <Card tone="soft" padding="md">
            <Row gap={spacing.sm}>
              <Icon name="mail" color="primary" />
              <Text variant="bodySm" style={{ flex: 1 }}>
                Your receipt goes to {state.profile.email || 'your account email'}.
              </Text>
            </Row>
          </Card>
        ) : (
          <TextField label="Receipt email" icon="mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
        )}

        <Stack gap={spacing.sm}>
          <Text variant="label">Pay with</Text>
          {METHODS.map((m) => (
            <Card key={m.id} selected={method === m.id} onPress={() => setMethod(m.id)} padding="md" accessibilityLabel={m.title}>
              <Row gap={spacing.md}>
                <View style={styles.methodIcon}>
                  <Icon name={m.icon} color="primary" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text variant="bodyStrong">{m.title}</Text>
                  <Text variant="bodySm" color="textSecondary">
                    {m.detail}
                  </Text>
                </View>
                <View style={[styles.radio, method === m.id ? { borderColor: colors.primary } : null]}>
                  {method === m.id ? <View style={styles.radioDot} /> : null}
                </View>
              </Row>
            </Card>
          ))}
        </Stack>

        {showCode ? (
          <TextField
            label="Ambassador code"
            icon="users"
            value={code}
            onChangeText={(t) => {
              setCode(normalizeCode(t).slice(0, 10));
              setCodeError(null);
            }}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={10}
            error={code.length >= 4 && !isWellFormedCode(code) ? 'Codes are letters and numbers and start with a letter, like ADAEZE7K.' : codeError}
            helper={isWellFormedCode(code) ? `We'll check ${code} when you pay and credit your ambassador.` : 'From the student who referred you.'}
          />
        ) : (
          <Pressable onPress={() => setShowCode(true)} hitSlop={12} accessibilityRole="button">
            <Text variant="label" color="textLink">
              Have an ambassador code?
            </Text>
          </Pressable>
        )}
      </Stack>

      {/* Stand-in for Paystack's hosted checkout. */}
      <Sheet visible={hosted} onClose={() => setHosted(false)} title="Paystack checkout">
        <View style={styles.hostedFrame}>
          <Icon name="externalLink" color="textSecondary" />
          <Text variant="bodyStrong" align="center">
            Hosted by Paystack
          </Text>
          <Text variant="bodySm" color="textSecondary" align="center">
            In the app this is Paystack's secure popup for {METHODS.find((m) => m.id === method)?.title.toLowerCase()} — card entry, OTP or transfer details
            happen there. {formatNaira(product.priceNaira)} · {email}
          </Text>
        </View>
        <Tag label="Prototype: choose an outcome" tone="warning" />
        <Button title="Simulate success" onPress={() => finish('success')} />
        <Button title="Simulate pending transfer" variant="secondary" onPress={() => finish('pending')} />
        <Button title="Simulate failure" variant="ghost" onPress={() => finish('failed')} />
      </Sheet>

      <Modal visible={verifying !== null} transparent animationType="fade" statusBarTranslucent onRequestClose={() => undefined}>
        <View style={styles.verifying}>
          <View style={styles.verifyCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text variant="h3" align="center">
              Confirming your payment…
            </Text>
            <Text variant="bodySm" color="textSecondary" align="center">
              Please don't close the app. This takes a few seconds.
            </Text>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

function receiptRef(product: ProductId): string {
  return `PSK-${product.toUpperCase().replace('-', '')}-${Date.now().toString(36).toUpperCase().slice(-6)}`;
}

const SUPPORT_EMAIL = 'support@passescort.app';

export function PaymentResultScreen({ params }: { params: Routes['PaymentResult'] }) {
  const nav = useNav();
  const app = useApp();
  const product = PRODUCTS[params.product];
  const [status, setStatus] = useState(params.status);
  const [checking, setChecking] = useState(false);
  const [stillPending, setStillPending] = useState(false);
  const granted = useRef(false);
  const live = app.mode === 'live' && Boolean(params.reference);
  const ref = useRef(params.reference ?? receiptRef(params.product)).current;

  // Demo only: grant locally. Live purchases were verified and granted by the server already.
  useEffect(() => {
    if (!live && status === 'success' && !granted.current) {
      granted.current = true;
      app.purchase(params.product);
    }
  }, [status, app, params.product, live]);

  const checkAgain = async () => {
    if (!live) {
      setStatus('success');
      return;
    }
    setChecking(true);
    setStillPending(false);
    try {
      const st = await api<PaymentStatusResponse>('GET', `/payments/${params.reference}`);
      app.applyMe(st.me);
      if (st.status === 'success') setStatus('success');
      else if (st.status === 'pending') setStillPending(true);
      else setStatus('failed');
    } catch {
      setStillPending(true);
    } finally {
      setChecking(false);
    }
  };

  if (status === 'success') {
    const gems = Boolean(product.gems);
    return (
      <Screen
        footer={
          gems ? (
            <Button title="Repair my streak" icon="shield" onPress={() => nav.replace('StreakRepair')} />
          ) : (
            <Button title="Start practising" icon="play" onPress={() => nav.reset('Home')} />
          )
        }
      >
        <Confetti />
        <Stack gap={spacing.lg} style={{ alignItems: 'center', paddingTop: spacing.xxl }}>
          <PopIn>
            <Mascot mood="cheer" size={160} />
          </PopIn>
          <Text variant="h1" align="center">
            {gems ? `+${product.gems} gems added!` : `You're on ${PREMIUM_NAME}! ${product.name} is active`}
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            {gems ? 'Your gems are ready to use.' : 'Unlimited AI explanations and full worked solutions are unlocked.'}
          </Text>
          <Card style={{ alignSelf: 'stretch' }}>
            <Stack gap={spacing.sm}>
              <ReceiptRow label="Item" value={`PassEscort ${product.name}`} />
              <ReceiptRow label="Amount" value={formatNaira(product.priceNaira)} />
              <ReceiptRow label="Reference" value={ref} />
              <ReceiptRow label="Receipt sent to" value={app.state.profile.email || 'your email'} />
            </Stack>
          </Card>
        </Stack>
      </Screen>
    );
  }

  if (status === 'pending') {
    return (
      <Screen
        header={<AppBar onBack={nav.back} title="Bank transfer" />}
        footer={
          <>
            <Button title={live ? 'Check again' : "I've sent the money"} icon={live ? 'refresh' : undefined} loading={checking} onPress={() => void checkAgain()} />
            <Button title="Use another payment method" variant="ghost" onPress={() => nav.replace('Checkout', { product: params.product })} />
          </>
        }
      >
        <Stack gap={spacing.lg} style={{ alignItems: 'center', paddingTop: spacing.lg }}>
          <Mascot mood="think" size={120} />
          <Text variant="h1" align="center">
            {live ? "We haven't received it yet" : 'Waiting for your transfer'}
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            {live
              ? `If you're paying by transfer, send exactly ${formatNaira(product.priceNaira)} to the account Paystack showed you. Your plan unlocks the moment it lands — usually within 2 minutes — even if you close the app.`
              : `Transfer exactly ${formatNaira(product.priceNaira)} to the account below. We'll unlock your plan as soon as it lands — usually within 2 minutes.`}
          </Text>
          {live ? (
            <Card style={{ alignSelf: 'stretch' }}>
              <Stack gap={spacing.sm}>
                <ReceiptRow label="Item" value={`PassEscort ${product.name}`} />
                <ReceiptRow label="Amount" value={formatNaira(product.priceNaira)} />
                <ReceiptRow label="Reference" value={ref} />
              </Stack>
            </Card>
          ) : (
            <>
              <Card style={{ alignSelf: 'stretch' }}>
                <Stack gap={spacing.sm}>
                  <ReceiptRow label="Bank" value="Paystack-Titan" />
                  <ReceiptRow label="Account number" value="99•• ••• 4821" />
                  <ReceiptRow label="Account name" value="PassEscort Checkout" />
                  <ReceiptRow label="Amount" value={formatNaira(product.priceNaira)} />
                </Stack>
              </Card>
              <Tag label="Account expires in 29:41" tone="warning" icon="clock" center />
            </>
          )}
          {stillPending ? <Banner tone="info" message="Still waiting for the bank. We'll unlock your plan automatically when it arrives." /> : null}
        </Stack>
      </Screen>
    );
  }

  return (
    <Screen
      header={<AppBar onBack={nav.back} backIcon="x" />}
      footer={
        <>
          <Button title="Try again" icon="refresh" onPress={() => nav.replace('Checkout', { product: params.product })} />
          <Button
            title="Contact support"
            variant="ghost"
            onPress={() => void Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(`Payment ${ref}`)}`).catch(() => undefined)}
          />
        </>
      }
    >
      <Stack gap={spacing.lg} style={{ alignItems: 'center', paddingTop: spacing.lg }}>
        <Mascot mood="sad" size={140} />
        <Text variant="h1" align="center">
          Payment didn't go through
        </Text>
        <Banner tone="success" message="You have not been charged." />
        <Card style={{ alignSelf: 'stretch' }}>
          <Text variant="label" style={{ marginBottom: spacing.sm }}>
            Common fixes
          </Text>
          <Stack gap={spacing.sm}>
            {['Check your balance or daily card limit', 'Make sure the OTP was entered before it expired', 'Try bank transfer or USSD instead'].map((t) => (
              <Row key={t} gap={spacing.sm}>
                <Icon name="chevronRight" size={18} color="primary" />
                <Text variant="bodySm" style={{ flex: 1 }}>
                  {t}
                </Text>
              </Row>
            ))}
          </Stack>
        </Card>
      </Stack>
    </Screen>
  );
}

function ReceiptRow({ label, value }: { label: string; value: string }) {
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text variant="bodySm" color="textSecondary">
        {label}
      </Text>
      <Text variant="label" style={{ flexShrink: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </Row>
  );
}

const styles = StyleSheet.create({
  methodIcon: { width: 40, height: 40, borderRadius: radii.md, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  radio: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.borderStrong, alignItems: 'center', justifyContent: 'center' },
  radioDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: colors.primary },
  hostedFrame: {
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  verifying: { flex: 1, backgroundColor: colors.overlay, alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  verifyCard: { backgroundColor: colors.surface, borderRadius: radii.xl, padding: spacing.xl, gap: spacing.md, alignItems: 'center', maxWidth: 360 },
});
