import { randomBytes, randomInt } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I — readable aloud

/** Cryptographically random code from the readable alphabet (duel invites). */
export function randomCode(length = 6): string {
  const bytes = randomBytes(length);
  let out = "";
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i]! % ALPHABET.length];
  return out;
}

export function randomSeed(): number {
  return randomInt(1, 2 ** 31 - 1);
}

/** Payment / payout references: unique, sortable by time, safe in URLs. */
export function reference(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${randomBytes(6).toString("hex")}`;
}
