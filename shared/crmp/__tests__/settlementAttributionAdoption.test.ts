import { describe, expect, it } from "vitest";
import {
  cashCustodyAmountForRefundRecord,
  isAttributionEligible,
  isRefundAttributionEligible,
  skippedAttribution,
  sumCashTenderAmounts,
} from "../settlementContext/settlementAttributionAdoption";

describe("SETTLEMENT-ATTRIBUTION-ADOPTION-1 pure helpers", () => {
  it("sums cash tenders only", () => {
    expect(
      sumCashTenderAmounts([
        { paymentMethod: "cash", amount: "10.00" },
        { paymentMethod: "visa", amount: "40.00" },
        { paymentMethod: "cash", amount: "5.50" },
      ])
    ).toBe("15.50");
  });

  it("card-only yields zero cash", () => {
    expect(
      sumCashTenderAmounts([{ paymentMethod: "mada", amount: "99.00" }])
    ).toBe("0.00");
  });

  it("eligible when paid + collectionFactId without Settlement Record", () => {
    expect(
      isAttributionEligible({
        outcome: "paid",
        collectionFactId: "cf:1",
        registerId: "reg_1",
        financialShiftId: "fsh_1",
        operatorUserId: 10,
      })
    ).toEqual({ ok: true });
  });

  it("eligible when paid + full SR context", () => {
    expect(
      isAttributionEligible({
        outcome: "paid",
        settlementRecordId: "sr:1",
        registerId: "reg_1",
        financialShiftId: "fsh_1",
        operatorUserId: 10,
      })
    ).toEqual({ ok: true });
  });

  it("complimentary is eligible", () => {
    expect(
      isAttributionEligible({
        outcome: "complimentary",
        settlementRecordId: "sr:1",
        registerId: "reg_1",
        financialShiftId: "fsh_1",
        operatorUserId: 10,
      }).ok
    ).toBe(true);
  });

  it("void is not attributable", () => {
    const r = isAttributionEligible({
      outcome: "voided",
      settlementRecordId: "sr:1",
      registerId: "reg_1",
      financialShiftId: "fsh_1",
      operatorUserId: 10,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.gaps).toContain("outcome_not_attributable");
  });

  it("missing shift fails open as ineligible", () => {
    const r = isAttributionEligible({
      outcome: "paid",
      settlementRecordId: "sr:1",
      registerId: "reg_1",
      financialShiftId: null,
      operatorUserId: 10,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.gaps).toContain("financial_shift_unavailable");
  });

  it("skippedAttribution helper", () => {
    const s = skippedAttribution({
      gaps: ["x"],
      reason: "r",
      settlementRecordId: "sr:1",
    });
    expect(s.outcome).toBe("skipped");
    expect(s.attributionId).toBeNull();
  });

  it("refund eligibility is recordKind-gated (not Check outcome)", () => {
    expect(
      isRefundAttributionEligible({
        recordKind: "refund",
        settlementRecordId: "sr:r",
        registerId: "reg_1",
        financialShiftId: "fsh_1",
        operatorUserId: 1,
      }).ok
    ).toBe(true);
    expect(
      cashCustodyAmountForRefundRecord({
        paymentSnapshot: [{ paymentMethod: "cash", amount: "5.00" }],
      })
    ).toBe("-5.00");
  });
});
