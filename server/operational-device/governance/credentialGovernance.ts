/**
 * SCREEN-CREDENTIAL-GOVERNANCE-1 — Credential material separation.
 *
 * Authentication Material (runtime only):
 * - Stored as `secretHash` on operational_device_tokens
 * - Validated exclusively by OperationalDeviceAuthService via verifyDeviceSecret
 * - Never recoverable, never exposed to operators, never derived from recovery material
 *
 * Recovery Material (operator only):
 * - Stored as `secretCiphertext` on operational_device_tokens
 * - Decrypted exclusively by ScreenCredentialRecoveryService
 * - Used only for QR rendering, copy links, installation aids
 * - MUST NEVER participate in runtime authentication or session validation
 *
 * Future developers: importing decryptRecoveryMaterial outside ScreenCredentialRecoveryService
 * is an architecture violation — enforced by regression tests.
 */
export const AUTHENTICATION_MATERIAL_FIELD = "secretHash" as const;
export const RECOVERY_MATERIAL_FIELD = "secretCiphertext" as const;

export const CREDENTIAL_GOVERNANCE = {
  authenticationMaterial: {
    field: AUTHENTICATION_MATERIAL_FIELD,
    owner: "OperationalDeviceAuthService",
    purpose: "runtime authentication only",
    recoverable: false,
    operatorVisible: false,
  },
  recoveryMaterial: {
    field: RECOVERY_MATERIAL_FIELD,
    owner: "ScreenCredentialRecoveryService",
    purpose: "operator QR / installation recovery only",
    authenticates: false,
    validatesSessions: false,
  },
  pairingMaterial: {
    field: "activationCodeHash",
    owner: "ScreenPairingService",
    purpose: "one-time bootstrap into permanent credentials only",
    authenticates: false,
    runtimeCredential: false,
    postRedeemExposure: false,
  },
} as const;
