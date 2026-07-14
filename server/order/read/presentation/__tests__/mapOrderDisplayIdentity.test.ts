import { describe, expect, it } from "vitest";
import { mapOrderDisplayIdentityFields } from "../mapOrderDisplayIdentity";

describe("mapOrderDisplayIdentityFields", () => {
  it("resolves business identity via OrderDisplayIdentityResolver", () => {
    const result = mapOrderDisplayIdentityFields({
      orderNumber: "ORD-0245",
      businessDay: "2026-07-10",
      dailyDisplayNumber: 6,
    });

    expect(result.displayReference).toBe("T #006");
    expect(result.displayOrderNumber).toBe("006");
    expect(result.identityScope).toBe("TABLE");
    expect(result.businessDay).toBe("2026-07-10");
    expect(result.dailyDisplayNumber).toBe(6);
  });

  it("falls back to legacy orderNumber for historic rows", () => {
    const result = mapOrderDisplayIdentityFields({
      orderNumber: "ORD-0239",
      businessDay: null,
      dailyDisplayNumber: null,
    });

    expect(result.displayReference).toBe("ORD-0239");
    expect(result.displayOrderNumber).toBe("ORD-0239");
  });
});
