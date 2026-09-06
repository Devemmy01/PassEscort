import path from "path";
import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

let app: App | undefined;

export function getFirebaseAdmin(): App {
  if (!app) {
    const existing = getApps();
    if (existing.length > 0) {
      app = existing[0];
      return app;
    }

    const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH;
    if (!serviceAccountPath) {
      throw new Error("FIREBASE_SERVICE_ACCOUNT_PATH is not set");
    }

    app = initializeApp({
      credential: cert(path.resolve(serviceAccountPath)),
    });
  }

  return app;
}

export function getFirebaseAuth() {
  return getAuth(getFirebaseAdmin());
}
