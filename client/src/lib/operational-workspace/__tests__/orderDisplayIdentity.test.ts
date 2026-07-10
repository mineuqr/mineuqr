import { describe, expect, it } from "vitest";
import {
  formatOperationalOrderHeading,
  operationalDisplayReference,
} from "../orderDisplayIdentity";

describe("orderDisplayIdentity", () => {
  it("uses server-resolved displayReference when present", () => {
    expect(
      operationalDisplayReference({
        orderNumber: "ORD-0245",
        businessDay: "2026-07-10",
        dailyDisplayNumber: 6,
        displayReference: "006",
      })
    ).toBe("006");
  });

  it("resolves via OrderDisplayIdentityResolver when displayReference is absent", () => {
    expect(
      operationalDisplayReference({
        orderNumber: "ORD-0042",
        businessDay: "2026-07-10",
        dailyDisplayNumber: 3,
      })
    ).toBe("003");
  });

  it("falls back to legacy orderNumber for historic orders", () => {
    expect(
      operationalDisplayReference({
        orderNumber: "ORD-0239",
        businessDay: null,
        dailyDisplayNumber: null,
      })
    ).toBe("ORD-0239");
  });

  it("formats operational headings with prefix", () => {
    expect(
      formatOperationalOrderHeading({
        orderNumber: "ORD-0245",
        businessDay: "2026-07-10",
        dailyDisplayNumber: 6,
        displayReference: "006",
      })
    ).toBe("#006");
  });
});
