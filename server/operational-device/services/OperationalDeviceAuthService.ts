import type {
  DeviceAuthenticateResult,
  OperationalDeviceSession,
} from "../domain/deviceContracts";
import type { OperationalDeviceStore } from "../infrastructure/OperationalDeviceStore";
import { verifyDeviceSecret } from "../infrastructure/deviceCrypto";

export type DeviceCredentialInput = {
  deviceId: string;
  tokenId: string;
  secret: string;
};

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
    const session = await this.validateCredentials(input);
    if (!session) {
      return { ok: false, code: "invalid_credentials" };
    }
    return { ok: true, session };
  }

  async validateCredentials(input: DeviceCredentialInput): Promise<OperationalDeviceSession | null> {
    const device = await this.store.getDevice(input.deviceId);
    if (!device) return null;
    if (device.status !== "active") return null;

    const token = await this.store.getToken(input.tokenId);
    if (!token || token.deviceId !== input.deviceId) return null;
    if (token.status !== "active" || token.revokedAt != null) return null;
    if (token.expiresAt != null && Date.parse(token.expiresAt) <= this.now()) return null;
    if (!verifyDeviceSecret(input.secret, token.secretHash)) return null;

    const nowIso = new Date(this.now()).toISOString();
    await this.store.touchTokenUsage(token.tokenId, nowIso);

    return {
      deviceId: device.deviceId,
      tokenId: token.tokenId,
      restaurantId: device.restaurantId,
      branchId: device.branchId,
      role: device.role,
      displayName: device.displayName,
    };
  }
}
