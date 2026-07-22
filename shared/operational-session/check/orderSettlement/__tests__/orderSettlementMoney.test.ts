import { describe, expect, it } from "vitest";
import {
  assertAllocationValid,
  assertCoverageAmount,
  assertOutstandingAlgebra,
  assertSnapshotsReconcileToOrdersSubtotal,
  buildMoneyAmounts,
  calculateOutstandingAmount,
  formatOrderSettlementMoney,
  isFullySettled,
  isPartiallySettled,
  parseOrderSettlementMoney,
} from "../orderSettlementMoney";
import {
  AllocationValidationFailedError,
  CoverageValidationFailedError,
  InvalidMoneyAmountError,
  OutstandingAmountMismatchError,
  SettlementOverflowError,
} from "../orderSettlementErrors";

describe("ORDER-SETTLEMENT-DOMAIN-1 money calculations", () => {
  it("parses and formats money", () => {
    expect(parseOrderSettlementMoney("10.5")).toBe(10.5);
    expect(formatOrderSettlementMoney(10.5)).toBe("10.50");
  });

  it("rejects negative money", () => {
    expect(() => parseOrderSettlementMoney("-1")).toThrow(InvalidMoneyAmountError);
  });

  it("calculates outstanding", () => {
    expect(calculateOutstandingAmount("100.00", "40.00")).toBe("60.00");
  });

  it("rejects settled overflow", () => {
    expect(() => calculateOutstandingAmount("10.00", "11.00")).toThrow(
      SettlementOverflowError
    );
  });

  it("builds amounts with algebra", () => {
    const m = buildMoneyAmounts({
      orderTotalSnapshot: "25.00",
      settledAmount: "10.00",
    });
    expect(m.outstandingAmount).toBe("15.00");
    expect(m.allocatedAmount).toBe("25.00");
    assertOutstandingAlgebra(m);
    assertAllocationValid(m);
  });

  it("detects full and partial settlement", () => {
    const full = buildMoneyAmounts({
      orderTotalSnapshot: "10.00",
      settledAmount: "10.00",
    });
    expect(isFullySettled(full)).toBe(true);
    expect(isPartiallySettled(full)).toBe(false);

    const partial = buildMoneyAmounts({
      orderTotalSnapshot: "10.00",
      settledAmount: "4.00",
    });
    expect(isPartiallySettled(partial)).toBe(true);
  });

  it("validates coverage amounts", () => {
    expect(assertCoverageAmount("10.00", "10.00")).toBe("10.00");
    expect(assertCoverageAmount("10.00", "3.00", { allowPartial: true })).toBe(
      "3.00"
    );
    expect(() => assertCoverageAmount("10.00", "3.00")).toThrow(
      CoverageValidationFailedError
    );
    expect(() => assertCoverageAmount("10.00", "11.00")).toThrow(
      SettlementOverflowError
    );
  });

  it("reconciles snapshots to orders subtotal (I-OS-05)", () => {
    assertSnapshotsReconcileToOrdersSubtotal(["10.00", "5.50"], "15.50");
    expect(() =>
      assertSnapshotsReconcileToOrdersSubtotal(["10.00"], "9.00")
    ).toThrow(AllocationValidationFailedError);
  });

  it("detects outstanding mismatch", () => {
    expect(() =>
      assertOutstandingAlgebra({
        orderTotalSnapshot: "10.00",
        settledAmount: "4.00",
        outstandingAmount: "7.00",
        allocatedAmount: "10.00",
      })
    ).toThrow(OutstandingAmountMismatchError);
  });
});
