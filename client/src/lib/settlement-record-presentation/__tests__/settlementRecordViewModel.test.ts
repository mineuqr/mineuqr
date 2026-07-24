/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — ViewModel helpers.
 */
import { describe, expect, it } from "vitest";
import { computeRemainingDisplay } from "../settlementRecordViewModel";

describe("computeRemainingDisplay", () => {
  it("shows remaining as outstanding minus amount paid", () => {
    expect(computeRemainingDisplay("100.00", "40.00")).toBe("60.00");
  });

  it("clamps remaining at zero", () => {
    expect(computeRemainingDisplay("50.00", "50.00")).toBe("0.00");
    expect(computeRemainingDisplay("50.00", "60.00")).toBe("0.00");
  });
});
