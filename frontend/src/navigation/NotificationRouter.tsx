import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useApp } from '../state/AppState';
import { useNav } from './Navigator';

/** Where a tapped notification takes the student (data.type from the API's services/push.ts callers). */
export function NotificationRouter() {
  const nav = useNav();
  const app = useApp();
  const pending = useRef<Record<string, string> | null>(null);

  const open = (data: Record<string, string>) => {
    switch (data.type) {
      case 'streak':
        nav.goTab('practice');
        break;
      case 'streak-repair':
        nav.push('StreakRepair');
        break;
      case 'duel-invite':
        if (data.code && data.subject) nav.push('Matchmaking', { subject: data.subject, inviteCode: data.code });
        break;
      case 'referral':
        nav.push(app.state.ambassador ? 'Ambassador' : 'WaInvite');
        break;
      case 'payout':
        nav.push('Ambassador');
        break;
    }
  };

  useEffect(() => {
    if (app.mode !== 'live' || Platform.OS === 'web') return;
    const handle = (r: Notifications.NotificationResponse | null) => {
      const data = r?.notification.request.content.data as Record<string, string> | undefined;
      if (!data?.type) return;
      // Cold start: wait until the student is signed in and past the splash.
      pending.current = data;
    };
    Notifications.getLastNotificationResponseAsync()
      .then(handle)
      .catch(() => undefined);
    const sub = Notifications.addNotificationResponseReceivedListener(handle);
    return () => sub.remove();
  }, [app.mode]);

  useEffect(() => {
    if (app.status !== 'signedIn' || !app.state.onboarded) return;
    const id = setInterval(() => {
      if (!pending.current) return;
      const data = pending.current;
      pending.current = null;
      open(data);
    }, 500);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.status, app.state.onboarded]);

  return null;
}
