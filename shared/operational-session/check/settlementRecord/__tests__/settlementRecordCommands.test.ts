/**
 * SETTLEMENT-RECORD-IMPLEMENTATION-1 — domain command / snapshot / invariant tests.
 */
import { describe, expect, it } from "vitest";
import type { OperationalCheck } from "../../checkContract";
import {
  assertAppendOnly,
  assertMonetaryConsistencyWithCheck,
  createCompensatingSettlementRecord,
  createSettlementRecord,
  forbidSettlementRecordMutation,
  freezeBusinessDayFromTimestamp,
  ImmutabilityViolationError,
  recordKindForCheckOutcome,
} from "../index";

function makeCheck(
  overrides: Partial<OperationalCheck> = {}
): OperationalCheck {
  return {
    id: 100,
    restaurantId: 1,
    sessionId: 10,
    outcome: "open",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: true,
      mode: "exclusive",
      components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
    },
    serviceChargeSnapshot: null,
    billDiscountAmount: "5.00",
    subtotal: "100.00",
    taxAmount: "14.25",
    taxBreakdown: {
      totalTaxAmount: "14.25",
      lines: [
        {
          componentId: "vat",
          name: "VAT",
          ratePercent: "15.00",
          amount: "14.25",
        },
      ],
    },
    grandTotal: "109.25",
    snapshotsFrozenAt: "2026-07-23 12:00:00",
    totalsFrozenAt: null,
    settledAt: null,
    voidedAt: null,
    createdAt: "2026-07-23 12:00:00",
    updatedAt: "2026-07-23 12:00:00",
    ...overrides,
  };
}

describe("Settlement Record domain commands", () => {
  it("creates settlement record by copying Check money (never calculating)", () => {
    const check = makeCheck();
    const result = createSettlementRecord({
      check,
      outcome: "paid",
      createdAt: "2026-07-23 13:00:00",
      orderIds: [55, 56],
      paymentSnapshotOverride: [
        {
          settlementTransactionId: null,
          paymentMethod: "cash",
          amount: "109.25",
          currencyCode: "SAR",
          status: "captured",
          businessTimestamp: "2026-07-23 13:00:00",
          reference: null,
          externalReference: null,
        },
      ],
    });

    expect(result.outcome).toBe("applied");
    expect(result.record.subtotal).toBe("100.00");
    expect(result.record.discountAmount).toBe("5.00");
    expect(result.record.taxAmount).toBe("14.25");
    expect(result.record.grandTotal).toBe("109.25");
    expect(result.record.recordKind).toBe("settlement");
    expect(result.record.recordGeneration).toBe(1);
    expect(result.record.producer).toBe("check_aggregate");
    expect(result.record.businessDay).toBe("2026-07-23");
    expect(result.record.orderRefs).toEqual([{ orderId: 55 }, { orderId: 56 }]);
    expect(result.events[0]?.eventType).toBe("SettlementRecordCreated");
    expect(result.events[0]?.claimKey).toBe("sr_created:1:100:settlement:1");
  });

  it("returns already_applied when existingRecord is provided", () => {
    const check = makeCheck();
    const first = createSettlementRecord({
      check,
      outcome: "paid",
      createdAt: "2026-07-23 13:00:00",
      orderIds: [],
    });
    const retry = createSettlementRecord({
      check,
      outcome: "paid",
      createdAt: "2026-07-23 13:00:00",
      orderIds: [],
      existingRecord: first.record,
    });
    expect(retry.outcome).toBe("already_applied");
    expect(retry.events).toHaveLength(0);
    expect(retry.record.settlementRecordId).toBe(
      first.record.settlementRecordId
    );
  });

  it("maps voided Check to recordKind=void", () => {
    expect(recordKindForCheckOutcome("voided")).toBe("void");
    const result = createSettlementRecord({
      check: makeCheck(),
      outcome: "voided",
      createdAt: "2026-07-23 13:00:00",
      orderIds: [],
    });
    expect(result.record.recordKind).toBe("void");
    expect(result.record.outcome).toBe("voided");
  });

  it("creates compensating refund linked to prior record", () => {
    const prior = createSettlementRecord({
      check: makeCheck(),
      outcome: "paid",
      createdAt: "2026-07-23 13:00:00",
      orderIds: [],
    }).record;

    const refund = createCompensatingSettlementRecord({
      check: makeCheck({ outcome: "paid", settledAt: "2026-07-23 13:00:00" }),
      outcome: "paid",
      recordKind: "refund",
      recordGeneration: 2,
      priorSettlementRecordId: prior.settlementRecordId,
      createdAt: "2026-07-23 14:00:00",
      orderIds: [],
    });

    expect(refund.outcome).toBe("applied");
    expect(refund.record.priorSettlementRecordId).toBe(
      prior.settlementRecordId
    );
    expect(refund.record.recordGeneration).toBe(2);
  });

  it("allows the first CF-backed refund document without a prior Settlement Record", () => {
    const refund = createCompensatingSettlementRecord({
      check: makeCheck({ outcome: "paid", settledAt: "2026-07-23 13:00:00" }),
      outcome: "paid",
      recordKind: "refund",
      recordGeneration: 1,
      priorSettlementRecordId: "",
      createdAt: "2026-07-23 14:00:00",
      orderIds: [],
    });
    expect(refund.outcome).toBe("applied");
    expect(refund.record.recordKind).toBe("refund");
    expect(refund.record.priorSettlementRecordId).toBeNull();
  });

  it("still requires priorSettlementRecordId for reversal compensation", () => {
    expect(() =>
      createCompensatingSettlementRecord({
        check: makeCheck({ outcome: "paid", settledAt: "2026-07-23 13:00:00" }),
        outcome: "paid",
        recordKind: "reversal",
        recordGeneration: 2,
        priorSettlementRecordId: "",
        createdAt: "2026-07-23 14:00:00",
        orderIds: [],
      })
    ).toThrow(/requires priorSettlementRecordId/);
  });

  it("rejects money mismatch against Check freeze", () => {
    const check = makeCheck();
    const result = createSettlementRecord({
      check,
      outcome: "paid",
      createdAt: "2026-07-23 13:00:00",
      orderIds: [],
    });
    expect(() =>
      assertMonetaryConsistencyWithCheck({
        record: { ...result.record, grandTotal: "999.00" },
        check: {
          subtotal: check.subtotal,
          billDiscountAmount: check.billDiscountAmount,
          taxAmount: check.taxAmount,
          grandTotal: check.grandTotal,
          outcome: "paid",
        },
      })
    ).toThrow(/grandTotal copy mismatch/);
  });

  it("forbids UPDATE/DELETE (append-only)", () => {
    expect(() => assertAppendOnly("update")).toThrow(ImmutabilityViolationError);
    expect(() => assertAppendOnly("delete")).toThrow(ImmutabilityViolationError);
    expect(() => forbidSettlementRecordMutation()).toThrow(/forbidden/);
  });

  it("freezes businessDay from timestamp without live settings", () => {
    expect(freezeBusinessDayFromTimestamp("2026-07-23 18:00:00")).toBe(
      "2026-07-23"
    );
  });
});
