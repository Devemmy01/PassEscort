/**
 * Runtime configuration from EXPO_PUBLIC_* variables (see frontend/.env.example).
 *
 * Expo inlines these at build time only when they are written out in full as
 * `process.env.EXPO_PUBLIC_…` — never alias `process.env` or read it with a
 * computed key, or the value silently falls back to the default below.
 *
 * Defaults run the whole app against a local API in dev auth mode — no
 * Firebase project needed on a laptop.
 */
export const config = {
  /** The PassEscort API (backend/). */
  apiUrl: (process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000').replace(/\/$/, ''),
  /** firebase in production builds; dev signs in with "dev:<uid>" tokens against an API in AUTH_MODE=dev. */
  authMode: (process.env.EXPO_PUBLIC_AUTH_MODE === 'firebase' ? 'firebase' : 'dev') as 'firebase' | 'dev',
  firebase: {
    apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
    authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
    projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
    appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
  },
  /** Google sign-in: the Firebase project's *web* OAuth client ID (Firebase console → Authentication → Google). */
  googleWebClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? '',
  /** Host printed on duel/invite links; must match the app's App Links / Universal Links domain. */
  linkHost: (process.env.EXPO_PUBLIC_LINK_HOST ?? 'https://passescort.app').replace(/\/$/, ''),
  /** app.json "scheme" — Paystack's return page sends the browser back here. */
  scheme: 'passescort',
} as const;
