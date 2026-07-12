import type {
  CreateOperationalDeviceInput,
  OperationalDeviceRecord,
  OperationalDeviceTokenRecord,
} from "../domain/deviceContracts";
import { DEFAULT_SCREEN_CONFIG } from "../domain/screenConfig";
import type { OperationalDeviceStore } from "./OperationalDeviceStore";

function isActiveToken(token: OperationalDeviceTokenRecord, now: number): boolean {
  if (token.status !== "active") return false;
  if (token.revokedAt != null) return false;
  if (token.expiresAt != null && Date.parse(token.expiresAt) <= now) return false;
  return true;
}

const INITIAL_SCREEN_CONFIG_REVISION = 1;

export class InMemoryOperationalDeviceStore implements OperationalDeviceStore {
  private readonly devices = new Map<string, OperationalDeviceRecord>();
  private readonly tokens = new Map<string, OperationalDeviceTokenRecord>();

  async createDevice(
    input: CreateOperationalDeviceInput & { deviceId: string; now: string }
  ): Promise<OperationalDeviceRecord> {
    const record: OperationalDeviceRecord = {
      deviceId: input.deviceId,
      restaurantId: input.restaurantId,
      branchId: input.branchId ?? null,
      role: input.role,
      displayName: input.displayName,
      screenConfig: { ...DEFAULT_SCREEN_CONFIG },
      status: "active",
      reportedVersion: null,
      lastSeenAt: null,
      screenConfigRevision: INITIAL_SCREEN_CONFIG_REVISION,
      createdAt: input.now,
      updatedAt: input.now,
    };
    this.devices.set(record.deviceId, record);
    return record;
  }

  async getDevice(deviceId: string): Promise<OperationalDeviceRecord | null> {
    return this.devices.get(deviceId) ?? null;
  }

  async listDevicesByRestaurant(restaurantId: number): Promise<OperationalDeviceRecord[]> {
    return Array.from(this.devices.values()).filter((d) => d.restaurantId === restaurantId);
  }

  async updateDeviceStatus(
    deviceId: string,
    status: "active" | "disabled",
    now: string
  ): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    this.devices.set(deviceId, { ...device, status, updatedAt: now });
    return true;
  }

  async touchDeviceHeartbeat(
    deviceId: string,
    input: { lastSeenAt: string; reportedVersion?: string | null }
  ): Promise<void> {
    const device = this.devices.get(deviceId);
    if (!device) return;
    this.devices.set(deviceId, {
      ...device,
      lastSeenAt: input.lastSeenAt,
      reportedVersion: input.reportedVersion ?? device.reportedVersion,
    });
  }

  async saveToken(record: OperationalDeviceTokenRecord): Promise<void> {
    this.tokens.set(record.tokenId, record);
  }

  async getToken(tokenId: string): Promise<OperationalDeviceTokenRecord | null> {
    return this.tokens.get(tokenId) ?? null;
  }

  async findActiveTokenForDevice(deviceId: string): Promise<OperationalDeviceTokenRecord | null> {
    const now = Date.now();
    return (
      Array.from(this.tokens.values()).find(
        (token) => token.deviceId === deviceId && isActiveToken(token, now)
      ) ?? null
    );
  }

  async listTokensForDevice(deviceId: string): Promise<OperationalDeviceTokenRecord[]> {
    return Array.from(this.tokens.values()).filter((token) => token.deviceId === deviceId);
  }

  async revokeToken(
    tokenId: string,
    revokedAt: string,
    status: "revoked" | "rotated"
  ): Promise<boolean> {
    const token = this.tokens.get(tokenId);
    if (!token) return false;
    this.tokens.set(tokenId, { ...token, status, revokedAt });
    return true;
  }

  async revokeAllActiveTokens(
    deviceId: string,
    revokedAt: string,
    status: "revoked" | "rotated"
  ): Promise<number> {
    const now = Date.now();
    let count = 0;
    for (const [tokenId, token] of Array.from(this.tokens.entries())) {
      if (token.deviceId === deviceId && isActiveToken(token, now)) {
        this.tokens.set(tokenId, { ...token, status, revokedAt });
        count += 1;
      }
    }
    return count;
  }

  async touchTokenUsage(tokenId: string, lastUsedAt: string): Promise<void> {
    const token = this.tokens.get(tokenId);
    if (!token) return;
    this.tokens.set(tokenId, { ...token, lastUsedAt });
  }

  async findTokenByActivationCodeHash(hash: string): Promise<OperationalDeviceTokenRecord | null> {
    return (
      Array.from(this.tokens.values()).find((token) => token.activationCodeHash === hash) ?? null
    );
  }

  async consumeActivationCode(tokenId: string): Promise<boolean> {
    const token = this.tokens.get(tokenId);
    if (!token || token.activationCodeHash == null) return false;
    this.tokens.set(tokenId, {
      ...token,
      activationCodeHash: null,
      activationCodeExpiresAt: null,
    });
    return true;
  }

  async updateTokenSecret(tokenId: string, secretHash: string, now: string): Promise<void> {
    const token = this.tokens.get(tokenId);
    if (!token) return;
    this.tokens.set(tokenId, { ...token, secretHash, lastUsedAt: now });
  }

  async deleteDevice(deviceId: string): Promise<boolean> {
    return this.devices.delete(deviceId);
  }

  async updateScreenPresentation(
    deviceId: string,
    input: {
      displayName?: string;
      screenConfig?: OperationalDeviceRecord["screenConfig"];
      now: string;
    }
  ): Promise<boolean> {
    const device = this.devices.get(deviceId);
    if (!device) return false;
    const next: OperationalDeviceRecord = {
      ...device,
      displayName: input.displayName ?? device.displayName,
      screenConfig: input.screenConfig ?? device.screenConfig,
      updatedAt: input.now,
    };
    if (input.screenConfig != null) {
      next.screenConfigRevision = device.screenConfigRevision + 1;
    }
    this.devices.set(deviceId, next);
    return true;
  }
}
