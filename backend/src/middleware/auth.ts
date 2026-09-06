import type { NextFunction, Request, Response } from "express";
import { getFirebaseAuth } from "../config/firebase";

export interface AuthedRequest extends Request {
  user?: {
    uid: string;
    email?: string;
  };
}

export async function requireAuth(
  req: AuthedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing bearer token" });
    return;
  }

  const idToken = header.slice("Bearer ".length);

  try {
    const decoded = await getFirebaseAuth().verifyIdToken(idToken);
    req.user = { uid: decoded.uid, email: decoded.email };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
