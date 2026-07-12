import { createHash, randomBytes } from "node:crypto";

/** Ambiguous-character-free alphabet for human-enterable pairing codes. */
const PAIRING_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** SCREEN-PAIRING-CODE-1 — short pairing code (architecture target: 6 characters). */
export function generatePairingCode(): string {
  let raw = "";
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    raw += PAIRING_ALPHABET[bytes[i]! % PAIRING_ALPHABET.length];
  }
  return raw;
}

export function normalizePairingCode(code: string): string {
  return code.replace(/[\s-]/g, "").trim().toUpperCase();
}

export function hashPairingCode(code: string): string {
  return createHash("sha256").update(normalizePairingCode(code)).digest("hex");
}

export function isValidPairingCodeFormat(code: string): boolean {
  const normalized = normalizePairingCode(code);
  return /^[A-Z2-9]{6,8}$/.test(normalized);
}
