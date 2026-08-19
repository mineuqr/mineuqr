import { describe, expect, it } from "vitest";
import {
  assertBillAcceptsCollection,
  assertPaidSettlementLines,
  billAmountDueFromCollection,
  capturedCollectionAmounts,
  complimentarySettlementLine,
  defaultPaidSettlementLine,
  isCheckFullyCoveredBySettlements,
  remainingCollectible,
  resolveStaffSettlementLines,
  SettlementValidationError,
} from "../settlementInvariants";

describe("CHECK-SETTLEMENT-METHODS-1 settlement invariants", () => {
  it("accepts a single full-cover paid tender", () => {
    const lines = assertPaidSettlementLines("100.00", [
      { paymentMethod: "cash", amount: "100.00" },
    ]);
    expect(lines).toHaveLength(1);
  });

  it("accepts split tenders that sum to grandTotal", () => {
    const lines = assertPaidSettlementLines("100.00", [
      { paymentMethod: "cash", amount: "40.00" },
      { paymentMethod: "mada", amount: "60.00" },
    ]);
    expect(lines).toHaveLength(2);
  });

  it("rejects split tenders that do not cover grandTotal", () => {
    expect(() =>
      assertPaidSettlementLines("100.00", [
        { paymentMethod: "cash", amount: "40.00" },
      ])
    ).toThrow(SettlementValidationError);
  });

  it("rejects complimentary method on paid settle", () => {
    expect(() =>
      assertPaidSettlementLines("50.00", [
        { paymentMethod: "complimentary", amount: "50.00" },
      ])
    ).toThrow(/Complimentary/);
  });

  it("builds default paid and complimentary lines", () => {
    expect(defaultPaidSettlementLine("12.50")).toEqual({
      paymentMethod: "other",
      amount: "12.50",
      status: "captured",
    });
    expect(complimentarySettlementLine("12.50").paymentMethod).toBe(
      "complimentary"
    );
  });

  it("detects full cover for future partial settlement", () => {
    expect(isCheckFullyCoveredBySettlements("30.00", ["10.00", "20.00"])).toBe(
      true
    );
    expect(isCheckFullyCoveredBySettlements("30.00", ["10.00"])).toBe(false);
  });

  it("amountDue is Bill grandTotal minus captured collection", () => {
    expect(remainingCollectible("100.00", [])).toBe("100.00");
    expect(remainingCollectible("100.00", ["40.00", "25.00"])).toBe("35.00");
    expect(
      remainingCollectible(
        "100.00",
        capturedCollectionAmounts([
          { amount: "40.00", status: "captured", paymentMethod: "cash" },
          {
            amount: "100.00",
            status: "captured",
            paymentMethod: "complimentary",
          },
          { amount: "10.00", status: "voided", paymentMethod: "card" },
        ])
      )
    ).toBe("60.00");
  });

  it("rejects collected amount that exceeds the Bill", () => {
    expect(() => remainingCollectible("10.00", ["10.01"])).toThrow(
      /exceeds Bill grandTotal/
    );
  });

  it("billAmountDueFromCollection is the single amountDue derivation", () => {
    expect(
      billAmountDueFromCollection("100.00", [
        { amount: "40.00", status: "captured", paymentMethod: "cash" },
        {
          amount: "100.00",
          status: "captured",
          paymentMethod: "complimentary",
        },
        { amount: "10.00", status: "voided", paymentMethod: "card" },
      ])
    ).toEqual({ captured: ["40.00"], amountDue: "60.00" });
    expect(billAmountDueFromCollection("25.00", [])).toEqual({
      captured: [],
      amountDue: "25.00",
    });
  });

  it("rejects collection on terminal Bills", () => {
    expect(() => assertBillAcceptsCollection("paid")).toThrow(
      /Cannot collect payment on paid Bill/
    );
    expect(() => assertBillAcceptsCollection("complimentary")).toThrow(
      /complimentary/
    );
    expect(() => assertBillAcceptsCollection("voided")).toThrow(/voided/);
    expect(() => assertBillAcceptsCollection("open")).not.toThrow();
  });

  it("rejects zero and negative paid tender amounts", () => {
    expect(() =>
      assertPaidSettlementLines("10.00", [
        { paymentMethod: "cash", amount: "0.00" },
      ])
    ).toThrow(/must be positive/);
    expect(() =>
      assertPaidSettlementLines("10.00", [
        { paymentMethod: "cash", amount: "-1.00" },
      ])
    ).toThrow(SettlementValidationError);
  });
});

describe("SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 resolveStaffSettlementLines", () => {
  it("fills grandTotal for a single tender without amount", () => {
    expect(resolveStaffSettlementLines("88.50", [{ paymentMethod: "cash" }])).toEqual([
      { paymentMethod: "cash", amount: "88.50", status: "captured" },
    ]);
  });

  it("accepts multi-tender lines with amounts", () => {
    const lines = resolveStaffSettlementLines("100.00", [
      { paymentMethod: "cash", amount: "40.00" },
      { paymentMethod: "mada", amount: "60.00" },
    ]);
    expect(lines).toHaveLength(2);
  });

  it("rejects multi-tender without amounts", () => {
    expect(() =>
      resolveStaffSettlementLines("100.00", [
        { paymentMethod: "cash" },
        { paymentMethod: "mada" },
      ])
    ).toThrow(/Multi-tender/);
  });
});
