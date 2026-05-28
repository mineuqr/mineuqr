import { createHash, randomBytes } from "crypto";

/** SHA-256 hex digest for storing auth tokens at rest (password reset, email verify). */
export function tokenToHash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** 32 random bytes as hex (64 chars) for one-time auth links. */
export function newToken(): string {
  return randomBytes(32).toString("hex");
}
