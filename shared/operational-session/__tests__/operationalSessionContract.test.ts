import { describe, expect, it } from "vitest";
import {
  OPERATIONAL_SESSION_ACTIVATED_ANCHOR_TYPES,
  OPERATIONAL_SESSION_ANCHOR_TYPES,
  createTableSessionAnchor,
  isOperationalSessionAnchorActivated,
  uniquenessPolicyForAnchor,
} from "../operationalSessionContract";

describe("OPERATIONAL-SESSION-PLATFORM-1 contracts", () => {
  it("defines typed Session Anchor vocabulary including table", () => {
    expect([...OPERATIONAL_SESSION_ANCHOR_TYPES]).toEqual([
      "table",
      "station",
      "pickup_point",
      "queue",
      "drive_lane",
    ]);
  });

  it("activates all Session Anchor types for resolution capability", () => {
    expect([...OPERATIONAL_SESSION_ACTIVATED_ANCHOR_TYPES]).toEqual([
      "table",
      "station",
      "pickup_point",
      "queue",
      "drive_lane",
    ]);
    expect(isOperationalSessionAnchorActivated("table")).toBe(true);
    expect(isOperationalSessionAnchorActivated("station")).toBe(true);
    expect(isOperationalSessionAnchorActivated("pickup_point")).toBe(true);
  });

  it("preserves one-open-per-anchor uniqueness for table", () => {
    expect(uniquenessPolicyForAnchor("table")).toBe("one_open_per_anchor");
    expect(uniquenessPolicyForAnchor("queue")).toBe("none");
  });

  it("builds table Session Anchor with opaque identity", () => {
    const anchor = createTableSessionAnchor({ tableId: 9, tableNumber: 4 });
    expect(anchor.anchorType).toBe("table");
    expect(anchor.identity).toBe("9");
    expect(anchor.tableId).toBe(9);
    expect(anchor.tableNumber).toBe(4);
  });
});
