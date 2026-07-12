import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { ENV } from "../../_core/env";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const TAG_LENGTH = 16;
const KEY_SALT = "operational-device-credential-v1";

function credentialEncryptionKey(): Buffer {
  return createHash("sha256").update(`${ENV.cookieSecret}:${KEY_SALT}`).digest();
}

/** Encrypts authentication plaintext into recovery material at issuance. */
export function encryptDeviceSecret(secret: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, credentialEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString("base64url");
}

/**
 * Decrypts recovery material — SCREEN-CREDENTIAL-GOVERNANCE-1.
 * ONLY ScreenCredentialRecoveryService may call this. Never used for authentication.
 */
export function decryptRecoveryMaterial(ciphertext: string | null | undefined): string | null {
  if (!ciphertext) return null;
  try {
    const buf = Buffer.from(ciphertext, "base64url");
    if (buf.length <= IV_LENGTH + TAG_LENGTH) return null;
    const iv = buf.subarray(0, IV_LENGTH);
    const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH);
    const encrypted = buf.subarray(IV_LENGTH + TAG_LENGTH);
    const decipher = createDecipheriv(ALGORITHM, credentialEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString("utf8");
  } catch {
    return null;
  }
}
