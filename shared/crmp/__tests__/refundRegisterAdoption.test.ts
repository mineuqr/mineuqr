/**
 * REFUND-REGISTER-ADOPTION-1 — pure custody / eligibility helpers.
 */
import { describe, expect, it } from "vitest";
import {
  cashCustodyAmountForRefundRecord,
  computeExpectedCash,
  createSettlementAttribution,
  isRefundAttributionEligible,
  openFinancialShift,
} from "../index";
import {
  activateRegister,
  openRegister,
  provisionRegister,
} from "../register/registerCommands";

function openShift() {
  const catalog = activateRegister({
    register: provisionRegister({
      registerId: "reg_1",
      restaurantId: 1,
      code: "FRONT",
      registerType: "counter",
      displayName: "Front",
      createdAt: "t0",
    }),
    at: "t1",
  });
  const register = openRegister({
    register: catalog,
    at: "t1b",
    operatorUserId: 10,
  });
  return openFinancialShift({
    financialShiftId: "fsh_1",
    drawerId: "drw_1",
    openingMovementId: "mov_1",
    register,
    hasActiveShiftOnRegister: false,
    restaurantId: 1,
    operatorUserId: 10,
    openingFloatAmount: "100.00",
    currencyCode: "SAR",
    openedAt: "t2",
    shiftNumber: 1,
  });
}

describe("REFUND-REGISTER-ADOPTION-1 helpers", () => {
  it("refund eligibility requires recordKind=refund + full context", () => {
    expect(
      isRefundAttributionEligible({
        recordKind: "refund",
        settlementRecordId: "sr:1:1:refund:2",
        registerId: "reg_1",
        financialShiftId: "fsh_1",
        operatorUserId: 10,
      })
    ).toEqual({ ok: true });
  });

  it("settlement kind is not refund-attributable", () => {
    const r = isRefundAttributionEligible({
      recordKind: "settlement",
      settlementRecordId: "sr:1:1:settlement:1",
      registerId: "reg_1",
      financialShiftId: "fsh_1",
      operatorUserId: 10,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.gaps).toContain("record_kind_not_refund");
  });

  it("tenant isolation: missing operator is ineligible", () => {
    const r = isRefundAttributionEligible({
      recordKind: "refund",
      settlementRecordId: "sr:1:1:refund:2",
      registerId: "reg_1",
      financialShiftId: "fsh_1",
      operatorUserId: null,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.gaps).toContain("operator_unavailable");
  });

  it("cash refund custody amount is signed negative", () => {
    expect(
      cashCustodyAmountForRefundRecord({
        paymentSnapshot: [
          { paymentMethod: "cash", amount: "25.00" },
          { paymentMethod: "visa", amount: "10.00" },
        ],
      })
    ).toBe("-25.00");
  });

  it("card-only / mixed non-cash refund custody is zero", () => {
    expect(
      cashCustodyAmountForRefundRecord({
        paymentSnapshot: [{ paymentMethod: "mada", amount: "40.00" }],
      })
    ).toBe("0.00");
  });

  it("cash refund attribution decreases expected cash (shift balancing)", () => {
    let shift = openShift();
    const sale = createSettlementAttribution({
      shift,
      attributionId: "att_sale",
      settlementRecordId: "sr:1:1:settlement:1",
      operatorUserId: 10,
      cashTenderAmount: "40.00",
      attributedAt: "t3",
    });
    shift = sale.shift;
    expect(computeExpectedCash(shift)).toBe("140.00");

    const refund = createSettlementAttribution({
      shift,
      attributionId: "att_refund",
      settlementRecordId: "sr:1:1:refund:2",
      operatorUserId: 10,
      cashTenderAmount: "-25.00",
      attributedAt: "t4",
    });
    expect(refund.alreadyApplied).toBe(false);
    expect(refund.attribution.cashTenderAmount).toBe("-25.00");
    expect(computeExpectedCash(refund.shift)).toBe("115.00");
  });

  it("idempotent retry by settlementRecordId", () => {
    let shift = openShift();
    const first = createSettlementAttribution({
      shift,
      attributionId: "att_1",
      settlementRecordId: "sr:1:1:refund:2",
      operatorUserId: 10,
      cashTenderAmount: "-10.00",
      attributedAt: "t3",
    });
    shift = first.shift;
    const second = createSettlementAttribution({
      shift,
      attributionId: "att_2",
      settlementRecordId: "sr:1:1:refund:2",
      operatorUserId: 10,
      cashTenderAmount: "-99.00",
      attributedAt: "t4",
      existingBySettlementRecordId: first.attribution,
    });
    expect(second.alreadyApplied).toBe(true);
    expect(second.attribution.cashTenderAmount).toBe("-10.00");
    expect(computeExpectedCash(second.shift)).toBe("90.00");
  });
});
