import type {
  CreateOperationalDeviceInput,
  OperationalDeviceRecord,
  OperationalDeviceTokenRecord,
} from "../domain/deviceContracts";

export type OperationalDeviceStore = {
  createDevice(input: CreateOperationalDeviceInput & { deviceId: string; now: string }): Promise<OperationalDeviceRecord>;
  getDevice(deviceId: string): Promise<OperationalDeviceRecord | null>;
  listDevicesByRestaurant(restaurantId: number): Promise<OperationalDeviceRecord[]>;
  updateDeviceStatus(deviceId: string, status: "active" | "disabled", now: string): Promise<boolean>;
  touchDeviceHeartbeat(
    deviceId: string,
    input: { lastSeenAt: string; reportedVersion?: string | null }
  ): Promise<void>;
  saveToken(record: OperationalDeviceTokenRecord): Promise<void>;
  getToken(tokenId: string): Promise<OperationalDeviceTokenRecord | null>;
  findActiveTokenForDevice(deviceId: string): Promise<OperationalDeviceTokenRecord | null>;
  listTokensForDevice(deviceId: string): Promise<OperationalDeviceTokenRecord[]>;
  revokeToken(tokenId: string, revokedAt: string, status: "revoked" | "rotated"): Promise<boolean>;
  revokeAllActiveTokens(deviceId: string, revokedAt: string, status: "revoked" | "rotated"): Promise<number>;
  touchTokenUsage(tokenId: string, lastUsedAt: string): Promise<void>;
  findTokenByActivationCodeHash(hash: string): Promise<OperationalDeviceTokenRecord | null>;
  consumeActivationCode(tokenId: string): Promise<void>;
  updateTokenSecret(tokenId: string, secretHash: string, now: string): Promise<void>;
  updateScreenPresentation(
    deviceId: string,
    input: { displayName?: string; screenConfig?: import("../domain/screenConfig").OperationalScreenConfig; now: string }
  ): Promise<boolean>;
};
