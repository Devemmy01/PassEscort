import type { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { getFirebaseAuth } from "../config/firebase";
import { HttpError } from "../lib/http";

export interface AuthIdentity {
  uid: string;
  email: string;
  emailVerified: boolean;
  name?: string;
}

export interface AuthedRequest extends Request {
  user?: AuthIdentity;
}

/**
 * Turns a bearer token into an identity.
 * - firebase: a Firebase ID token, verified with the Admin SDK.
 * - dev (never in production — see config/env): "dev:<uid>" or "dev:<uid>:<email>",
 *   so the app and the tests run without a Firebase project.
 */
export async function verifyToken(token: string): Promise<AuthIdentity> {
  if (env().AUTH_MODE === "dev") {
    const m = /^dev:([A-Za-z0-9_-]{1,64})(?::(.+))?$/.exec(token);
    if (!m) throw new HttpError(401, "invalid_token", "Invalid dev token");
    return { uid: m[1]!, email: m[2] ?? `${m[1]}@dev.passescort.app`, emailVerified: true };
  }
  try {
    const d = await getFirebaseAuth().verifyIdToken(token);
    return { uid: d.uid, email: d.email ?? "", emailVerified: Boolean(d.email_verified), name: d.name };
  } catch {
    throw new HttpError(401, "invalid_token", "Invalid or expired token");
  }
}

export async function requireAuth(req: AuthedRequest, _res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) throw new HttpError(401, "missing_token", "Missing bearer token");
  req.user = await verifyToken(header.slice("Bearer ".length));
  next();
}

export function identity(req: AuthedRequest): AuthIdentity {
  if (!req.user) throw new HttpError(401, "missing_token", "Not signed in");
  return req.user;
}
