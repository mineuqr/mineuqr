/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — mapper unit tests (no money math).
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
    expect(item.settlementNumber).toBe("sr:1:10:settlement:1");
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

    const receipt = toSettlementRecordReceiptDto(detail);
    expect(receipt.grandTotal).toBe(detail.grandTotal);
    expect(receipt.financialSnapshot).toEqual(detail.financialSnapshot);
    expect(receipt.settlementRecordId).toBe(detail.settlementRecordId);
  });
});
