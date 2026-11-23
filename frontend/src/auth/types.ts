export interface AuthUser {
  uid: string;
  email: string;
  emailVerified: boolean;
}

/** What the app needs from an auth provider (Firebase in production, a local stand-in for development). */
export interface AuthService {
  /** Calls back with the current user now and on every change; returns an unsubscribe. */
  onChange(cb: (user: AuthUser | null) => void): () => void;
  signUp(email: string, password: string, name: string): Promise<AuthUser>;
  signIn(email: string, password: string): Promise<AuthUser>;
  /** Google account via Firebase. Resolves null if the student closed the Google sheet. */
  signInWithGoogle(): Promise<AuthUser | null>;
  /** Whether Google sign-in is set up for this build. */
  googleAvailable(): boolean;
  signOut(): Promise<void>;
  sendPasswordReset(email: string): Promise<void>;
  /** A fresh bearer token for the API, or null when signed out. */
  getToken(): Promise<string | null>;
}

/** Human messages for the errors students actually hit. Never says which field was wrong on sign-in. */
export function authErrorMessage(code: string): string {
  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return "That email and password don't match. Check them and try again.";
    case 'auth/email-already-in-use':
      return 'An account already uses this email. Log in instead.';
    case 'auth/weak-password':
      return 'Use at least 8 characters for your password.';
    case 'auth/too-many-requests':
      return 'Too many tries. Wait a minute, then try again.';
    case 'auth/network-request-failed':
      return "You're offline. Connect to the internet to sign in.";
    case 'auth/account-exists-with-different-credential':
      return 'This email already has a password account. Log in with your email and password.';
    case 'google/play-services':
      return 'Google sign-in needs Google Play services. Use your email instead.';
    case 'auth/popup-blocked':
      return 'Your browser blocked the Google window. Allow pop-ups and try again.';
    default:
      return 'Something went wrong. Please try again.';
  }
}
