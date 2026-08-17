import type {
  IssuedOperationalDeviceToken,
  OperationalDeviceRecord,
  OperationalScreenPairingPayload,
} from "../domain/deviceContracts";
import { decryptRecoveryMaterial } from "../infrastructure/deviceCredentialStorage";
import type { OperationalDeviceStore } from "../infrastructure/OperationalDeviceStore";
import { renderRecoveryQrSvg } from "./renderRecoveryQr";

export type ScreenRecoveryPresentation = {
  device: Pick<OperationalDeviceRecord, "deviceId" | "displayName" | "role">;
  token: Pick<IssuedOperationalDeviceToken, "tokenId" | "issuedAt">;
  recoveryQrSvg: string;
};

export type ScreenRecoveryUnavailable =
  | { retrievable: false; reason: "no_active_token" | "legacy_token" };

/**
 * SCREEN-CREDENTIAL-GOVERNANCE-1 — sole owner of recovery material decryption.
 * Recovery output is rendered QR SVG; plaintext secrets are not returned to clients.
 */
export class ScreenCredentialRecoveryService {
  constructor(private readonly store: OperationalDeviceStore) {}

  async getScreenRecovery(
    deviceId: string,
    restaurantId: number
  ): Promise<ScreenRecoveryPresentation | ScreenRecoveryUnavailable | null> {
    const device = await this.store.getDevice(deviceId);
    if (!device || device.restaurantId !== restaurantId || device.status !== "active") {
      return null;
    }

    const activeToken = await this.store.findActiveTokenForDevice(deviceId);
    if (!activeToken) {
      return { retrievable: false, reason: "no_active_token" };
    }

    const secret = decryptRecoveryMaterial(activeToken.secretCiphertext);
    if (!secret) {
      return { retrievable: false, reason: "legacy_token" };
    }

    return this.presentRecovery(device, {
      tokenId: activeToken.tokenId,
      secret,
      deviceId: activeToken.deviceId,
      issuedAt: activeToken.issuedAt,
      expiresAt: activeToken.expiresAt,
    });
  }

  async presentIssuanceRecovery(
    device: OperationalDeviceRecord,
    token: IssuedOperationalDeviceToken
  ): Promise<ScreenRecoveryPresentation> {
    return this.presentRecovery(device, token);
  }

  /**
   * Recovery material is not a new issuance: pairingCode is issuance-only.
   * presentRecovery consumes the stored token fields needed for QR payload.
   */
  private async presentRecovery(
    device: OperationalDeviceRecord,
    token: Pick<
      IssuedOperationalDeviceToken,
      "tokenId" | "secret" | "deviceId" | "issuedAt" | "expiresAt"
    >
  ): Promise<ScreenRecoveryPresentation> {
    const payload = this.buildPairingPayload(device, token);
    const recoveryQrSvg = await renderRecoveryQrSvg(JSON.stringify(payload));
    return {
      device: {
        deviceId: device.deviceId,
        displayName: device.displayName,
        role: device.role,
      },
      token: {
        tokenId: token.tokenId,
        issuedAt: token.issuedAt,
      },
      recoveryQrSvg,
    };
  }

  buildPairingPayload(
    device: OperationalDeviceRecord,
    token: Pick<IssuedOperationalDeviceToken, "tokenId" | "secret" | "issuedAt">
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
}
