import type {
  OperationalDeviceRole,
  OperationalDeviceStatus,
  OperationalDeviceTokenStatus,
} from "./deviceRoles";
import type { OperationalScreenConfig } from "./screenConfig";
import { DEFAULT_SCREEN_CONFIG } from "./screenConfig";

export type OperationalDeviceRecord = {
  deviceId: string;
  restaurantId: number;
  branchId: number | null;
  role: OperationalDeviceRole;
  displayName: string;
  screenConfig: OperationalScreenConfig;
  status: OperationalDeviceStatus;
  reportedVersion: string | null;
  lastSeenAt: string | null;
  screenConfigRevision: number;
  createdAt: string;
  updatedAt: string;
};

export type OperationalDeviceTokenRecord = {
  tokenId: string;
  deviceId: string;
  secretHash: string;
  /** Recovery material — operator QR only; never used for authentication. */
  secretCiphertext: string | null;
  status: OperationalDeviceTokenStatus;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  activationCodeHash: string | null;
  activationCodeExpiresAt: string | null;
};

export type OperationalDeviceSession = {
  deviceId: string;
  tokenId: string;
  restaurantId: number;
  branchId: number | null;
  role: OperationalDeviceRole;
  displayName: string;
};

export type CreateOperationalDeviceInput = {
  restaurantId: number;
  branchId?: number | null;
  role: OperationalDeviceRole;
  displayName: string;
};

export type IssuedOperationalDeviceToken = {
  tokenId: string;
  secret: string;
  deviceId: string;
  issuedAt: string;
  expiresAt: string | null;
  /** One-time bootstrap voucher — operator-facing; not an authentication credential. */
  pairingCode: string;
};

export type OperationalDeviceListItem = OperationalDeviceRecord & {
  presence: "online" | "offline" | "never_seen";
  hasActiveToken: boolean;
};

/** @deprecated v1 — missing tokenId; clients MUST reject or require supplemental tokenId input. */
export type DeviceQrPayload = {
  v: 1;
  deviceId: string;
  token: string;
  restaurantId: number;
  branchId: number | null;
  role: OperationalDeviceRole;
};

/** PAIRING-CONTRACT-1 v2 — canonical operational screen pairing payload. */
export type OperationalScreenPairingPayload = {
  mineuqr: "operational-screen-pairing";
  v: 2;
  deviceId: string;
  tokenId: string;
  secret: string;
  restaurantId?: number;
  branchId?: number | null;
  role?: OperationalDeviceRole;
  displayName?: string;
  issuedAt?: string;
};

export { DEFAULT_SCREEN_CONFIG };
export type { OperationalScreenConfig, UpdateScreenSettingsInput } from "./screenConfig";

export type DeviceCredentialInput = {
  deviceId: string;
  tokenId: string;
  secret: string;
};

export type DeviceAuthenticateResult =
  | { ok: true; session: OperationalDeviceSession; bootstrapCredentials?: DeviceCredentialInput }
  | {
      ok: false;
      code:
        | "invalid_credentials"
        | "device_disabled"
        | "token_revoked"
        | "token_expired"
        | "activation_code_invalid"
        | "activation_code_expired"
        | "activation_code_used";
    };
