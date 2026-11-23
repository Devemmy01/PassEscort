import AsyncStorage from '@react-native-async-storage/async-storage';
import type { AuthService, AuthUser } from './types';

/**
 * Local development stand-in for Firebase (EXPO_PUBLIC_AUTH_MODE=dev, API in
 * AUTH_MODE=dev). The email becomes the user id and any password of 8+
 * characters works. Production builds use Firebase (config.authMode).
 */
const KEY = 'devAuth.user.v1';
let current: AuthUser | null = null;
let loaded = false;
const listeners = new Set<(u: AuthUser | null) => void>();

const uidFor = (email: string) => email.trim().toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 60);

async function set(user: AuthUser | null) {
  current = user;
  if (user) await AsyncStorage.setItem(KEY, JSON.stringify(user));
  else await AsyncStorage.removeItem(KEY);
  listeners.forEach((l) => l(user));
}

function login(email: string, password: string): AuthUser {
  if (!/^\S+@\S+\.\S+$/.test(email)) throw Object.assign(new Error('bad email'), { code: 'auth/invalid-email' });
  if (password.length < 8) throw Object.assign(new Error('weak'), { code: 'auth/weak-password' });
  return { uid: uidFor(email), email: email.trim().toLowerCase(), emailVerified: true };
}

export const devAuth: AuthService = {
  onChange(cb) {
    listeners.add(cb);
    if (loaded) cb(current);
    else
      AsyncStorage.getItem(KEY)
        .then((raw) => {
          loaded = true;
          current = raw ? (JSON.parse(raw) as AuthUser) : null;
          cb(current);
        })
        .catch(() => {
          loaded = true;
          cb(null);
        });
    return () => listeners.delete(cb);
  },
  async signUp(email, password) {
    const u = login(email, password);
    await set(u);
    return u;
  },
  async signIn(email, password) {
    const u = login(email, password);
    await set(u);
    return u;
  },
  /** Dev stand-in for Google: a fixed test account, so the flow can be clicked through without a Firebase project. */
  async signInWithGoogle() {
    const u: AuthUser = { uid: 'google_dev_student', email: 'google.student@dev.passescort.app', emailVerified: true };
    await set(u);
    return u;
  },
  googleAvailable: () => true,
  async signOut() {
    await set(null);
  },
  async sendPasswordReset() {
    /* nothing to send locally */
  },
  async getToken() {
    return current ? `dev:${current.uid}:${current.email}` : null;
  },
};
