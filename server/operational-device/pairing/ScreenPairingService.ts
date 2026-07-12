import type { DeviceCredentialInput } from "../domain/deviceContracts";
import { decryptRecoveryMaterial } from "../infrastructure/deviceCredentialStorage";
import type { OperationalDeviceStore } from "../infrastructure/OperationalDeviceStore";
import type { PairingAuditContext } from "../governance/pairingAudit";
import {
  logPairingRedeemFailed,
  logPairingRedeemSucceeded,
} from "../governance/pairingAudit";
import type { PairingRedeemResult } from "./pairingContracts";
import { hashPairingCode, isValidPairingCodeFormat } from "./pairingCrypto";

export type PairingRedeemOptions = {
  audit?: PairingAuditContext;
};

/**
 * SCREEN-PAIRING-CODE-1 / SCREEN-PAIRING-CODE-GOVERNANCE-1 — Pairing domain bootstrap service.
 * Redeems one-time pairing codes into permanent device credentials.
 * Pairing codes never authenticate runtime sessions.
 */
export class ScreenPairingService {
  constructor(
    private readonly store: OperationalDeviceStore,
    private readonly now: () => number = () => Date.now()
  ) {}

  async redeemPairingCode(
    pairingCode: string,
    options: PairingRedeemOptions = {}
  ): Promise<PairingRedeemResult> {
    const audit = options.audit;

    const fail = (code: PairingRedeemResult & { ok: false }): PairingRedeemResult => {
      if (audit) {
        logPairingRedeemFailed({ ...audit, failureCode: code.code });
      }
      return code;
    };

    if (!isValidPairingCodeFormat(pairingCode)) {
      return fail({ ok: false, code: "pairing_code_invalid" });
    }

    const hash = hashPairingCode(pairingCode);
    const token = await this.store.findTokenByActivationCodeHash(hash);
    if (!token) {
      return fail({ ok: false, code: "pairing_code_invalid" });
    }
    if (token.activationCodeHash == null) {
      return fail({ ok: false, code: "pairing_code_used" });
    }
    if (
      token.activationCodeExpiresAt != null &&
      Date.parse(token.activationCodeExpiresAt) <= this.now()
    ) {
      return fail({ ok: false, code: "pairing_code_expired" });
    }
    if (token.status !== "active" || token.revokedAt != null) {
      return fail({ ok: false, code: "token_revoked" });
    }

    const device = await this.store.getDevice(token.deviceId);
    if (!device || device.status !== "active") {
      return fail({ ok: false, code: "device_disabled" });
    }

    const consumed = await this.store.consumeActivationCode(token.tokenId);
    if (!consumed) {
      return fail({ ok: false, code: "pairing_code_used" });
    }

    const secret = decryptRecoveryMaterial(token.secretCiphertext);
    if (!secret) {
      return fail({ ok: false, code: "pairing_code_invalid" });
    }

    const bootstrapCredentials: DeviceCredentialInput = {
      deviceId: token.deviceId,
      tokenId: token.tokenId,
      secret,
    };

    if (audit) {
      logPairingRedeemSucceeded({
        ...audit,
        deviceId: token.deviceId,
        tokenId: token.tokenId,
        restaurantId: audit.restaurantId ?? device.restaurantId,
      });
    }

    return { ok: true, bootstrapCredentials };
  }
}
