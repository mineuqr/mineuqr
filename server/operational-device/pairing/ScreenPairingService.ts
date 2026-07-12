import type { DeviceCredentialInput } from "../domain/deviceContracts";
import { decryptRecoveryMaterial } from "../infrastructure/deviceCredentialStorage";
import type { OperationalDeviceStore } from "../infrastructure/OperationalDeviceStore";
import type { PairingRedeemResult } from "./pairingContracts";
import { hashPairingCode, isValidPairingCodeFormat } from "./pairingCrypto";

/**
 * SCREEN-PAIRING-CODE-1 — Pairing domain bootstrap service.
 * Redeems one-time pairing codes into permanent device credentials.
 * Pairing codes never authenticate runtime sessions.
 */
export class ScreenPairingService {
  constructor(
    private readonly store: OperationalDeviceStore,
    private readonly now: () => number = () => Date.now()
  ) {}

  async redeemPairingCode(pairingCode: string): Promise<PairingRedeemResult> {
    if (!isValidPairingCodeFormat(pairingCode)) {
      return { ok: false, code: "pairing_code_invalid" };
    }

    const hash = hashPairingCode(pairingCode);
    const token = await this.store.findTokenByActivationCodeHash(hash);
    if (!token) {
      return { ok: false, code: "pairing_code_invalid" };
    }
    if (token.activationCodeHash == null) {
      return { ok: false, code: "pairing_code_used" };
    }
    if (
      token.activationCodeExpiresAt != null &&
      Date.parse(token.activationCodeExpiresAt) <= this.now()
    ) {
      return { ok: false, code: "pairing_code_expired" };
    }
    if (token.status !== "active" || token.revokedAt != null) {
      return { ok: false, code: "token_revoked" };
    }

    const device = await this.store.getDevice(token.deviceId);
    if (!device || device.status !== "active") {
      return { ok: false, code: "device_disabled" };
    }

    const secret = decryptRecoveryMaterial(token.secretCiphertext);
    if (!secret) {
      return { ok: false, code: "pairing_code_invalid" };
    }

    await this.store.consumeActivationCode(token.tokenId);

    const bootstrapCredentials: DeviceCredentialInput = {
      deviceId: token.deviceId,
      tokenId: token.tokenId,
      secret,
    };

    return { ok: true, bootstrapCredentials };
  }
}
