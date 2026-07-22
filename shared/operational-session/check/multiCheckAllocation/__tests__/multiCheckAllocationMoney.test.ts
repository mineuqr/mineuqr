import { describe, expect, it } from "vitest";
import {
  AllocationExceededError,
  FinancialConservationViolationError,
  NegativeResponsibilityError,
  PaymentValueExceededError,
} from "../multiCheckAllocationErrors";
import {
  assertAllocationConservation,
  assertPortionsWithinResponsibility,
  assertWithinPaymentValueCap,
  computeAllocatedAmount,
  computeRemainingAmount,
  formatAllocationMoney,
  moneyAdd,
  moneyEquals,
  moneySub,
  parseAllocationMoney,
  sumPortionAmounts,
} from "../multiCheckAllocationMoney";

describe("multiCheckAllocationMoney", () => {
  it("parses and formats 2-decimal money", () => {
    expect(parseAllocationMoney("10.005")).toBe(10.01);
    expect(formatAllocationMoney(10)).toBe("10.00");
    expect(moneyEquals("10.00", "10.001")).toBe(true);
    expect(moneyAdd("10.00", "2.50")).toBe("12.50");
    expect(moneySub("10.00", "2.50")).toBe("7.50");
  });

  it("rejects negative money", () => {
    expect(() => parseAllocationMoney("-1")).toThrow();
    expect(() => moneySub("1.00", "2.00")).toThrow(NegativeResponsibilityError);
  });

  it("enforces I-MCA-01 conservation", () => {
    assertAllocationConservation({
      financialResponsibility: "100.00",
      allocatedAmount: "40.00",
      remainingAmount: "60.00",
      status: "applied",
    });
    expect(() =>
      assertAllocationConservation({
        financialResponsibility: "100.00",
        allocatedAmount: "40.00",
        remainingAmount: "50.00",
        status: "applied",
      })
    ).toThrow(FinancialConservationViolationError);
  });

  it("restores full remaining on reversed/cancelled", () => {
    assertAllocationConservation({
      financialResponsibility: "100.00",
      allocatedAmount: "0.00",
      remainingAmount: "100.00",
      status: "reversed",
    });
  });

  it("rejects portions exceeding responsibility or payment cap", () => {
    expect(() =>
      assertPortionsWithinResponsibility("50.00", [
        {
          portionId: "p1",
          allocationId: "a1",
          sequence: 1,
          targetCheckId: 2,
          amount: "60.00",
          applied: false,
          createdAt: "t",
        },
      ])
    ).toThrow(AllocationExceededError);

    expect(() => assertWithinPaymentValueCap("30.00", "40.00")).toThrow(
      PaymentValueExceededError
    );
    assertWithinPaymentValueCap(null, "999.00");
  });

  it("computes allocated and remaining", () => {
    expect(
      computeAllocatedAmount({
        status: "applied",
        portions: [
          {
            portionId: "p1",
            allocationId: "a1",
            sequence: 1,
            targetCheckId: 2,
            amount: "25.00",
            applied: true,
            createdAt: "t",
          },
        ],
        adjustments: [],
        reversals: [],
      })
    ).toBe("25.00");
    expect(computeRemainingAmount("100.00", "25.00")).toBe("75.00");
    expect(
      sumPortionAmounts([
        {
          portionId: "p1",
          allocationId: "a1",
          sequence: 1,
          targetCheckId: 2,
          amount: "10.00",
          applied: false,
          createdAt: "t",
        },
        {
          portionId: "p2",
          allocationId: "a1",
          sequence: 2,
          targetCheckId: 3,
          amount: "15.00",
          applied: false,
          createdAt: "t",
        },
      ])
    ).toBe("25.00");
  });
});
