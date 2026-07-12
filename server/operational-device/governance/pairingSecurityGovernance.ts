/**
 * SCREEN-PAIRING-CODE-GOVERNANCE-1 — Pairing security invariants.
 *
 * Pairing codes bootstrap permanent credentials only. They must never:
 * - authenticate runtime sessions
 * - appear in Authorization headers
 * - be stored as the runtime credential on the client after pairing completes
 */
export const PAIRING_SECURITY = {
  runtimeAuthHeaderPrefix: "Device ",
  pairingCodeNeverInAuthorization: true,
  pairingCodeNeverStoredAsCredential: true,
  pairingCodeNeverExposedAfterRedeem: true,
  runtimeAuthUsesSecretHashOnly: true,
} as const;

export const PAIRING_REDEEM_PROCEDURE = "operationalDevice.runtime.redeemPairingCode" as const;
export const RUNTIME_AUTH_PROCEDURE = "operationalDevice.runtime.authenticate" as const;
