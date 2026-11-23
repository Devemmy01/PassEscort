import { getApps, initializeApp, type FirebaseApp } from 'firebase/app';
import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type Auth,
  type User,
} from 'firebase/auth';
import { config } from '../config';
import type { AuthService, AuthUser } from './types';

export function firebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(config.firebase);
}

const toUser = (u: User): AuthUser => ({ uid: u.uid, email: u.email ?? '', emailVerified: u.emailVerified });

/** How each platform obtains a Google credential: a Google ID token (native) or a popup (web). */
export type GoogleFlow = (auth: Auth) => Promise<User | null>;

/** Native: exchange a Google ID token for a Firebase session. */
export async function signInWithGoogleIdToken(auth: Auth, idToken: string): Promise<User> {
  return (await signInWithCredential(auth, GoogleAuthProvider.credential(idToken))).user;
}

/** Firebase Auth (PRD §4) behind the app's AuthService interface. `auth` and the Google flow come from the platform file. */
export function firebaseService(auth: Auth, google: GoogleFlow | null): AuthService {
  return {
    onChange(cb) {
      return onAuthStateChanged(auth, (u) => cb(u ? toUser(u) : null));
    },
    async signUp(email, password, name) {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      if (name) await updateProfile(cred.user, { displayName: name });
      // Verification unlocks the Ambassador program; practice works without it.
      sendEmailVerification(cred.user).catch(() => undefined);
      return toUser(cred.user);
    },
    async signIn(email, password) {
      return toUser((await signInWithEmailAndPassword(auth, email.trim(), password)).user);
    },
    async signInWithGoogle() {
      if (!google) throw Object.assign(new Error('Google sign-in is not configured'), { code: 'google/not-configured' });
      const u = await google(auth);
      return u ? toUser(u) : null;
    },
    googleAvailable: () => Boolean(google),
    async signOut() {
      await signOut(auth);
    },
    async sendPasswordReset(email) {
      await sendPasswordResetEmail(auth, email.trim());
    },
    async getToken() {
      return auth.currentUser ? auth.currentUser.getIdToken() : null;
    },
  };
}
