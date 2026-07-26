/**
 * REFUND-SETTLEMENT-RECORD-ADOPTION-1 — presentation adoption tests.
 */
import { describe, expect, it } from "vitest";
import { settlementStatusLabel } from "../settlementRecordCopy";
import {
  toSettlementHistoryRowViewModel,
  toSettlementReceiptViewModel,
} from "../settlementRecordViewModel";
import type {
  SettlementRecordHistoryItemApiDto,
  SettlementRecordReceiptApiDto,
} from "../settlementRecordApiTypes";

describe("Settlement Record refund presentation adoption", () => {
  it("labels refunded distinctly from settled", () => {
    expect(settlementStatusLabel("refunded", "en")).toBe("Refunded");
    expect(settlementStatusLabel("settled", "en")).toBe("Settled");
    expect(settlementStatusLabel("refunded", "ar")).toBe("مُسترد");
  });

  it("history row surfaces refund status and chain fields", () => {
    const item: SettlementRecordHistoryItemApiDto = {
      settlementRecordId: "sr:1:10:refund:2",
      settlementNumber: "ST-000010-2",
      settlementTime: "2026-07-26T14:00:00.000Z",
      sourceType: "check",
      sourceNumber: "10",
      grandTotal: "20.00",
      currencyCode: "SAR",
      currencySymbol: "ر.س",
      paymentStatus: "refunded",
      paymentMethodSummary: "cash",
      settlementStatus: "refunded",
      recordKind: "refund",
      recordGeneration: 2,
      priorSettlementRecordId: "sr:1:10:settlement:1",
      outcome: "paid",
      businessDay: "2026-07-26",
      checkId: 10,
      sessionId: null,
    };
    const row = toSettlementHistoryRowViewModel(item, "en");
    expect(row.statusLabel).toBe("Refunded");
    expect(row.recordKind).toBe("refund");
    expect(row.recordGeneration).toBe(2);
    expect(row.priorSettlementRecordId).toBe("sr:1:10:settlement:1");
  });

  it("receipt VM uses API recordKind (no hardcode to settlement)", () => {
    const receipt: SettlementRecordReceiptApiDto = {
      settlementRecordId: "sr:1:10:refund:2",
      settlementNumber: "ST-000010-2",
      settlementTime: "2026-07-26T14:00:00.000Z",
      settlementStatus: "refunded",
      recordKind: "refund",
      recordGeneration: 2,
      priorSettlementRecordId: "sr:1:10:settlement:1",
      businessDay: "2026-07-26",
      orders: [],
      itemsSnapshot: [],
      paymentMethods: [],
      financialSnapshot: {
        subtotal: "20.00",
        discountAmount: "0.00",
        taxAmount: "0.00",
        grandTotal: "20.00",
        currencyCode: "SAR",
        currencySymbol: "ر.س",
      },
      taxSnapshot: { totalTaxAmount: "0.00", lines: [] },
      grandTotal: "20.00",
      currencyCode: "SAR",
      currencySymbol: "ر.س",
      outcome: "paid",
    };
    const vm = toSettlementReceiptViewModel(receipt, "en");
    expect(vm.statusLabel).toBe("Refunded");
  });
});
