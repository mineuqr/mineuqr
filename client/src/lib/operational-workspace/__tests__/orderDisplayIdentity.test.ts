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
        displayReference: "T #006",
      })
    ).toBe("T #006");
  });

  it("resolves via OrderDisplayIdentityResolver when displayReference is absent", () => {
    expect(
      operationalDisplayReference({
        orderNumber: "ORD-0042",
        businessDay: "2026-07-10",
        dailyDisplayNumber: 3,
      })
    ).toBe("T #003");
  });

  it("resolves Kiosk scope from fulfilment stamps when displayReference is absent", () => {
    expect(
      operationalDisplayReference({
        orderNumber: "ORD-0042",
        businessDay: "2026-07-10",
        dailyDisplayNumber: 1,
        fulfilmentAnchorType: "station",
        serviceMode: "counter",
      })
    ).toBe("K #001");
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

  it("formats operational headings from Business Identity without local assembly", () => {
    expect(
      formatOperationalOrderHeading({
        orderNumber: "ORD-0245",
        businessDay: "2026-07-10",
        dailyDisplayNumber: 6,
        displayReference: "T #006",
      })
    ).toBe("T #006");
  });
});
