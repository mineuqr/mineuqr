import type {
  DeviceAuthenticateResult,
  OperationalDeviceSession,
} from "../domain/deviceContracts";
import type { DeviceAuthFailureCode } from "../domain/deviceAuthCodes";
import type { OperationalDeviceStore } from "../infrastructure/OperationalDeviceStore";
import { verifyDeviceSecret } from "../infrastructure/deviceCrypto";

export type DeviceCredentialInput = {
  deviceId: string;
  tokenId: string;
  secret: string;
};

type CredentialOutcome =
  | { ok: true; session: OperationalDeviceSession }
  | { ok: false; code: DeviceAuthFailureCode };

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
