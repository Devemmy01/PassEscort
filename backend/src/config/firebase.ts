import path from "path";
import { cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { env } from "./env";

let app: App | undefined;

/** Firebase Admin, from FIREBASE_SERVICE_ACCOUNT_JSON (inline, for hosts without files) or _PATH. */
export function getFirebaseAdmin(): App {
  if (app) return app;
  const existing = getApps();
  if (existing.length > 0) return (app = existing[0]!);
  const { FIREBASE_SERVICE_ACCOUNT_JSON, FIREBASE_SERVICE_ACCOUNT_PATH } = env();
  const credential = FIREBASE_SERVICE_ACCOUNT_JSON
    ? cert(JSON.parse(FIREBASE_SERVICE_ACCOUNT_JSON))
    : cert(path.resolve(FIREBASE_SERVICE_ACCOUNT_PATH ?? ""));
  return (app = initializeApp({ credential }));
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseAdmin());
}
