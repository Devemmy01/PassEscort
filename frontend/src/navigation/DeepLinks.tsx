import * as Linking from 'expo-linking';
import { useEffect, useRef } from 'react';
import { api } from '../api/client';
import { useApp } from '../state/AppState';
import { useNav } from './Navigator';
import { parseDeepLink, type DeepLink } from './linking';

/**
 * Handles links that open the app: duel invites go to the challenge screen
 * (after sign-in if needed); a friend's referral code is kept for sign-up, or
 * redeemed straight away if the student is already signed in.
 */
export function DeepLinks() {
  const nav = useNav();
  const app = useApp();
  const queued = useRef<DeepLink>(null);
  const appRef = useRef(app);
  appRef.current = app;

  const handle = (link: DeepLink) => {
    if (!link) return;
    const a = appRef.current;
    if (link.kind === 'referral') {
      if (a.status === 'signedIn') {
        void api('POST', '/referrals/redeem', { code: link.code })
          .then(() => a.refresh())
          .catch(() => undefined);
      } else a.setPendingReferral(link.code);
      return;
    }
    if (a.status !== 'signedIn') {
      queued.current = link; // open it after sign-in
      return;
    }
    nav.push('DuelInviteReceived', { code: link.code });
  };

  useEffect(() => {
    if (app.mode !== 'live') return;
    Linking.getInitialURL()
      .then((url) => handle(parseDeepLink(url)))
      .catch(() => undefined);
    const sub = Linking.addEventListener('url', ({ url }) => handle(parseDeepLink(url)));
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- subscribe once
  }, [app.mode]);

  // A duel link opened while signed out continues once the student is in.
  useEffect(() => {
    if (app.status === 'signedIn' && app.state.onboarded && queued.current) {
      const link = queued.current;
      queued.current = null;
      handle(link);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [app.status, app.state.onboarded]);

  return null;
}
