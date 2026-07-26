/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 / REFUND-SETTLEMENT-RECORD-ADOPTION-1
 * Mapper unit tests (no money math) — polymorphic refund adoption.
 */
import { describe, expect, it } from "vitest";
import type { SettlementRecord } from "@shared/operational-session";
import {
  toSettlementRecordDetailDto,
  toSettlementRecordHistoryItemDto,
  toSettlementRecordReceiptDto,
} from "../settlementRecordApiMapper";

function sampleRecord(
  overrides: Partial<SettlementRecord> = {}
): SettlementRecord {
  return {
    settlementRecordId: "sr:1:10:settlement:1",
    restaurantId: 1,
    recordKind: "settlement",
    schemaVersion: 1,
    recordGeneration: 1,
    checkId: 10,
    sessionId: 20,
    financialReference: "fin:check:10:gen:1",
    priorSettlementRecordId: null,
    orderRefs: [{ orderId: 100 }],
    orderSettlementRefs: [],
    subtotal: "50.00",
    discountAmount: "0.00",
    taxAmount: "7.50",
    grandTotal: "57.50",
    outcome: "paid",
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: { version: 1, enabled: true, mode: "exclusive", components: [] },
    taxBreakdown: {
      totalTaxAmount: "7.50",
      lines: [{ componentId: "vat", name: "VAT", ratePercent: "15", amount: "7.50" }],
    },
    paymentSnapshot: [
      {
        settlementTransactionId: 1,
        paymentMethod: "cash",
        amount: "57.50",
        currencyCode: "SAR",
        status: "applied",
        businessTimestamp: "2026-07-24T10:00:00.000Z",
        reference: null,
        externalReference: null,
      },
    ],
    businessDay: "2026-07-24",
    settledAt: "2026-07-24T10:00:00.000Z",
    createdAt: "2026-07-24T10:00:00.000Z",
    createdByActorType: "user",
    createdByActorId: "1",
    producer: "check_aggregate",
    ...overrides,
  };
}

describe("settlementRecordApiMapper", () => {
  it("maps history fields without recalculating money", () => {
    const item = toSettlementRecordHistoryItemDto(sampleRecord());
    expect(item.settlementRecordId).toBe("sr:1:10:settlement:1");
    expect(item.settlementNumber).toBe("ST-000010");
    expect(item.grandTotal).toBe("57.50");
    expect(item.sourceType).toBe("session");
    expect(item.sourceNumber).toBe("20");
    expect(item.paymentMethodSummary).toBe("cash");
    expect(item.settlementStatus).toBe("settled");
  });

  it("maps detail + receipt from the same Settlement Record snapshot", () => {
    const detail = toSettlementRecordDetailDto({ record: sampleRecord() });
    expect(detail.financialSnapshot.grandTotal).toBe("57.50");
    expect(detail.taxSnapshot.totalTaxAmount).toBe("7.50");
    expect(detail.paymentMethods[0]?.paymentMethod).toBe("cash");
    expect(detail.checks).toEqual([{ checkId: 10 }]);
    expect(detail.recordGeneration).toBe(1);
    expect(detail.priorSettlementRecordId).toBeNull();

    const receipt = toSettlementRecordReceiptDto(detail);
    expect(receipt.grandTotal).toBe(detail.grandTotal);
    expect(receipt.financialSnapshot).toEqual(detail.financialSnapshot);
    expect(receipt.settlementRecordId).toBe(detail.settlementRecordId);
    expect(receipt.recordKind).toBe("settlement");
    expect(receipt.recordGeneration).toBe(1);
  });

  it("maps refund Settlement Record polymorphically (status + chain fields)", () => {
    const refund = sampleRecord({
      settlementRecordId: "sr:1:10:refund:2",
      recordKind: "refund",
      recordGeneration: 2,
      priorSettlementRecordId: "sr:1:10:settlement:1",
      grandTotal: "20.00",
      subtotal: "20.00",
      taxAmount: "0.00",
      taxBreakdown: { totalTaxAmount: "0.00", lines: [] },
      paymentSnapshot: [
        {
          settlementTransactionId: null,
          paymentMethod: "cash",
          amount: "20.00",
          currencyCode: "SAR",
          status: "refunded",
          businessTimestamp: "2026-07-26T14:00:00.000Z",
          reference: null,
          externalReference: null,
        },
      ],
    });

    const history = toSettlementRecordHistoryItemDto(refund);
    expect(history.settlementStatus).toBe("refunded");
    expect(history.recordKind).toBe("refund");
    expect(history.recordGeneration).toBe(2);
    expect(history.priorSettlementRecordId).toBe("sr:1:10:settlement:1");
    expect(history.grandTotal).toBe("20.00");

    const detail = toSettlementRecordDetailDto({ record: refund });
    expect(detail.settlementStatus).toBe("refunded");
    expect(detail.priorSettlementRecordId).toBe("sr:1:10:settlement:1");

    const receipt = toSettlementRecordReceiptDto(detail);
    expect(receipt.recordKind).toBe("refund");
    expect(receipt.settlementStatus).toBe("refunded");
    expect(receipt.priorSettlementRecordId).toBe("sr:1:10:settlement:1");
  });

  it("backward compatibility: complimentary and voided statuses unchanged", () => {
    expect(
      toSettlementRecordHistoryItemDto(
        sampleRecord({ outcome: "complimentary" })
      ).settlementStatus
    ).toBe("complimentary");
    expect(
      toSettlementRecordHistoryItemDto(
        sampleRecord({
          outcome: "voided",
          recordKind: "void",
          settlementRecordId: "sr:1:10:void:1",
        })
      ).settlementStatus
    ).toBe("voided");
  });
});

