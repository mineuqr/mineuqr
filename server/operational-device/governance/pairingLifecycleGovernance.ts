/**
 * SCREEN-PAIRING-CODE-GOVERNANCE-1 — Pairing Code lifecycle rules.
 *
 * Pairing codes are one-time bootstrap material. They never authenticate runtime sessions.
 * Governance ends when permanent credentials are installed; runtime auth is independent.
 */
import type { PairingRedeemFailureCode } from "../pairing/pairingContracts";

export const PAIRING_LIFECYCLE = {
  /** Successful redeem clears activationCodeHash (one-time use). */
  oneTimeRedeem: true,
  /** Issuance currently sets activationCodeExpiresAt to null (no TTL). */
  expiryEnforcedWhenPresent: true,
  invalidation: {
    redeemed: "activationCodeHash cleared after successful redeem",
    regenerated: "previous token revoked with status rotated",
    deleted: "device removed; token lookup fails or device_disabled",
    revoked: "token status revoked",
    disabled: "device status disabled",
    expired: "activationCodeExpiresAt in the past",
  },
} as const;

export type PairingLifecycleInvalidationReason =
  | "redeemed"
  | "regenerated"
  | "deleted"
  | "revoked"
  | "disabled"
  | "expired"
  | "invalid";

/** Maps redeem failure codes to lifecycle invalidation semantics (audit + tests). */
export function pairingFailureToLifecycleReason(
  code: PairingRedeemFailureCode
): PairingLifecycleInvalidationReason {
  switch (code) {
    case "pairing_code_used":
      return "redeemed";
    case "pairing_code_expired":
      return "expired";
    case "token_revoked":
      return "revoked";
    case "device_disabled":
      return "disabled";
    case "pairing_code_invalid":
    default:
      return "invalid";
  }
}
