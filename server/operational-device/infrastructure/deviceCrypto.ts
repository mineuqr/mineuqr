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
