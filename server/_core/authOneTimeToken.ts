/**
 * One-time auth link tokens (password reset, email verification).
 * Pure lifecycle helpers — no HTTP or DB (AUTH2-D.2).
 */

import { newToken, tokenToHash } from "./authTokenUtils";

/** Minimum plaintext length accepted before hashing (links are 64-char hex). */
export const ONE_TIME_TOKEN_MIN_LENGTH = 20;

/** DB `auth_tokens.type` values — do not rename (schema enum). */
export type AuthOneTimeTokenPurpose = "password_reset" | "email_verify";

export const AUTH_ONE_TIME_TOKEN_PURPOSE = {
  passwordReset: "password_reset",
  emailVerification: "email_verify",
} as const satisfies Record<string, AuthOneTimeTokenPurpose>;

export const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
export const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export type AuthOneTimeTokenRow = {
  id: number;
  userId: number;
  expiresAt: string;
  usedAt: string | null;
};

export type AuthOneTimeTokenStatus = "missing" | "consumed" | "expired" | "valid";

/** POST body tokens: trim whitespace before length check (reset-password). */
export function isPlausibleOneTimeTokenFromBody(value: unknown): value is string {
  return typeof value === "string" && value.trim().length >= ONE_TIME_TOKEN_MIN_LENGTH;
}

/** Query tokens: no trim (verify-email GET). */
export function isPlausibleOneTimeTokenFromQuery(value: string): boolean {
  return value.length >= ONE_TIME_TOKEN_MIN_LENGTH;
}

export function authTokenExpiresAtIso(ttlMs: number, nowMs: number = Date.now()): string {
  return new Date(nowMs + ttlMs).toISOString();
}

export function isAuthTokenExpired(expiresAt: string, nowMs: number = Date.now()): boolean {
  return new Date(expiresAt).getTime() <= nowMs;
}

export function classifyAuthOneTimeToken(
  row: AuthOneTimeTokenRow | null | undefined,
  nowMs: number = Date.now()
): AuthOneTimeTokenStatus {
  if (!row) return "missing";
  if (row.usedAt) return "consumed";
  if (isAuthTokenExpired(row.expiresAt, nowMs)) return "expired";
  return "valid";
}

/** Issue plaintext token + stored hash + ISO expiry for `auth_tokens` insert. */
export function issueAuthOneTimeToken(ttlMs: number, nowMs: number = Date.now()) {
  const plaintextToken = newToken();
  return {
    plaintextToken,
    tokenHash: tokenToHash(plaintextToken),
    expiresAt: authTokenExpiresAtIso(ttlMs, nowMs),
  };
}
