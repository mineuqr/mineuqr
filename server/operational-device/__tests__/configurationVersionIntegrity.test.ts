import { describe, expect, it } from "vitest";
import { resolveScreenConfigVersion } from "../domain/screenConfigVersion";
import { InMemoryOperationalDeviceStore } from "../infrastructure/InMemoryOperationalDeviceStore";
import { OperationalDeviceHeartbeatService } from "../services/OperationalDeviceHeartbeatService";
import { OperationalDeviceRegistryService } from "../services/OperationalDeviceRegistryService";

const NOW = 1_700_000_000_000;

describe("BUGFIX-F004 configuration version integrity", () => {
  it("heartbeat updates lastSeenAt without changing configuration version", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    const heartbeat = new OperationalDeviceHeartbeatService(store, () => NOW + 60_000);

    const created = await registry.createDevice({
      restaurantId: 1,
      role: "kitchen_display",
      displayName: "Kitchen",
    });

    const versionBefore = resolveScreenConfigVersion(created.device);
    expect(versionBefore).toBe("1");

    await heartbeat.recordHeartbeat({ deviceId: created.device.deviceId });
    const afterHeartbeat = await store.getDevice(created.device.deviceId);
    expect(afterHeartbeat).not.toBeNull();
    expect(afterHeartbeat!.lastSeenAt).not.toBeNull();
    expect(resolveScreenConfigVersion(afterHeartbeat!)).toBe(versionBefore);
    expect(afterHeartbeat!.updatedAt).toBe(created.device.updatedAt);
  });

  it("multiple heartbeat cycles keep configuration version stable", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);
    let tick = NOW;
    const heartbeat = new OperationalDeviceHeartbeatService(store, () => {
      tick += 30_000;
      return tick;
    });

    const created = await registry.createDevice({
      restaurantId: 2,
      role: "expo_display",
      displayName: "Expo",
    });
    const versionBefore = resolveScreenConfigVersion(created.device);

    for (let i = 0; i < 5; i += 1) {
      await heartbeat.recordHeartbeat({ deviceId: created.device.deviceId });
    }

    const device = await store.getDevice(created.device.deviceId);
    expect(resolveScreenConfigVersion(device!)).toBe(versionBefore);
  });

  it("screen settings update increments configuration revision", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 3,
      role: "kitchen_display",
      displayName: "Line 1",
    });

    const updated = await registry.updateScreenSettings(created.device.deviceId, 3, {
      screenConfig: { language: "en", displayDirection: "ltr" },
    });

    expect(updated?.screenConfigRevision).toBe(2);
    expect(resolveScreenConfigVersion(updated!)).toBe("2");
  });

  it("display name only update does not increment configuration revision", async () => {
    const store = new InMemoryOperationalDeviceStore();
    const registry = new OperationalDeviceRegistryService(store, () => NOW);

    const created = await registry.createDevice({
      restaurantId: 4,
      role: "kitchen_display",
      displayName: "Kitchen",
    });

    const renamed = await registry.updateScreenSettings(created.device.deviceId, 4, {
      displayName: "Main Kitchen",
    });

    expect(renamed?.screenConfigRevision).toBe(1);
    expect(resolveScreenConfigVersion(renamed!)).toBe("1");
    expect(renamed?.displayName).toBe("Main Kitchen");
  });
});
