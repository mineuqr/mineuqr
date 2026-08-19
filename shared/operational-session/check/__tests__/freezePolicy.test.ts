import { describe, expect, it } from "vitest";
import {
  decideCheckRecalculation,
  isCheckFinanciallyMutable,
} from "../freezePolicy";

describe("CHECK-MANAGEMENT-ARCHITECTURE-1 freeze policy", () => {
  it("allows recalculation only for open checks without totalsFrozenAt", () => {
    expect(decideCheckRecalculation("open", null)).toEqual({
      allowed: true,
      reason: "open_check",
    });
  });

  it("forbids recalculation after paid / complimentary / voided", () => {
    for (const outcome of ["paid", "complimentary", "voided"] as const) {
      expect(decideCheckRecalculation(outcome, "2026-07-16T00:00:00.000Z")).toEqual(
        {
          allowed: false,
          reason: "totals_frozen_terminal",
        }
      );
    }
  });

  it("OPEN is the only financially mutable Bill state", () => {
    expect(isCheckFinanciallyMutable("open", null)).toBe(true);
    for (const outcome of ["paid", "complimentary", "voided"] as const) {
      expect(isCheckFinanciallyMutable(outcome, "2026-07-16T00:00:00.000Z")).toBe(
        false
      );
    }
  });
});
