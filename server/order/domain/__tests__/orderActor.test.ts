import { describe, expect, it } from "vitest";
import {
  canAdvanceOrder,
  canCancelOrder,
  orderActorIdentifier,
  type DeviceActor,
  type SystemActor,
  type UserActor,
} from "../value-objects/OrderActor";

const ownerUser: UserActor = {
  kind: "user",
  userId: 10,
  dashboardRole: "owner",
  displayName: "Owner",
  restaurantId: 1,
};

const deviceActor: DeviceActor = {
  kind: "device",
  deviceId: "dev-1",
  tokenId: "tok-1",
  deviceRole: "kitchen_display",
  displayName: "Kitchen Screen",
  restaurantId: 1,
};

const systemActor: SystemActor = {
  kind: "system",
  processId: "order-relay",
  displayName: "Order Event Relay",
  restaurantId: 1,
};

describe("OrderActor", () => {
  it("identifies actor types canonically", () => {
    expect(orderActorIdentifier(ownerUser)).toBe("user:10");
    expect(orderActorIdentifier(deviceActor)).toBe("device:dev-1");
    expect(orderActorIdentifier(systemActor)).toBe("system:order-relay");
  });

  it("allows dashboard users and devices to advance orders", () => {
    expect(canAdvanceOrder(ownerUser)).toBe(true);
    expect(canAdvanceOrder(deviceActor)).toBe(true);
    expect(canAdvanceOrder(systemActor)).toBe(true);
  });

  it("restricts cancellation to dashboard users", () => {
    expect(canCancelOrder(ownerUser)).toBe(true);
    expect(canCancelOrder(deviceActor)).toBe(false);
    expect(canCancelOrder(systemActor)).toBe(false);
  });
});
