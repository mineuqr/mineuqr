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
  createdAt: string;
  updatedAt: string;
};

export type OperationalDeviceTokenRecord = {
  tokenId: string;
  deviceId: string;
  secretHash: string;
  status: OperationalDeviceTokenStatus;
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
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
};

export type OperationalDeviceListItem = OperationalDeviceRecord & {
  presence: "online" | "offline" | "never_seen";
  hasActiveToken: boolean;
};

export type DeviceQrPayload = {
  v: 1;
  deviceId: string;
  token: string;
  restaurantId: number;
  branchId: number | null;
  role: OperationalDeviceRole;
};

export { DEFAULT_SCREEN_CONFIG };
export type { OperationalScreenConfig, UpdateScreenSettingsInput } from "./screenConfig";

export type DeviceAuthenticateResult =
  | { ok: true; session: OperationalDeviceSession }
  | { ok: false; code: "invalid_credentials" | "device_disabled" | "token_revoked" | "token_expired" };
