import Constants from 'expo-constants';
import { useCallback, useEffect, useState } from 'react';
import { Linking, View } from 'react-native';
import type { NotifyPrefs } from '../../../../shared/api';
import { AppBar, Banner, Button, Card, Dialog, Divider, ListItem, Screen, SectionHeader, Stack, Text, Toggle } from '../../components';
import { useNav } from '../../navigation/Navigator';
import { pushPermission, type PushPermission } from '../../notifications/push';
import { useApp } from '../../state/AppState';
import { spacing } from '../../theme';

const CATEGORIES: { key: keyof NotifyPrefs; title: string; subtitle: string }[] = [
  { key: 'reminders', title: 'Streak reminders', subtitle: 'At 6 pm if today’s practice is still to do' },
  { key: 'duels', title: 'Duel invites', subtitle: 'When a friend opens your duel link' },
  { key: 'social', title: 'Friends & earnings', subtitle: 'Friends joining with your code, ambassador payouts' },
];

/** Settings: notification permission + per-category opt-outs (PATCH /users/me), account. */
export function SettingsScreen() {
  const nav = useNav();
  const app = useApp();
  const live = app.mode === 'live';
  const [permission, setPermission] = useState<PushPermission>('unsupported');
  const [saving, setSaving] = useState<keyof NotifyPrefs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unsynced, setUnsynced] = useState(0);
  const prefs = app.state.profile.notify;

  const check = useCallback(() => {
    if (!live) return;
    pushPermission()
      .then(setPermission)
      .catch(() => setPermission('unsupported'));
  }, [live]);
  useEffect(check, [check]);

  const toggle = async (key: keyof NotifyPrefs, value: boolean) => {
    const next = { ...prefs, [key]: value };
    setError(null);
    if (!live) {
      app.updateProfile({ notify: next });
      return;
    }
    setSaving(key);
    try {
      await app.saveProfile({ notify: next });
    } catch {
      setError('Couldn’t save that — check your connection and try again.');
    } finally {
      setSaving(null);
    }
  };

  const enable = async () => {
    setPermission(await app.enablePush());
  };

  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <Screen header={<AppBar title="Settings" onBack={nav.back} />}>
      <Stack gap={spacing.lg}>
        <SectionHeader title="Notifications" />
        {live && permission === 'undetermined' ? (
          <Banner tone="primary" icon="bell" title="Notifications are off" message="Turn them on so a busy day doesn’t cost you your streak." action="Turn on" onAction={enable} />
        ) : null}
        {live && permission === 'denied' ? (
          <Banner
            tone="warning"
            icon="bell"
            title="Blocked in your phone’s settings"
            message="PassEscort can’t send reminders until you allow notifications."
            action="Open settings"
            onAction={() => void Linking.openSettings().finally(check)}
          />
        ) : null}
        {error ? <Banner tone="danger" message={error} /> : null}
        <Card padding="sm">
          {CATEGORIES.map((c, i) => (
            <View key={c.key}>
              {i > 0 ? <Divider /> : null}
              <ListItem
                icon={c.key === 'reminders' ? 'flame' : c.key === 'duels' ? 'swords' : 'users'}
                title={c.title}
                subtitle={c.subtitle}
                right={<Toggle label={c.title} value={prefs[c.key]} disabled={saving !== null} onChange={(v) => void toggle(c.key, v)} />}
              />
            </View>
          ))}
        </Card>
        {live && permission === 'unsupported' ? (
          <Text variant="bodySm" color="textSecondary">
            Push notifications work in the PassEscort app on your phone. Your choices here are saved to your account.
          </Text>
        ) : null}

        <SectionHeader title="Account" />
        <Card padding="sm">
          <ListItem icon="pencil" title="Edit exams & subjects" onPress={() => nav.push('OnboardExam')} />
          <Divider />
          <ListItem icon="calendar" title="Streak calendar" subtitle="Every day you’ve practised" onPress={() => nav.push('StreakCalendar')} />
          {live ? (
            <>
              <Divider />
              <ListItem
                icon="logOut"
                iconColor="dangerText"
                title="Sign out"
                subtitle={app.state.profile.email}
                onPress={async () => {
                  const r = await app.signOut();
                  if (r.unsynced > 0) setUnsynced(r.unsynced);
                  else nav.reset('Welcome');
                }}
              />
            </>
          ) : null}
        </Card>
        <Text variant="caption" color="textMuted" align="center">
          PassEscort {version}
        </Text>
      </Stack>
      <Dialog visible={unsynced > 0} onClose={() => setUnsynced(0)}>
        <Text variant="h2">Not yet — some answers haven't synced</Text>
        <Text color="textSecondary">
          {unsynced} answer{unsynced === 1 ? '' : 's'} from offline practice {unsynced === 1 ? "hasn't" : "haven't"} reached PassEscort yet. Connect to the internet so your XP
          and streak are saved, then sign out.
        </Text>
        <Button title="OK" onPress={() => setUnsynced(0)} />
      </Dialog>
    </Screen>
  );
}
