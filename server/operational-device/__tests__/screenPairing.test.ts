import { describe, expect, it } from "vitest";
import { generatePairingCode, hashPairingCode, isValidPairingCodeFormat, normalizePairingCode } from "../pairing/pairingCrypto";
import { InMemoryOperationalDeviceStore } from "../infrastructure/InMemoryOperationalDeviceStore";
import { ScreenPairingService } from "../pairing/ScreenPairingService";
import { OperationalDeviceAuthService } from "../services/OperationalDeviceAuthService";
import { OperationalDeviceRegistryService } from "../services/OperationalDeviceRegistryService";

const NOW = 1_700_000_000_000;

describe("SCREEN-PAIRING-CODE-1 — pairing crypto", () => {
  it("generates 6-character pairing codes from unambiguous alphabet", () => {
    const code = generatePairingCode();
    expect(code).toHaveLength(6);
    expect(isValidPairingCodeFormat(code)).toBe(true);
    expect(code).not.toMatch(/[OIL01]/);
  });

  it("normalizes hyphenated and spaced input", () => {
    expect(normalizePairingCode("a7-kd 92")).toBe("A7KD92");
    expect(hashPairingCode("A7KD92")).toBe(hashPairingCode("a7-kd92"));
  });
});

describe("SCREEN-PAIRING-CODE-1 — pairing domain", () => {
  it("issues pairing code on screen create", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 1,
      role: "kitchen_display",
      displayName: "Kitchen",
    });

    expect(created.token.pairingCode).toMatch(/^[A-Z2-9]{6}$/);

    const token = await store.getToken(created.token.tokenId);
    expect(token?.activationCodeHash).toBe(hashPairingCode(created.token.pairingCode));
  });

  it("redeems pairing code and installs bootstrap credentials once", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const pairing = new ScreenPairingService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 2,
      role: "kitchen_display",
      displayName: "Line 1",
    });

    const redeemed = await pairing.redeemPairingCode(created.token.pairingCode);
    expect(redeemed.ok).toBe(true);
    if (!redeemed.ok) return;

    expect(redeemed.bootstrapCredentials).toEqual({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
    });

    const tokenAfter = await store.getToken(created.token.tokenId);
    expect(tokenAfter?.activationCodeHash).toBeNull();

    const second = await pairing.redeemPairingCode(created.token.pairingCode);
    expect(second).toEqual({ ok: false, code: "pairing_code_invalid" });

    const session = await auth.authenticate(redeemed.bootstrapCredentials);
    expect(session.ok).toBe(true);
  });

  it("invalidates pairing code on credential regeneration", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const pairing = new ScreenPairingService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 3,
      role: "pickup_display",
      displayName: "Pickup",
    });
    const oldCode = created.token.pairingCode;

    const rotated = await registry.regenerateCredential(created.device.deviceId, 3);
    expect(rotated?.pairingCode).not.toBe(oldCode);

    const oldRedeem = await pairing.redeemPairingCode(oldCode);
    expect(oldRedeem.ok).toBe(false);

    const newRedeem = await pairing.redeemPairingCode(rotated!.pairingCode);
    expect(newRedeem.ok).toBe(true);
  });

  it("rejects pairing when device is deleted", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const pairing = new ScreenPairingService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 4,
      role: "expo_display",
      displayName: "Expo",
    });
    const code = created.token.pairingCode;

    await registry.deleteDevice(created.device.deviceId, 4);

    const result = await pairing.redeemPairingCode(code);
    expect(result.ok).toBe(false);
  });

  it("existing permanent credential auth unchanged after pairing", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const pairing = new ScreenPairingService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 5,
      role: "kitchen_display",
      displayName: "Kitchen 2",
    });

    const redeemed = await pairing.redeemPairingCode(created.token.pairingCode);
    expect(redeemed.ok).toBe(true);
    if (!redeemed.ok) return;

    const first = await auth.authenticate(redeemed.bootstrapCredentials);
    const second = await auth.authenticate(redeemed.bootstrapCredentials);
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
  });
});
