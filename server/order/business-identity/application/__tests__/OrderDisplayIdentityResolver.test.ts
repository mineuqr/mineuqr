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
    expect(identity.displayReference).toBe("003");
    expect(identity.businessDay).toBe("2026-07-10");
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
