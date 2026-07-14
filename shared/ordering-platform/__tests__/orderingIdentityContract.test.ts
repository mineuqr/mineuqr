import { describe, expect, it } from "vitest";
import {
  DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES,
  createTableFulfilmentAnchor,
  createTableOrderIdentity,
  deriveFulfilmentLabel,
  legacyTableFieldsFromIdentity,
  resolvePlaceOrderSessionId,
  resolvePlaceOrderTableFields,
} from "../orderingIdentityContract";

describe("ORDER-IDENTITY-RUNTIME-1 identity contracts", () => {
  it("defaults runtime policies to table_service + table only", () => {
    expect(DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES.defaultServiceMode).toBe(
      "table_service"
    );
    expect([
      ...DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES.supportedServiceModes,
    ]).toEqual(["table_service"]);
    expect([
      ...DEFAULT_ORDERING_RUNTIME_ORDER_IDENTITY_POLICIES
        .supportedFulfilmentAnchorTypes,
    ]).toEqual(["table"]);
  });

  it("creates table Fulfilment Anchor with fulfilment label", () => {
    const anchor = createTableFulfilmentAnchor({ tableId: 9, tableNumber: 4 });
    expect(anchor.anchorType).toBe("table");
    expect(anchor.fulfilmentLabel).toBe("4");
    expect(deriveFulfilmentLabel(anchor)).toBe("4");
  });

  it("creates table Order Identity with service mode and session pointer", () => {
    const identity = createTableOrderIdentity({
      tableId: 9,
      tableNumber: 4,
      sessionId: 55,
      sessionToken: "tok-abc",
    });
    expect(identity.serviceMode).toBe("table_service");
    expect(identity.fulfilmentAnchor.anchorType).toBe("table");
    expect(identity.operationalSession.sessionId).toBe(55);
    expect(identity.operationalSession.sessionToken).toBe("tok-abc");
    expect(identity.operationalSession.anchorType).toBe("table");
  });

  it("bridges identity to legacy table fields for Order Domain dual-write", () => {
    const identity = createTableOrderIdentity({
      tableId: 3,
      tableNumber: 12,
      sessionId: 55,
    });
    expect(legacyTableFieldsFromIdentity(identity)).toEqual({
      tableId: 3,
      tableNumber: 12,
    });
    expect(
      resolvePlaceOrderTableFields({
        identity,
        tableId: 999,
        tableNumber: 999,
      })
    ).toEqual({ tableId: 3, tableNumber: 12 });
    expect(
      resolvePlaceOrderTableFields({
        identity: null,
        tableId: 7,
        tableNumber: 2,
      })
    ).toEqual({ tableId: 7, tableNumber: 2 });
    expect(resolvePlaceOrderSessionId({ identity, sessionId: 1 })).toBe(55);
    expect(resolvePlaceOrderSessionId({ identity: null, sessionId: 8 })).toBe(8);
  });
});
