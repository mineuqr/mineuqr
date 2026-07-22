import { describe, expect, it } from "vitest";
import {
  assertCheckConservation,
  assertPaymentWithinOutstanding,
  assertTenderTotalsMatchPayment,
  buildCheckFinancialResponsibility,
  calculateOutstandingBalance,
  computeUnallocated,
  formatSplitPaymentMoney,
  moneyAdd,
  moneyEquals,
  moneySub,
  parseSplitPaymentMoney,
} from "../splitPaymentMoney";
import {
  AllocationExceededError,
  FinancialConservationViolationError,
  OutstandingNegativeError,
  PaymentExceedsOutstandingError,
  TenderMismatchError,
} from "../splitPaymentErrors";
import { assertAllocationWithinPayment } from "../splitPaymentMoney";

describe("splitPaymentMoney", () => {
  it("formats and parses 2-decimal money", () => {
    expect(formatSplitPaymentMoney(10)).toBe("10.00");
    expect(parseSplitPaymentMoney("10.005")).toBe(10.01);
    expect(moneyEquals("10.00", "10.000")).toBe(true);
  });

  it("calculates outstanding = responsibility − applied", () => {
    expect(calculateOutstandingBalance("100.00", "40.00")).toBe("60.00");
    const snap = buildCheckFinancialResponsibility({
      restaurantId: 1,
      checkId: 2,
      financialResponsibility: "100.00",
      appliedPaymentValue: "40.00",
    });
    expect(snap.outstandingBalance).toBe("60.00");
    assertCheckConservation(snap);
  });

  it("enforces I-SP-01 conservation", () => {
    expect(() =>
      assertCheckConservation({
        restaurantId: 1,
        checkId: 1,
        financialResponsibility: "100.00",
        appliedPaymentValue: "40.00",
        outstandingBalance: "50.00",
      })
    ).toThrow(FinancialConservationViolationError);
  });

  it("never allows negative outstanding via subtraction", () => {
    expect(() => moneySub("10.00", "20.00")).toThrow(OutstandingNegativeError);
  });

  it("rejects payment exceeding outstanding (I-SP-05)", () => {
    expect(() =>
      assertPaymentWithinOutstanding("50.00", "40.00")
    ).toThrow(PaymentExceedsOutstandingError);
  });

  it("rejects allocation exceeding payment (I-SP-04)", () => {
    expect(() =>
      assertAllocationWithinPayment("30.00", "20.00", "15.00")
    ).toThrow(AllocationExceededError);
  });

  it("requires tender totals to match payment", () => {
    expect(() =>
      assertTenderTotalsMatchPayment("50.00", [
        {
          tenderId: "t1",
          restaurantId: 1,
          checkId: 1,
          paymentId: "p1",
          method: "cash",
          amount: "20.00",
          createdAt: "t",
        },
        {
          tenderId: "t2",
          restaurantId: 1,
          checkId: 1,
          paymentId: "p1",
          method: "visa",
          amount: "20.00",
          createdAt: "t",
        },
      ])
    ).toThrow(TenderMismatchError);
  });

  it("computes unallocated and moneyAdd", () => {
    expect(computeUnallocated("100.00", "35.50")).toBe("64.50");
    expect(moneyAdd("10.00", "0.10")).toBe("10.10");
  });
});
