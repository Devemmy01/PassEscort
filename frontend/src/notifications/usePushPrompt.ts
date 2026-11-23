import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
import { useApp } from '../state/AppState';
import { pushPermission } from './push';

const DISMISSED = 'pushPrompt.dismissed.v1';

/**
 * Soft prompt before the system dialog: offered once the student has finished
 * a session (they know what a streak is worth), never on first launch, and
 * never again after "Not now" — Settings can still turn notifications on.
 */
export function usePushPrompt(): { show: boolean; accept: () => Promise<void>; dismiss: () => void } {
  const app = useApp();
  const [show, setShow] = useState(false);
  const eligible = app.mode === 'live' && app.status === 'signedIn' && app.state.progress.sessionsCompleted >= 1;

  useEffect(() => {
    if (!eligible) return;
    let alive = true;
    Promise.all([pushPermission(), AsyncStorage.getItem(DISMISSED)])
      .then(([p, dismissed]) => alive && setShow(p === 'undetermined' && !dismissed))
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [eligible]);

  const dismiss = () => {
    setShow(false);
    AsyncStorage.setItem(DISMISSED, '1').catch(() => undefined);
  };
  return {
    show,
    dismiss,
    accept: async () => {
      setShow(false);
      await app.enablePush();
      AsyncStorage.setItem(DISMISSED, '1').catch(() => undefined);
    },
  };
}
