import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { AppBar, Banner, Button, Mascot, Row, Screen, Stack, StepProgress, Text, TextField } from '../../components';
import { useNav } from '../../navigation/Navigator';
import type { Routes } from '../../navigation/routes';
import type { MeDTO } from '../../../../shared/api';
import { api, ApiError } from '../../api/client';
import { auth, authErrorMessage } from '../../auth';
import { isWellFormedCode, normalizeCode } from '../../game/referral';
import { useApp } from '../../state/AppState';
import { colors, radii, spacing } from '../../theme';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SIMULATED_LATENCY_MS = 900;

function OrDivider() {
  return (
    <Row gap={spacing.md}>
      <View style={styles.line} />
      <Text variant="caption" color="textSecondary">
        OR
      </Text>
      <View style={styles.line} />
    </Row>
  );
}

/** Google sign-in via Firebase Auth. Neutral button; the "G" is set in brand-agnostic type. */
function GoogleButton({ onPress, label }: { onPress: () => void; label: string }) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [styles.google, pressed ? { backgroundColor: colors.surfaceSunken } : null]}
    >
      <View style={styles.gMark}>
        <Text variant="label" color="primary">
          G
        </Text>
      </View>
      <Text variant="button" color="text">
        {label}
      </Text>
    </Pressable>
  );
}

export function SignUpScreen() {
  const nav = useNav();
  const app = useApp();
  const { state, updateProfile } = app;
  const live = app.mode === 'live';
  const [name, setName] = useState(state.profile.name);
  const [email, setEmail] = useState(state.profile.email);
  const [password, setPassword] = useState('');
  const [code, setCode] = useState(app.pendingReferral ?? '');
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string; code?: string }>({});
  const [failure, setFailure] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const finish = (n: string, e: string) => {
    updateProfile({ name: n, email: e });
    nav.push('OnboardMascot');
  };

  /** After the account exists (email or Google): save the onboarding plan, redeem a friend's code. */
  const savePlan = async (n: string | null, e: string) => {
    try {
      // The server creates the profile on first contact; a Google account brings its own name.
      await app.saveProfile({
        ...(n ? { name: n } : {}),
        ...(state.profile.exams.length ? { exams: state.profile.exams } : {}),
        ...(state.profile.subjects.length ? { subjects: state.profile.subjects } : {}),
        dailyMinutes: state.profile.dailyMinutes,
        onboarded: true,
      });
      if (code) {
        await api('POST', '/referrals/redeem', { code }).catch(() => undefined);
        app.setPendingReferral(null);
        await app.refresh();
      }
      finish(n ?? state.profile.name, e);
    } catch {
      setFailure("Your account was created, but we couldn't save your plan. Check your connection and try again.");
    }
  };

  const createLive = async (n: string, e: string) => {
    try {
      await auth().signUp(e, password, n);
    } catch (err) {
      setFailure(authErrorMessage(String((err as { code?: string })?.code ?? '')));
      return;
    }
    await savePlan(n, e);
  };

  const google = async () => {
    setFailure(null);
    setLoading(true);
    try {
      const u = await auth().signInWithGoogle();
      if (u) await savePlan(name.trim() || null, u.email);
    } catch (err) {
      setFailure(authErrorMessage(String((err as { code?: string })?.code ?? '')));
    } finally {
      setLoading(false);
    }
  };

  const submit = () => {
    const next = {
      name: name.trim().length < 2 ? 'Tell us your first name.' : undefined,
      email: EMAIL_RE.test(email.trim()) ? undefined : 'Enter a valid email address.',
      password: password.length < 8 ? 'Use at least 8 characters.' : undefined,
      code: code && !isWellFormedCode(code) ? 'Codes look like ADAEZE7K.' : undefined,
    };
    setErrors(next);
    setFailure(null);
    if (next.name || next.email || next.password || next.code) return;
    setLoading(true);
    if (live) {
      void createLive(name.trim(), email.trim()).finally(() => setLoading(false));
      return;
    }
    setTimeout(() => {
      setLoading(false);
      finish(name.trim(), email.trim());
    }, SIMULATED_LATENCY_MS);
  };

  return (
    <Screen
      header={<AppBar onBack={nav.back} title="Save your plan" right={<View style={{ width: 88 }}><StepProgress step={4} total={4} /></View>} />}
      footer={<Button title="Create account" loading={loading} disabled={!state.online && live} onPress={submit} />}
    >
      <Stack gap={spacing.lg} style={{ paddingTop: spacing.sm }}>
        <Text variant="body" color="textSecondary">
          Create a free account so your XP, streak and progress follow you to any phone.
        </Text>
        {!state.online && live ? <Banner tone="offline" message="Connect to the internet to create your account." /> : null}
        {failure ? <Banner tone="danger" title="Couldn't create your account" message={failure} /> : null}
        {!live || auth().googleAvailable() ? (
          <>
            <GoogleButton label="Continue with Google" onPress={() => (live ? void google() : finish(name || 'Adaeze', email || 'adaeze@gmail.com'))} />
            <OrDivider />
          </>
        ) : null}
        <TextField label="First name" icon="user" value={name} onChangeText={setName} error={errors.name} autoComplete="given-name" textContentType="givenName" />
        <TextField label="Email" icon="mail" value={email} onChangeText={setEmail} error={errors.email} keyboardType="email-address" autoCapitalize="none" autoComplete="email" />
        <TextField label="Password" icon="lock" password value={password} onChangeText={setPassword} error={errors.password} helper="At least 8 characters." autoComplete="new-password" />
        <TextField
          label="Friend's code (optional)"
          icon="users"
          value={code}
          onChangeText={(t) => setCode(normalizeCode(t).slice(0, 10))}
          error={errors.code}
          helper="You both get 100 gems after your first practice."
          autoCapitalize="characters"
          autoCorrect={false}
        />
        <Text variant="bodySm" color="textSecondary" align="center">
          By continuing you agree to our Terms and Privacy Policy.
        </Text>
      </Stack>
    </Screen>
  );
}

