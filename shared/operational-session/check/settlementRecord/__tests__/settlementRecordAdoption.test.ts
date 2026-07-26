/**
 * REFUND-SETTLEMENT-RECORD-ADOPTION-1 — Settlement Record native refund adoption.
 */
import { describe, expect, it } from "vitest";
import type { OperationalCheck } from "../../checkContract";
import {
  assertSettlementRecordAppendOnlyOperation,
  assertSettlementRecordChainIntegrity,
  createCompensatingSettlementRecord,
  createSettlementRecord,
  forbidSettlementRecordMutation,
  isCompensatingSettlementRecord,
  isRefundSettlementRecord,
  sortSettlementRecordsChronologically,
  sortSettlementRecordsNewestFirst,
  UnsupportedSettlementRecordOperationError,
  type SettlementRecord,
} from "../index";

function makeCheck(
  overrides: Partial<OperationalCheck> = {}
): OperationalCheck {
  return {
    id: 10,
    restaurantId: 1,
    sessionId: 20,
    outcome: "paid",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: true,
      mode: "exclusive",
      components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
    },
    serviceChargeSnapshot: null,
    billDiscountAmount: "0.00",
    subtotal: "100.00",
    taxAmount: "15.00",
    taxBreakdown: {
      totalTaxAmount: "15.00",
      lines: [
        {
          componentId: "vat",
          name: "VAT",
          ratePercent: "15.00",
          amount: "15.00",
        },
      ],
    },
    grandTotal: "115.00",
    snapshotsFrozenAt: "2026-07-26 12:00:00",
    totalsFrozenAt: "2026-07-26 13:00:00",
    settledAt: "2026-07-26 13:00:00",
    voidedAt: null,
    createdAt: "2026-07-26 12:00:00",
    updatedAt: "2026-07-26 13:00:00",
    ...overrides,
  };
}

function primarySettlement(): SettlementRecord {
  return createSettlementRecord({
    check: makeCheck(),
    outcome: "paid",
    createdAt: "2026-07-26 13:00:00",
    orderIds: [55],
  }).record;
}

function refundOf(
  prior: SettlementRecord,
  amount: string,
  generation: number,
  at: string
): SettlementRecord {
  const check = makeCheck({
    subtotal: amount,
    billDiscountAmount: "0.00",
    taxAmount: "0.00",
    taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
    grandTotal: amount,
  });
  return createCompensatingSettlementRecord({
    check,
    outcome: "paid",
    recordKind: "refund",
    recordGeneration: generation,
    priorSettlementRecordId: prior.settlementRecordId,
    createdAt: at,
    orderIds: [55],
    paymentSnapshotOverride: [
      {
        settlementTransactionId: null,
        paymentMethod: "cash",
        amount,
        currencyCode: "SAR",
        status: "refunded",
        businessTimestamp: at,
        reference: null,
        externalReference: null,
      },
    ],
  }).record;
}

