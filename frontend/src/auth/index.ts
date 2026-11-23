import { config } from '../config';
import { devAuth } from './devAuth';
import { firebaseAuth } from './firebaseAuth';
import type { AuthService } from './types';

export * from './types';

let service: AuthService | undefined;

/** The configured auth provider (Firebase in production; dev stand-in locally). */
export function auth(): AuthService {
  if (!service) service = config.authMode === 'firebase' ? firebaseAuth() : devAuth;
  return service;
}
