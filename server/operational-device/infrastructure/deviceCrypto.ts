import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function hashDeviceSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateDeviceSecret(): string {
  return randomBytes(32).toString("base64url");
}

export function verifyDeviceSecret(secret: string, secretHash: string): boolean {
  const candidate = Buffer.from(hashDeviceSecret(secret), "utf8");
  const expected = Buffer.from(secretHash, "utf8");
  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

export function generateDeviceId(): string {
  return `dev_${randomBytes(12).toString("base64url")}`;
}

export function generateDeviceTokenId(): string {
  return `tok_${randomBytes(12).toString("base64url")}`;
}

/** DEVICE-PROVISIONING-UX-2 — short human-enterable activation code (XXXX-XXXX). */
export function generateActivationCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let raw = "";
  const bytes = randomBytes(8);
  for (let i = 0; i < 8; i++) {
    raw += alphabet[bytes[i]! % alphabet.length];
  }
  return `${raw.slice(0, 4)}-${raw.slice(4, 8)}`;
}

export function normalizeActivationCode(code: string): string {
  return code.replace(/[\s-]/g, "").trim().toUpperCase();
}

export function hashActivationCode(code: string): string {
  return createHash("sha256").update(normalizeActivationCode(code)).digest("hex");
}

export function isValidActivationCodeFormat(code: string): boolean {
  const normalized = normalizeActivationCode(code);
  return /^[A-Z2-9]{8}$/.test(normalized);
}