describe("REFUND-SETTLEMENT-RECORD-ADOPTION-1", () => {
  it("publishes refund as a native Settlement Record", () => {
    const primary = primarySettlement();
    const refund = refundOf(primary, "40.00", 2, "2026-07-26 14:00:00");
    expect(isRefundSettlementRecord(refund)).toBe(true);
    expect(isCompensatingSettlementRecord(refund)).toBe(true);
    expect(refund.recordKind).toBe("refund");
    expect(refund.priorSettlementRecordId).toBe(primary.settlementRecordId);
    expect(refund.recordGeneration).toBe(2);
    expect(refund.currencySnapshot.currencyCode).toBe("SAR");
    expect(refund.taxPolicySnapshot.version).toBe(1);
  });

  it("supports multiple refund publications in one Check history", () => {
    const primary = primarySettlement();
    const r1 = refundOf(primary, "40.00", 2, "2026-07-26 14:00:00");
    const r2 = refundOf(primary, "75.00", 3, "2026-07-26 15:00:00");
    const chain = sortSettlementRecordsChronologically([r2, primary, r1]);
    expect(chain.map((r) => r.recordKind)).toEqual([
      "settlement",
      "refund",
      "refund",
    ]);
    expect(chain.map((r) => r.recordGeneration)).toEqual([1, 2, 3]);
    assertSettlementRecordChainIntegrity(chain);
  });

  it("mixed settlement history remains chronologically ordered newest-first", () => {
    const primary = primarySettlement();
    const refund = refundOf(primary, "10.00", 2, "2026-07-26 14:00:00");
    const newest = sortSettlementRecordsNewestFirst([primary, refund]);
    expect(newest[0]?.recordKind).toBe("refund");
    expect(newest[1]?.recordKind).toBe("settlement");
  });

  it("parent linkage is required for refund and preserved", () => {
    const primary = primarySettlement();
    const refund = refundOf(primary, "10.00", 2, "2026-07-26 14:00:00");
    expect(refund.priorSettlementRecordId).toBe(primary.settlementRecordId);
    assertSettlementRecordChainIntegrity([primary, refund]);
  });

  it("immutability: original settlement unchanged; mutation forbidden", () => {
    const primary = primarySettlement();
    const snapshot = { ...primary };
    refundOf(primary, "10.00", 2, "2026-07-26 14:00:00");
    expect(primary).toEqual(snapshot);
    expect(() => forbidSettlementRecordMutation()).toThrow(
      UnsupportedSettlementRecordOperationError
    );
    expect(() => assertSettlementRecordAppendOnlyOperation("update")).toThrow();
    expect(() => assertSettlementRecordAppendOnlyOperation("delete")).toThrow();
  });

  it("tenant isolation: cross-tenant chain rejected", () => {
    const primary = primarySettlement();
    const refund = {
      ...refundOf(primary, "10.00", 2, "2026-07-26 14:00:00"),
      restaurantId: 2,
    };
    expect(() =>
      assertSettlementRecordChainIntegrity([primary, refund])
    ).toThrow(/tenant/i);
  });

  it("backward compatibility: paid / complimentary / voided primary unchanged", () => {
    const paid = createSettlementRecord({
      check: makeCheck({ outcome: "paid" }),
      outcome: "paid",
      createdAt: "2026-07-26 13:00:00",
      orderIds: [1],
    }).record;
    const complimentary = createSettlementRecord({
      check: makeCheck({ outcome: "complimentary", grandTotal: "0.00", taxAmount: "0.00", subtotal: "0.00", taxBreakdown: { totalTaxAmount: "0.00", lines: [] } }),
      outcome: "complimentary",
      createdAt: "2026-07-26 13:00:00",
      orderIds: [2],
    }).record;
    const voided = createSettlementRecord({
      check: makeCheck({ outcome: "voided" }),
      outcome: "voided",
      createdAt: "2026-07-26 13:00:00",
      orderIds: [3],
    }).record;
    expect(paid.recordKind).toBe("settlement");
    expect(complimentary.recordKind).toBe("settlement");
    expect(voided.recordKind).toBe("void");
    expect(isCompensatingSettlementRecord(paid)).toBe(false);
  });

  it("historical replay: same chain yields identical financial truth", () => {
    const primary = primarySettlement();
    const refund = refundOf(primary, "40.00", 2, "2026-07-26 14:00:00");
    const replayA = sortSettlementRecordsChronologically([refund, primary]);
    const replayB = sortSettlementRecordsChronologically([primary, refund]);
    expect(replayA.map((r) => r.settlementRecordId)).toEqual(
      replayB.map((r) => r.settlementRecordId)
    );
    expect(replayA.map((r) => r.grandTotal)).toEqual(["115.00", "40.00"]);
  });

  it("projection idempotency: duplicate generation identity rejected in chain audit", () => {
    const primary = primarySettlement();
    const refund = refundOf(primary, "10.00", 2, "2026-07-26 14:00:00");
    expect(() =>
      assertSettlementRecordChainIntegrity([primary, refund, refund])
    ).toThrow(/SR-INV-05/);
  });
});
