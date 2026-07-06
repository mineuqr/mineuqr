/** Operational device credential authentication failure codes (PAIRING-CONTRACT-1). */
export type DeviceAuthFailureCode =
  | "invalid_credentials"
  | "device_disabled"
  | "token_revoked"
  | "token_expired";

export const DEVICE_AUTH_FAILURE_CODES: readonly DeviceAuthFailureCode[] = [
  "invalid_credentials",
  "device_disabled",
  "token_revoked",
  "token_expired",
] as const;

export function isDeviceAuthFailureCode(value: string): value is DeviceAuthFailureCode {
  return (DEVICE_AUTH_FAILURE_CODES as readonly string[]).includes(value);
}
