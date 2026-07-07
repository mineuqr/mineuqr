import type {
  CreateOperationalDeviceInput,
  IssuedOperationalDeviceToken,
  OperationalDeviceListItem,
  OperationalDeviceRecord,
  OperationalScreenPairingPayload,
} from "../domain/deviceContracts";
import { deriveDevicePresence } from "../domain/deviceHealth";
import type { UpdateScreenSettingsInput } from "../domain/screenConfig";
import { mergeScreenConfig } from "../domain/screenConfig";
import type { OperationalDeviceStore } from "../infrastructure/OperationalDeviceStore";
import {
  generateActivationCode,
  generateDeviceId,
  generateDeviceSecret,
  generateDeviceTokenId,
  hashActivationCode,
  hashDeviceSecret,
} from "../infrastructure/deviceCrypto";

/** Provisioning session timeout — activation codes expire with the operator session window. */
export const PROVISIONING_ACTIVATION_CODE_TTL_MS = 30 * 60 * 1000;

export type CreateDeviceResult = {
  device: OperationalDeviceRecord;
  token: IssuedOperationalDeviceToken;
  qrPayload: OperationalScreenPairingPayload;
};

export class OperationalDeviceRegistryService {
  constructor(
    private readonly store: OperationalDeviceStore,
    private readonly now: () => number = () => Date.now()
  ) {}

  async listDevices(restaurantId: number): Promise<OperationalDeviceListItem[]> {
    const devices = await this.store.listDevicesByRestaurant(restaurantId);
    const now = this.now();
    const items: OperationalDeviceListItem[] = [];

    for (const device of devices) {
      const activeToken = await this.store.findActiveTokenForDevice(device.deviceId);
      items.push({
        ...device,
        presence: deriveDevicePresence(device.lastSeenAt, now),
        hasActiveToken: activeToken != null,
      });
    }

    return items;
  }

  async getDevice(deviceId: string, restaurantId: number): Promise<OperationalDeviceListItem | null> {
    const device = await this.store.getDevice(deviceId);
    if (!device || device.restaurantId !== restaurantId) return null;
    const activeToken = await this.store.findActiveTokenForDevice(deviceId);
    return {
      ...device,
      presence: deriveDevicePresence(device.lastSeenAt, this.now()),
      hasActiveToken: activeToken != null,
    };
  }

  async createDevice(input: CreateOperationalDeviceInput): Promise<CreateDeviceResult> {
    const nowIso = new Date(this.now()).toISOString();
    const deviceId = generateDeviceId();
    const device = await this.store.createDevice({ ...input, deviceId, now: nowIso });
    const token = await this.issueToken(device.deviceId);
    return {
      device,
      token,
      qrPayload: this.buildQrPayload(device, token),
    };
  }

  async disableDevice(deviceId: string, restaurantId: number): Promise<boolean> {
    const device = await this.store.getDevice(deviceId);
    if (!device || device.restaurantId !== restaurantId) return false;
    const nowIso = new Date(this.now()).toISOString();
    await this.store.revokeAllActiveTokens(deviceId, nowIso, "revoked");
    return this.store.updateDeviceStatus(deviceId, "disabled", nowIso);
  }

  async enableDevice(deviceId: string, restaurantId: number): Promise<boolean> {
    const device = await this.store.getDevice(deviceId);
    if (!device || device.restaurantId !== restaurantId) return false;
    const nowIso = new Date(this.now()).toISOString();
    return this.store.updateDeviceStatus(deviceId, "active", nowIso);
  }

  async rotateToken(deviceId: string, restaurantId: number): Promise<IssuedOperationalDeviceToken | null> {
    const device = await this.store.getDevice(deviceId);
    if (!device || device.restaurantId !== restaurantId || device.status !== "active") {
      return null;
    }
    const nowIso = new Date(this.now()).toISOString();
    await this.store.revokeAllActiveTokens(deviceId, nowIso, "rotated");
    return this.issueToken(deviceId);
  }

  async revokeToken(deviceId: string, restaurantId: number): Promise<boolean> {
    const device = await this.store.getDevice(deviceId);
    if (!device || device.restaurantId !== restaurantId) return false;
    const nowIso = new Date(this.now()).toISOString();
    const count = await this.store.revokeAllActiveTokens(deviceId, nowIso, "revoked");
    return count > 0;
  }

  async updateScreenSettings(
    deviceId: string,
    restaurantId: number,
    input: UpdateScreenSettingsInput
  ): Promise<OperationalDeviceRecord | null> {
    const device = await this.store.getDevice(deviceId);
    if (!device || device.restaurantId !== restaurantId) return null;
    const nowIso = new Date(this.now()).toISOString();
    const ok = await this.store.updateScreenPresentation(deviceId, {
      displayName: input.displayName?.trim() || undefined,
      screenConfig: input.screenConfig
        ? mergeScreenConfig(device.screenConfig, input.screenConfig)
        : undefined,
      now: nowIso,
    });
    if (!ok) return null;
    return this.store.getDevice(deviceId);
  }

  buildQrPayload(
    device: OperationalDeviceRecord,
    token: IssuedOperationalDeviceToken
  ): OperationalScreenPairingPayload {
    return {
      mineuqr: "operational-screen-pairing",
      v: 2,
      deviceId: device.deviceId,
      tokenId: token.tokenId,
      secret: token.secret,
      restaurantId: device.restaurantId,
      branchId: device.branchId,
      role: device.role,
      displayName: device.displayName,
      issuedAt: token.issuedAt,
    };
  }

  private async issueToken(deviceId: string): Promise<IssuedOperationalDeviceToken> {
    const secret = generateDeviceSecret();
    const tokenId = generateDeviceTokenId();
    const issuedAt = new Date(this.now()).toISOString();
    const activationCode = generateActivationCode();
    const activationCodeExpiresAt = new Date(
      this.now() + PROVISIONING_ACTIVATION_CODE_TTL_MS
    ).toISOString();
    await this.store.saveToken({
      tokenId,
      deviceId,
      secretHash: hashDeviceSecret(secret),
      status: "active",
      issuedAt,
      expiresAt: null,
      revokedAt: null,
      lastUsedAt: null,
      createdAt: issuedAt,
      activationCodeHash: hashActivationCode(activationCode),
      activationCodeExpiresAt,
    });
    return { tokenId, secret, deviceId, issuedAt, expiresAt: null, activationCode };
  }
}
