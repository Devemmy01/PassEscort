import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { api } from '../api/client';

/**
 * Push notifications (PRD §4: Firebase Cloud Messaging). The app registers an
 * Expo push token; the API sends through Expo's push service, which delivers
 * via the Firebase project's FCM credentials on Android and APNs on iOS.
 * Device-only: simulators, emulators without Play services and web skip it.
 */

// Show notifications while the app is open too (e.g. "your friend accepted the duel").
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
  });
}

/** Android channels — one per opt-out category, so students can also mute them in system settings. */
async function ensureChannels(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync('reminders', { name: 'Streak reminders', importance: Notifications.AndroidImportance.HIGH });
  await Notifications.setNotificationChannelAsync('duels', { name: 'Duels', importance: Notifications.AndroidImportance.HIGH });
  await Notifications.setNotificationChannelAsync('social', { name: 'Friends & earnings', importance: Notifications.AndroidImportance.DEFAULT });
}

function projectId(): string | undefined {
  const extra = Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined;
  return extra?.eas?.projectId ?? Constants.easConfig?.projectId;
}

let lastToken: string | null = null;

export type PushPermission = 'granted' | 'denied' | 'undetermined' | 'unsupported';

export async function pushPermission(): Promise<PushPermission> {
  if (Platform.OS === 'web' || !Device.isDevice) return 'unsupported';
  const { status } = await Notifications.getPermissionsAsync();
  return status === 'granted' ? 'granted' : status === 'denied' ? 'denied' : 'undetermined';
}

/**
 * Register this device with the API. `ask` shows the system prompt if the
 * student hasn't decided yet; without it, only already-granted permission is used.
 */
export async function registerForPush(ask: boolean): Promise<PushPermission> {
  try {
    let permission = await pushPermission();
    if (permission === 'unsupported') return permission;
    if (permission === 'undetermined' && ask) {
      const r = await Notifications.requestPermissionsAsync();
      permission = r.status === 'granted' ? 'granted' : 'denied';
    }
    if (permission !== 'granted') return permission;
    const id = projectId();
    if (!id) {
      console.warn('Push: no EAS project id (set EAS_PROJECT_ID) — skipping registration');
      return 'unsupported';
    }
    await ensureChannels();
    const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId: id });
    lastToken = token;
    await api('POST', '/users/me/push-token', { token, platform: Platform.OS === 'ios' ? 'ios' : 'android' });
    return 'granted';
  } catch (e) {
    console.warn('Push registration failed:', e instanceof Error ? e.message : e);
    return 'unsupported';
  }
}

/** Sign-out: stop notifications for the student who's leaving this phone. */
export async function unregisterPush(): Promise<void> {
  if (!lastToken) return;
  await api('DELETE', '/users/me/push-token', { token: lastToken }).catch(() => undefined);
  lastToken = null;
}
