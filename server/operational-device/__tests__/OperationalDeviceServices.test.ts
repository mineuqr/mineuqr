import { describe, expect, it } from "vitest";
import { InMemoryOperationalDeviceStore } from "../infrastructure/InMemoryOperationalDeviceStore";
import { OperationalDeviceAuthService } from "../services/OperationalDeviceAuthService";
import { OperationalDeviceRegistryService } from "../services/OperationalDeviceRegistryService";

describe("OperationalDeviceAuthService", () => {
  it("authenticates valid device credentials", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => 1_700_000_000_000);
    const auth = new OperationalDeviceAuthService(store, () => 1_700_000_000_000);

    const created = await registry.createDevice({
      restaurantId: 10,
      role: "kitchen_display",
      displayName: "Kitchen 1",
    });

    const header = `Device ${created.device.deviceId}:${created.token.tokenId}:${created.token.secret}`;
    const parsed = auth.parseAuthorizationHeader(header);
    expect(parsed).not.toBeNull();

    const session = await auth.validateCredentials(parsed!);
    expect(session?.restaurantId).toBe(10);
    expect(session?.role).toBe("kitchen_display");
  });

  it("authenticates by activation code and issues bootstrap credentials", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => 1_700_000_000_000);
    const auth = new OperationalDeviceAuthService(store, () => 1_700_000_000_000);

    const created = await registry.createDevice({
      restaurantId: 10,
      role: "kitchen_display",
      displayName: "Kitchen 1",
    });

    const result = await auth.authenticateByActivationCode(created.token.activationCode);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.bootstrapCredentials?.deviceId).toBe(created.device.deviceId);

    const reused = await auth.authenticateByActivationCode(created.token.activationCode);
    expect(reused.ok).toBe(false);
    if (!reused.ok) {
      expect(["activation_code_used", "activation_code_invalid"]).toContain(reused.code);
    }
  });

  it("rejects revoked token after rotation", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => 1_700_000_000_000);
    const auth = new OperationalDeviceAuthService(store, () => 1_700_000_000_000);

    const created = await registry.createDevice({
      restaurantId: 3,
      role: "pickup_display",
      displayName: "Pickup",
    });
    const oldSecret = created.token.secret;
    await registry.rotateToken(created.device.deviceId, 3);

    const session = await auth.validateCredentials({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: oldSecret,
    });
    expect(session).toBeNull();

    const authResult = await auth.authenticate({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: oldSecret,
    });
    expect(authResult).toEqual({ ok: false, code: "token_revoked" });
  });

  it("enforces restaurant isolation via device record", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => 1_700_000_000_000);
    const auth = new OperationalDeviceAuthService(store, () => 1_700_000_000_000);

    const created = await registry.createDevice({
      restaurantId: 99,
      role: "expo_display",
      displayName: "Expo",
    });

    const session = await auth.validateCredentials({
      deviceId: created.device.deviceId,
      tokenId: created.token.tokenId,
      secret: created.token.secret,
    });
    expect(session?.restaurantId).toBe(99);
  });
});

describe("OperationalDeviceRegistryService", () => {
  it("disables device and revokes active tokens", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => 1_700_000_000_000);

    const created = await registry.createDevice({
      restaurantId: 7,
      role: "kitchen_display",
      displayName: "Line 1",
    });

    await registry.disableDevice(created.device.deviceId, 7);
    const listed = await registry.listDevices(7);
    expect(listed[0]?.status).toBe("disabled");
    expect(listed[0]?.hasActiveToken).toBe(false);
  });

  it("isolates devices by restaurant", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => 1_700_000_000_000);

    await registry.createDevice({
      restaurantId: 1,
      role: "kitchen_display",
      displayName: "A",
    });
    await registry.createDevice({
      restaurantId: 2,
      role: "kitchen_display",
      displayName: "B",
    });

    expect(await registry.listDevices(1)).toHaveLength(1);
    expect(await registry.listDevices(2)).toHaveLength(1);
  });

  it("updates screen settings without changing device identity", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => 1_700_000_000_000);

    const created = await registry.createDevice({
      restaurantId: 5,
      role: "kitchen_display",
      displayName: "Kitchen 1",
    });

    const updated = await registry.updateScreenSettings(created.device.deviceId, 5, {
      displayName: "Main Kitchen",
      screenConfig: { language: "en", displayDirection: "ltr", visibleCategoryIds: [10] },
    });

    expect(updated?.displayName).toBe("Main Kitchen");
    expect(updated?.screenConfig.language).toBe("en");
    expect(updated?.screenConfig.visibleCategoryIds).toEqual([10]);
    expect(updated?.deviceId).toBe(created.device.deviceId);
  });
});
