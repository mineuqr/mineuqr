import { describe, expect, it } from "vitest";
import {
  LEGACY_NON_TABLE_TABLE_ID,
  LEGACY_NON_TABLE_TABLE_NUMBER,
  ORDERING_RUNTIME_ORDER_IDENTITY_PLATFORM_CAPABILITIES,
  assertPlatformOrderIdentity,
  createDriveLaneFulfilmentAnchor,
  createOrderIdentity,
  createPickupPointFulfilmentAnchor,
  createQueueFulfilmentAnchor,
  createStationFulfilmentAnchor,
  createTableOrderIdentity,
  isNonTableOrderIdentity,
  resolvePlaceOrderPersistFields,
} from "../orderingIdentityContract";

describe("NON-TABLE-PLACE-ORDER-1 identity activation", () => {
  it("platform capabilities include all modes and anchor types", () => {
    expect(
      ORDERING_RUNTIME_ORDER_IDENTITY_PLATFORM_CAPABILITIES.supportedFulfilmentAnchorTypes
    ).toEqual([
      "table",
      "station",
      "pickup_point",
      "queue",
      "drive_lane",
    ]);
    expect(
      ORDERING_RUNTIME_ORDER_IDENTITY_PLATFORM_CAPABILITIES.supportedServiceModes
    ).toContain("counter");
  });

  it("dual-writes table fields from table identity", () => {
    const identity = createTableOrderIdentity({ tableId: 9, tableNumber: 4 });
    expect(resolvePlaceOrderPersistFields({ identity })).toEqual({
      tableId: 9,
      tableNumber: 4,
    });
    expect(isNonTableOrderIdentity(identity)).toBe(false);
  });

  it("dual-writes LEGACY_NON_TABLE sentinels for non-table identity", () => {
    const cases = [
      createOrderIdentity({
        serviceMode: "counter",
        fulfilmentAnchor: createStationFulfilmentAnchor({ stationId: "s1" }),
      }),
      createOrderIdentity({
        serviceMode: "pickup",
        fulfilmentAnchor: createPickupPointFulfilmentAnchor({
          pickupPointId: "p1",
        }),
      }),
      createOrderIdentity({
        serviceMode: "take_away",
        fulfilmentAnchor: createQueueFulfilmentAnchor({
          queueId: "q1",
          ticketLabel: "A12",
        }),
      }),
      createOrderIdentity({
        serviceMode: "drive_thru",
        fulfilmentAnchor: createDriveLaneFulfilmentAnchor({ laneId: "L1" }),
      }),
    ];

    for (const identity of cases) {
      assertPlatformOrderIdentity(identity);
      expect(isNonTableOrderIdentity(identity)).toBe(true);
      expect(resolvePlaceOrderPersistFields({ identity })).toEqual({
        tableId: LEGACY_NON_TABLE_TABLE_ID,
        tableNumber: LEGACY_NON_TABLE_TABLE_NUMBER,
      });
    }
  });

  it("rejects table_service with non-table anchor", () => {
    expect(() =>
      assertPlatformOrderIdentity(
        createOrderIdentity({
          serviceMode: "table_service",
          fulfilmentAnchor: createStationFulfilmentAnchor({ stationId: "s1" }),
        })
      )
    ).toThrow(/table_service requires/);
  });
});