export function LoginScreen({ params }: { params: Routes['Login'] }) {
  const nav = useNav();
  const app = useApp();
  const live = app.mode === 'live';
  const [email, setEmail] = useState(params?.error ? 'adaeze@example.com' : '');
  const [password, setPassword] = useState(params?.error ? 'wrongpass' : '');
  const [failed, setFailed] = useState<string | null>(params?.error ? authErrorMessage('auth/invalid-credential') : null);
  const [loading, setLoading] = useState(false);

  const afterSignIn = async () => {
    const me = await api<MeDTO>('GET', '/users/me');
    app.applyMe(me);
    nav.reset(me.profile.onboarded ? 'Home' : 'OnboardExam');
  };

  const submit = async () => {
    setLoading(true);
    if (!live) {
      setTimeout(() => {
        setLoading(false);
        if (password.length < 8 || !EMAIL_RE.test(email)) {
          setFailed(authErrorMessage('auth/invalid-credential'));
          return;
        }
        nav.reset('Home');
      }, SIMULATED_LATENCY_MS);
      return;
    }
    try {
      await auth().signIn(email, password);
      await afterSignIn();
    } catch (err) {
      setFailed(err instanceof ApiError ? err.message : authErrorMessage(String((err as { code?: string })?.code ?? '')));
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setFailed(null);
    setLoading(true);
    try {
      if (await auth().signInWithGoogle()) await afterSignIn();
    } catch (err) {
      setFailed(err instanceof ApiError ? err.message : authErrorMessage(String((err as { code?: string })?.code ?? '')));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen header={<AppBar onBack={nav.back} />} footer={<Button title="Log in" loading={loading} onPress={() => void submit()} disabled={!email || !password} />}>
      <Stack gap={spacing.lg}>
        <View style={{ alignItems: 'center' }}>
          <Mascot mood={failed ? 'think' : 'happy'} size={112} />
          <Text variant="h1" align="center">
            Welcome back!
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            Your streak missed you.
          </Text>
        </View>
        {failed ? <Banner tone="danger" title="Couldn't log you in" message={failed} /> : null}
        {!live || auth().googleAvailable() ? (
          <>
            <GoogleButton label="Log in with Google" onPress={() => (live ? void google() : nav.reset('Home'))} />
            <OrDivider />
          </>
        ) : null}
        <TextField label="Email" icon="mail" value={email} onChangeText={(t) => { setEmail(t); setFailed(null); }} keyboardType="email-address" autoCapitalize="none" invalid={Boolean(failed)} />
        <TextField label="Password" icon="lock" password value={password} onChangeText={(t) => { setPassword(t); setFailed(null); }} invalid={Boolean(failed)} />
        <Pressable onPress={() => nav.push('ForgotPassword')} hitSlop={12} accessibilityRole="link" style={{ alignSelf: 'flex-end' }}>
          <Text variant="label" color="textLink">
            Forgot password?
          </Text>
        </Pressable>
      </Stack>
    </Screen>
  );
}

export function ForgotPasswordScreen() {
  const nav = useNav();
  const app = useApp();
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = EMAIL_RE.test(email.trim());

  const send = async () => {
    setSending(true);
    setError(null);
    try {
      if (app.mode === 'live') await auth().sendPasswordReset(email);
      setSent(true);
    } catch (err) {
      const code = String((err as { code?: string })?.code ?? '');
      // Don't reveal whether an account exists: "user not found" still shows the inbox screen.
      if (code === 'auth/user-not-found') setSent(true);
      else setError(authErrorMessage(code));
    } finally {
      setSending(false);
    }
  };

  if (sent) {
    return (
      <Screen header={<AppBar onBack={nav.back} />} footer={<Button title="Back to log in" onPress={nav.back} />}>
        <Stack gap={spacing.md} style={{ alignItems: 'center', paddingTop: spacing.xxl }}>
          <Mascot mood="cheer" size={140} />
          <Text variant="h1" align="center">
            Check your inbox
          </Text>
          <Text variant="body" color="textSecondary" align="center">
            If an account uses {email.trim()}, we've sent it a reset link. It expires in 1 hour. Check spam if you don't see it.
          </Text>
          <Button title="Resend link" variant="ghost" loading={sending} onPress={() => void send()} />
        </Stack>
      </Screen>
    );
  }
  return (
    <Screen header={<AppBar onBack={nav.back} title="Reset password" />} footer={<Button title="Send reset link" loading={sending} disabled={!valid} onPress={() => void send()} />}>
      <Stack gap={spacing.lg} style={{ paddingTop: spacing.sm }}>
        <Text variant="body" color="textSecondary">
          Enter the email you signed up with and we'll send you a link to set a new password.
        </Text>
        {error ? <Banner tone="danger" message={error} /> : null}
        <TextField label="Email" icon="mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" />
      </Stack>
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { flex: 1, height: 2, backgroundColor: colors.border },
  google: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    borderWidth: 2,
    borderBottomWidth: 5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
  },
  gMark: { width: 28, height: 28, borderRadius: 14, borderWidth: 2, borderColor: colors.primarySoftBorder, alignItems: 'center', justifyContent: 'center' },
});
