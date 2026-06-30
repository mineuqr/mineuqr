import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function hashConnectorSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateConnectorSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function verifyConnectorSecret(secret: string, secretHash: string): boolean {
  const candidate = Buffer.from(hashConnectorSecret(secret), "utf8");
  const expected = Buffer.from(secretHash, "utf8");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function generateSessionId(): string {
  return randomBytes(16).toString("hex");
}

export function generatePairingToken(): string {
  return randomBytes(12).toString("base64url");
}

export function generateNonce(): string {
  return randomBytes(8).toString("hex");
}
