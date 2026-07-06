import { describe, expect, it } from "vitest";
import { DEVICE_AUTH_FAILURE_CODES } from "../domain/deviceAuthCodes";
import { OperationalDeviceAuthService } from "../services/OperationalDeviceAuthService";
import { OperationalDeviceRegistryService } from "../services/OperationalDeviceRegistryService";
import { InMemoryOperationalDeviceStore } from "../infrastructure/InMemoryOperationalDeviceStore";

const NOW = 1_700_000_000_000;

describe("OPERATIONAL-BUGFIX-1D — device auth failure taxonomy", () => {
  it("authenticates valid device credentials", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 1,
      role: "kitchen_display",
      displayName: "Kitchen",
    });

    const result = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.session.role).toBe("kitchen_display");
    }
  });

  it("reports invalid_credentials for wrong secret", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 1,
      role: "kitchen_display",
      displayName: "Kitchen",
    });

    const result = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: "wrong-secret",
    });

    expect(result).toEqual({ ok: false, code: "invalid_credentials" });
  });

  it("reports device_disabled for disabled device", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 1,
      role: "kitchen_display",
      displayName: "Kitchen",
    });

    await registry.disableDevice(created.device.deviceId, 1);

    const result = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
    });

    expect(result).toEqual({ ok: false, code: "device_disabled" });
  });

  it("reports token_revoked after rotation", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 3,
      role: "pickup_display",
      displayName: "Pickup",
    });

    await registry.rotateToken(created.device.deviceId, 3);

    const result = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
    });

    expect(result).toEqual({ ok: false, code: "token_revoked" });
  });

  it("reports token_expired when token past expiry", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 4,
      role: "expo_display",
      displayName: "Expo",
    });

    const token = await store.getToken(created.token.tokenId);
    expect(token).not.toBeNull();
    await store.saveToken({
      ...token!,
      expiresAt: new Date(NOW - 60_000).toISOString(),
    });

    const result = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
    });

    expect(result).toEqual({ ok: false, code: "token_expired" });
  });

  it("does not collapse failures to a single generic code", async () => {
    const codes = new Set<string>();
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const auth = new OperationalDeviceAuthService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 2,
      role: "expo_display",
      displayName: "Expo",
    });

    const creds = {
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
    };

    const badSecret = await auth.authenticate({ ...creds, secret: "nope" });
    if (!badSecret.ok) codes.add(badSecret.code);

    await registry.disableDevice(created.device.deviceId, 2);
    const disabled = await auth.authenticate(creds);
    if (!disabled.ok) codes.add(disabled.code);

    expect(codes.has("invalid_credentials")).toBe(true);
    expect(codes.has("device_disabled")).toBe(true);
    expect(codes.size).toBeGreaterThan(1);
  });

  it("exposes all PAIRING-CONTRACT-1 failure codes", () => {
    expect(DEVICE_AUTH_FAILURE_CODES).toEqual([
      "invalid_credentials",
      "device_disabled",
      "token_revoked",
      "token_expired",
    ]);
  });
});
