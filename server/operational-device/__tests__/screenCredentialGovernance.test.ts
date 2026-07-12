import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { encryptDeviceSecret, decryptRecoveryMaterial } from "../infrastructure/deviceCredentialStorage";
import { InMemoryOperationalDeviceStore } from "../infrastructure/InMemoryOperationalDeviceStore";
import { ScreenCredentialRecoveryService } from "../recovery/ScreenCredentialRecoveryService";
import { OperationalDeviceAuthService } from "../services/OperationalDeviceAuthService";
import { OperationalDeviceRegistryService } from "../services/OperationalDeviceRegistryService";

const repoRoot = join(__dirname, "../../..");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const NOW = 1_700_000_000_000;

describe("SCREEN-CREDENTIAL-GOVERNANCE-1", () => {
  it("OperationalDeviceAuthService never reads recovery material", () => {
    const source = read("server/operational-device/services/OperationalDeviceAuthService.ts");
    expect(source).not.toContain("decryptRecoveryMaterial");
    expect(source).not.toContain("decryptDeviceSecret");
    expect(source).not.toMatch(/token\.secretCiphertext/);
    expect(source).toContain("verifyDeviceSecret");
  });

  it("OperationalDeviceRegistryService never decrypts recovery material", () => {
    const source = read("server/operational-device/services/OperationalDeviceRegistryService.ts");
    expect(source).not.toContain("decryptRecoveryMaterial");
    expect(source).not.toContain("decryptDeviceSecret");
  });

  it("only ScreenCredentialRecoveryService decrypts recovery material", () => {
    const recoverySource = read("server/operational-device/recovery/ScreenCredentialRecoveryService.ts");
    expect(recoverySource).toContain("decryptRecoveryMaterial");

    for (const rel of [
      "server/operational-device/services/OperationalDeviceAuthService.ts",
      "server/operational-device/services/OperationalDeviceRegistryService.ts",
      "server/operational-device/services/OperationalDeviceHeartbeatService.ts",
    ]) {
      const source = read(rel);
      expect(source, rel).not.toContain("decryptRecoveryMaterial");
    }
  });

  it("recovery material cannot authenticate runtime sessions", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);
    const recovery = new ScreenCredentialRecoveryService(store);

    const created = await registry.createDevice({
      restaurantId: 20,
      role: "kitchen_display",
      displayName: "Kitchen",
    });

    const token = await store.getToken(created.token.tokenId);
    const recoveredSecret = decryptRecoveryMaterial(token!.secretCiphertext);
    expect(recoveredSecret).toBe(created.token.secret);

    const authWithHashPath = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
    });
    expect(authWithHashPath.ok).toBe(true);

    const presentation = await recovery.getScreenRecovery(created.device.deviceId, 20);
    expect(presentation).not.toBeNull();
    if (!presentation || "retrievable" in presentation) return;
    expect(presentation).not.toHaveProperty("secret");
    expect(presentation.recoveryQrSvg).toContain("<svg");
  });

  it("getScreenRecovery returns server-rendered QR without plaintext secret", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const recovery = new ScreenCredentialRecoveryService(store);

    const created = await registry.createDevice({
      restaurantId: 21,
      role: "expo_display",
      displayName: "Expo",
    });

    const result = await recovery.getScreenRecovery(created.device.deviceId, 21);
    expect(result).not.toBeNull();
    if (!result || "retrievable" in result) return;
    expect(JSON.stringify(result)).not.toContain(created.token.secret);
    expect(result.recoveryQrSvg).toContain("<svg");
  });

  it("management router sources recovery from recoveryService only", () => {
    const router = read("server/operational-device/routers/operationalDeviceManagementRouter.ts");
    expect(router).toContain("recoveryService");
    expect(router).toContain("recoveryQrSvg");
    expect(router).not.toMatch(/secret:\s*result\.token\.secret/);
    expect(router).not.toContain("qrPayload");
  });

  it("regeneration preserves auth/recovery separation", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);
    const recovery = new ScreenCredentialRecoveryService(store);

    const created = await registry.createDevice({
      restaurantId: 22,
      role: "pickup_display",
      displayName: "Pickup",
    });
    const oldSecret = created.token.secret;

    const rotated = await registry.regenerateCredential(created.device.deviceId, 22);
    expect(rotated).not.toBeNull();

    const oldRow = await store.getToken(created.token.tokenId);
    expect(oldRow?.status).toBe("rotated");

    const newRow = await store.getToken(rotated!.tokenId);
    expect(newRow?.secretHash).not.toBe(oldRow?.secretHash);
    expect(newRow?.secretCiphertext).not.toBeNull();

    expect(
      await auth.authenticate({
        deviceId: created.device.deviceId,
        tokenId: created.token.tokenId,
        secret: oldSecret,
      })
    ).toEqual({ ok: false, code: "token_revoked" });

    const svg = await recovery.getScreenRecovery(created.device.deviceId, 22);
    expect(svg).not.toBeNull();
    if (!svg || "retrievable" in svg) return;
    expect(svg.recoveryQrSvg).toContain("<svg");
  });

  it("delete revokes authentication material", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 23,
      role: "kitchen_display",
      displayName: "Delete me",
    });

    await registry.deleteDevice(created.device.deviceId, 23);
    const result = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
    });
    expect(result).toEqual({ ok: false, code: "invalid_credentials" });
  });
});

describe("recovery material crypto", () => {
  it("round-trips recovery encryption", () => {
    const secret = "b".repeat(32);
    const ciphertext = encryptDeviceSecret(secret);
    expect(decryptRecoveryMaterial(ciphertext)).toBe(secret);
  });
});
