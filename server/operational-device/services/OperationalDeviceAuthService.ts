import type {
  DeviceAuthenticateResult,
  DeviceCredentialInput,
  OperationalDeviceSession,
} from "../domain/deviceContracts";
import type { DeviceAuthFailureCode } from "../domain/deviceAuthCodes";
import type { OperationalDeviceStore } from "../infrastructure/OperationalDeviceStore";
import {
  hashActivationCode,
  isValidActivationCodeFormat,
  verifyDeviceSecret,
} from "../infrastructure/deviceCrypto";

type CredentialOutcome =
  | { ok: true; session: OperationalDeviceSession }
  | { ok: false; code: DeviceAuthFailureCode };

/**
 * Runtime authentication — validates Authentication Material (secretHash) only.
 * MUST NOT read recovery material. See credentialGovernance.ts.
 */
export class OperationalDeviceAuthService {
  constructor(
    private readonly store: OperationalDeviceStore,
    private readonly now: () => number = () => Date.now()
  ) {}

  parseAuthorizationHeader(header: string | undefined): DeviceCredentialInput | null {
    if (!header) return null;
    const trimmed = header.trim();
    if (!trimmed.toLowerCase().startsWith("device ")) return null;
    const payload = trimmed.slice(7).trim();
    const parts = payload.split(":");
    if (parts.length !== 3) return null;
    const [deviceId, tokenId, secret] = parts;
    if (!deviceId || !tokenId || !secret) return null;
    return { deviceId, tokenId, secret };
  }

  async authenticate(input: DeviceCredentialInput): Promise<DeviceAuthenticateResult> {
    const outcome = await this.resolveCredentialOutcome(input);
    if (!outcome.ok) {
      return { ok: false, code: outcome.code };
    }
    return { ok: true, session: outcome.session };
  }

  async validateCredentials(input: DeviceCredentialInput): Promise<OperationalDeviceSession | null> {
    const outcome = await this.resolveCredentialOutcome(input);
    return outcome.ok ? outcome.session : null;
  }

  /**
   * Legacy activation-code bootstrap — deprecated.
   * Governance: cannot decrypt recovery material; returns invalid for bootstrap paths.
   */
  async authenticateByActivationCode(
    activationCode: string
  ): Promise<DeviceAuthenticateResult> {
    if (!isValidActivationCodeFormat(activationCode)) {
      return { ok: false, code: "activation_code_invalid" };
    }

    const hash = hashActivationCode(activationCode);
    const token = await this.store.findTokenByActivationCodeHash(hash);
    if (!token) {
      return { ok: false, code: "activation_code_invalid" };
    }
    if (token.activationCodeHash == null) {
      return { ok: false, code: "activation_code_used" };
    }
    if (
      token.activationCodeExpiresAt != null &&
      Date.parse(token.activationCodeExpiresAt) <= this.now()
    ) {
      return { ok: false, code: "activation_code_expired" };
    }
    if (token.status !== "active" || token.revokedAt != null) {
      return { ok: false, code: "token_revoked" };
    }

    const device = await this.store.getDevice(token.deviceId);
    if (!device || device.status !== "active") {
      return { ok: false, code: "activation_code_invalid" };
    }

    // Recovery material cannot authenticate — use pairing code redeem at /screen.
    return { ok: false, code: "activation_code_invalid" };
  }

  async resolveCredentialOutcome(input: DeviceCredentialInput): Promise<CredentialOutcome> {
    const device = await this.store.getDevice(input.deviceId);
    if (!device) {
      return { ok: false, code: "invalid_credentials" };
    }
    if (device.status !== "active") {
      return { ok: false, code: "device_disabled" };
    }

    const token = await this.store.getToken(input.tokenId);
    if (!token || token.deviceId !== input.deviceId) {
      return { ok: false, code: "invalid_credentials" };
    }
    if (token.status !== "active" || token.revokedAt != null) {
      return { ok: false, code: "token_revoked" };
    }
    if (token.expiresAt != null && Date.parse(token.expiresAt) <= this.now()) {
      return { ok: false, code: "token_expired" };
    }
    if (!verifyDeviceSecret(input.secret, token.secretHash)) {
      return { ok: false, code: "invalid_credentials" };
    }

    const nowIso = new Date(this.now()).toISOString();
    await this.store.touchTokenUsage(token.tokenId, nowIso);

    return {
      ok: true,
      session: {
        deviceId: device.deviceId,
        tokenId: token.tokenId,
        restaurantId: device.restaurantId,
        branchId: device.branchId,
        role: device.role,
        displayName: device.displayName,
      },
    };
  }
}
