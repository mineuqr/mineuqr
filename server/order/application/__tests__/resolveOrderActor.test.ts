import { describe, expect, it } from "vitest";
import {
  orderActorAuditMetadata,
  resolveOrderActorFromDeviceSession,
  resolveOrderActorFromSystem,
  resolveOrderActorFromUser,
} from "../resolveOrderActor";

describe("resolveOrderActor", () => {
  it("resolves UserActor from dashboard user", () => {
    const actor = resolveOrderActorFromUser(
      {
        id: 5,
        name: "Sam",
        role: "user",
      } as never,
      99,
      5
    );
    expect(actor.kind).toBe("user");
    expect(actor.userId).toBe(5);
    expect(actor.dashboardRole).toBe("owner");
    expect(actor.restaurantId).toBe(99);
  });

  it("resolves DeviceActor from device session", () => {
    const actor = resolveOrderActorFromDeviceSession({
      deviceId: "dev-abc",
      tokenId: "tok-abc",
      restaurantId: 3,
      branchId: null,
      role: "kitchen_display",
      displayName: "Kitchen",
    });
    expect(actor.kind).toBe("device");
    expect(actor.deviceId).toBe("dev-abc");
    expect(actor.deviceRole).toBe("kitchen_display");
  });

  it("resolves SystemActor for internal processes", () => {
    const actor = resolveOrderActorFromSystem("projection-relay", {
      displayName: "Projection Relay",
      restaurantId: 7,
    });
    expect(actor.kind).toBe("system");
    expect(actor.processId).toBe("projection-relay");
  });

  it("exports audit metadata from actor", () => {
    const actor = resolveOrderActorFromDeviceSession({
      deviceId: "dev-abc",
      tokenId: "tok-abc",
      restaurantId: 3,
      branchId: null,
      role: "expo_display",
      displayName: "Expo",
    });
    expect(orderActorAuditMetadata(actor)).toMatchObject({
      actorKind: "device",
      actorIdentifier: "dev-abc",
      deviceRole: "expo_display",
    });
  });
});
