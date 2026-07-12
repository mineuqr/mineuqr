import { describe, expect, it } from "vitest";
import { encryptDeviceSecret, decryptRecoveryMaterial } from "../infrastructure/deviceCredentialStorage";
import { hashActivationCode } from "../infrastructure/deviceCrypto";
import { InMemoryOperationalDeviceStore } from "../infrastructure/InMemoryOperationalDeviceStore";
import { ScreenCredentialRecoveryService } from "../recovery/ScreenCredentialRecoveryService";
import { OperationalDeviceAuthService } from "../services/OperationalDeviceAuthService";
import { OperationalDeviceRegistryService } from "../services/OperationalDeviceRegistryService";

const NOW = 1_700_000_000_000;

describe("SCREEN-CREDENTIAL-LIFECYCLE-1", () => {
  it("repeated credential auth does not invalidate the permanent credential", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 10,
      role: "kitchen_display",
      displayName: "Kitchen 1",
    });

    const creds = {
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
    };

    const first = await auth.authenticate(creds);
    const second = await auth.authenticate(creds);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);

    const token = await store.getToken(created.token.tokenId);
    expect(token?.status).toBe("active");
    expect(token?.activationCodeHash).toBeNull();
  });

  it("regenerating credential revokes only the previous token", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 3,
      role: "pickup_display",
      displayName: "Pickup",
    });
    const oldSecret = created.token.secret;
    const oldTokenId = created.token.tokenId;

    const rotated = await registry.regenerateCredential(created.device.deviceId, 3);
    expect(rotated).not.toBeNull();

    const oldAuth = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: oldTokenId,
      secret: oldSecret,
    });
    expect(oldAuth).toEqual({ ok: false, code: "token_revoked" });

    const newAuth = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: rotated!.tokenId,
      secret: rotated!.secret,
    });
    expect(newAuth.ok).toBe(true);
  });

  it("getScreenRecovery returns server-rendered QR for active screens", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const recovery = new ScreenCredentialRecoveryService(store);

    const created = await registry.createDevice({
      restaurantId: 5,
      role: "expo_display",
      displayName: "Expo",
    });

    const bundle = await recovery.getScreenRecovery(created.device.deviceId, 5);
    expect(bundle).not.toBeNull();
    if (!bundle || "retrievable" in bundle) return;
    expect(bundle.recoveryQrSvg).toContain("<svg");
    expect(JSON.stringify(bundle)).not.toContain(created.token.secret);
  });

  it("legacy tokens without ciphertext remain authenticatable but are not retrievable", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);
    const recovery = new ScreenCredentialRecoveryService(store);

    const created = await registry.createDevice({
      restaurantId: 7,
      role: "kitchen_display",
      displayName: "Legacy",
    });

    const token = await store.getToken(created.token.tokenId);
    await store.saveToken({ ...token!, secretCiphertext: null });

    const bundle = await recovery.getScreenRecovery(created.device.deviceId, 7);
    expect(bundle).toEqual({ retrievable: false, reason: "legacy_token" });

    const authResult = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
    });
    expect(authResult.ok).toBe(true);
  });

  it("deleteScreen revokes credentials and removes device from fleet", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 9,
      role: "kitchen_display",
      displayName: "To Delete",
    });

    const deleted = await registry.deleteDevice(created.device.deviceId, 9);
    expect(deleted).toBe(true);
    expect(await registry.getDevice(created.device.deviceId, 9)).toBeNull();

    const authResult = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
    });
    expect(authResult).toEqual({ ok: false, code: "invalid_credentials" });
  });

  it("legacy activation codes cannot bootstrap via recovery material", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const auth = new OperationalDeviceAuthService(store, () => NOW);
    const registry = new OperationalDeviceRegistryService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 11,
      role: "kitchen_display",
      displayName: "Legacy activation",
    });

    const activationCode = "ABCD-EFGH";
    const token = await store.getToken(created.token.tokenId);
    await store.saveToken({
      ...token!,
      activationCodeHash: hashActivationCode(activationCode),
      activationCodeExpiresAt: new Date(NOW + 60_000).toISOString(),
    });

    const result = await auth.authenticateByActivationCode(activationCode);
    expect(result).toEqual({ ok: false, code: "activation_code_invalid" });
  });
});

describe("deviceCredentialStorage", () => {
  it("round-trips recovery encryption", () => {
    const secret = "a".repeat(32);
    const ciphertext = encryptDeviceSecret(secret);
    expect(decryptRecoveryMaterial(ciphertext)).toBe(secret);
  });
});
