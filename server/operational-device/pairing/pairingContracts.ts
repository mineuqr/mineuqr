import type { DeviceCredentialInput } from "../domain/deviceContracts";

export type PairingRedeemFailureCode =
  | "pairing_code_invalid"
  | "pairing_code_used"
  | "pairing_code_expired"
  | "device_disabled"
  | "token_revoked";

export const PAIRING_REDEEM_FAILURE_CODES: readonly PairingRedeemFailureCode[] = [
  "pairing_code_invalid",
  "pairing_code_used",
  "pairing_code_expired",
  "device_disabled",
  "token_revoked",
] as const;

export function isPairingRedeemFailureCode(value: string): value is PairingRedeemFailureCode {
  return (PAIRING_REDEEM_FAILURE_CODES as readonly string[]).includes(value);
}

export type PairingRedeemResult =
  | { ok: true; bootstrapCredentials: DeviceCredentialInput }
  | { ok: false; code: PairingRedeemFailureCode };
