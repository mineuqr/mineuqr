import { describe, expect, it } from "vitest";
import { resolveOrderDisplayIdentity } from "../OrderDisplayIdentityResolver";

describe("OrderDisplayIdentityResolver", () => {
  it("resolves display identity from persisted business fields", () => {
    const identity = resolveOrderDisplayIdentity({
      orderNumber: "ORD-0042",
      businessDay: "2026-07-10",
      dailyDisplayNumber: 3,
    });

    expect(identity.displayOrderNumber).toBe("003");
    expect(identity.displayReference).toBe("T #003");
    expect(identity.identityScope).toBe("TABLE");
    expect(identity.businessDay).toBe("2026-07-10");
  });

  it("resolves Kiosk-scoped display identity from fulfilment stamps", () => {
    const identity = resolveOrderDisplayIdentity({
      orderNumber: "ORD-0042",
      businessDay: "2026-07-10",
      dailyDisplayNumber: 1,
      fulfilmentAnchorType: "station",
      serviceMode: "counter",
    });

    expect(identity.identityScope).toBe("KIOSK");
    expect(identity.displayReference).toBe("K #001");
  });

  it("resolves Waiter-scoped display identity from explicit identityScope", () => {
    const identity = resolveOrderDisplayIdentity({
      orderNumber: "ORD-0042",
      businessDay: "2026-07-10",
      dailyDisplayNumber: 1,
      identityScope: "WAITER",
      fulfilmentAnchorType: "table",
      serviceMode: "table_service",
    });

    expect(identity.identityScope).toBe("WAITER");
    expect(identity.displayReference).toBe("WT #001");
  });

  it("falls back to legacy orderNumber for historic orders", () => {
    const identity = resolveOrderDisplayIdentity({
      orderNumber: "ORD-0042",
      businessDay: null,
      dailyDisplayNumber: null,
    });

    expect(identity.displayReference).toBe("ORD-0042");
    expect(identity.displayOrderNumber).toBe("ORD-0042");
  });
});
