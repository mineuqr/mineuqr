import { describe, expect, it } from "vitest";
import {
  createStationFulfilmentAnchor,
  createTableOrderIdentity,
} from "../orderingIdentityContract";
import {
  fulfilmentProjectionFromIdentity,
  fulfilmentProjectionFromLegacyTable,
  resolveFulfilmentProjection,
} from "../orderFulfilmentProjection";
import { createOrderIdentity } from "../orderingIdentityContract";

describe("OPERATIONAL-FULFILMENT-PROJECTION-1 fulfilment projection", () => {
  it("projects table identity stamps", () => {
    const identity = createTableOrderIdentity({
      tableId: 9,
      tableNumber: 12,
      sessionId: 55,
    });
    expect(fulfilmentProjectionFromIdentity(identity)).toEqual({
      serviceMode: "table_service",
      fulfilmentAnchorType: "table",
      fulfilmentLabel: "12",
      operationalSessionId: 55,
    });
  });

  it("projects station identity stamps", () => {
    const identity = createOrderIdentity({
      serviceMode: "counter",
      fulfilmentAnchor: createStationFulfilmentAnchor({
        stationId: "front",
        fulfilmentLabel: "Station A",
      }),
    });
    expect(fulfilmentProjectionFromIdentity(identity)).toEqual({
      serviceMode: "counter",
      fulfilmentAnchorType: "station",
      fulfilmentLabel: "Station A",
      operationalSessionId: null,
    });
  });

  it("derives legacy table and takeaway from tableNumber", () => {
    expect(
      fulfilmentProjectionFromLegacyTable({ tableNumber: 4, sessionId: 1 })
    ).toMatchObject({
      serviceMode: "table_service",
      fulfilmentAnchorType: "table",
      fulfilmentLabel: "4",
    });
    expect(fulfilmentProjectionFromLegacyTable({ tableNumber: 0 })).toMatchObject({
      serviceMode: "take_away",
      fulfilmentAnchorType: "station",
      fulfilmentLabel: "Take Away",
    });
  });

  it("prefers stored stamps over legacy derivation", () => {
    expect(
      resolveFulfilmentProjection({
        serviceMode: "counter",
        fulfilmentAnchorType: "station",
        fulfilmentLabel: "Station A",
        tableNumber: 0,
        sessionId: null,
      }).fulfilmentLabel
    ).toBe("Station A");
  });
});
