/** PAIRING-CONTRACT-1 — client-side pairing payload validation. */

import type { OperationalScreenCredentials } from "./credentialStore";

const DEVICE_ID_PATTERN = /^dev_[A-Za-z0-9_-]+$/;
const TOKEN_ID_PATTERN = /^tok_[A-Za-z0-9_-]+$/;

export type PairingPayloadParseResult =
  | { ok: true; credentials: Pick<OperationalScreenCredentials, "deviceId" | "tokenId" | "secret"> }
  | { ok: false; code: "invalid_json" | "unsupported_version" | "missing_fields" | "invalid_protocol" };

export function parsePairingPayload(raw: string): PairingPayloadParseResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw.trim());
  } catch {
    return { ok: false, code: "invalid_json" };
  }

  if (!parsed || typeof parsed !== "object") {
    return { ok: false, code: "invalid_json" };
  }

  const value = parsed as Record<string, unknown>;

  if (value.mineuqr !== "operational-screen-pairing") {
    if (value.v === 1) {
      return { ok: false, code: "unsupported_version" };
    }
    return { ok: false, code: "invalid_protocol" };
  }

  if (value.v !== 2) {
    return { ok: false, code: "unsupported_version" };
  }

  const deviceId = value.deviceId;
  const tokenId = value.tokenId;
  const secret = value.secret;

  if (
    typeof deviceId !== "string" ||
    typeof tokenId !== "string" ||
    typeof secret !== "string" ||
    !DEVICE_ID_PATTERN.test(deviceId) ||
    !TOKEN_ID_PATTERN.test(tokenId) ||
    secret.length < 16 ||
    secret.length > 256
  ) {
    return { ok: false, code: "missing_fields" };
  }

  return { ok: true, credentials: { deviceId, tokenId, secret } };
}

export function parseManualCredentials(input: {
  deviceId: string;
  tokenId: string;
  secret: string;
}): PairingPayloadParseResult {
  const deviceId = input.deviceId.trim();
  const tokenId = input.tokenId.trim();
  const secret = input.secret.trim();

  if (
    !DEVICE_ID_PATTERN.test(deviceId) ||
    !TOKEN_ID_PATTERN.test(tokenId) ||
    secret.length < 16 ||
    secret.length > 256
  ) {
    return { ok: false, code: "missing_fields" };
  }

  return { ok: true, credentials: { deviceId, tokenId, secret } };
}
