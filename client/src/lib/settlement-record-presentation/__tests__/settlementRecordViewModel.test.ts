/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 / RECEIPT-HISTORICAL-FIDELITY-AND-INVOICE-IDENTITY-1
 */
import { describe, expect, it } from "vitest";
import type { SettlementRecordReceiptApiDto } from "../settlementRecordApiTypes";
import {
  computeRemainingDisplay,
  toSettlementReceiptViewModel,
} from "../settlementRecordViewModel";

function receipt(
  overrides: Partial<SettlementRecordReceiptApiDto> = {}
): SettlementRecordReceiptApiDto {
  return {
    settlementRecordId: "sr:1:10:settlement:1",
    settlementNumber: "ST-000010",
    documentNumber: "ST-000010",
    documentType: "settlement",
    refundNumber: null,
    originSettlementNumber: null,
    settlementTime: "2026-08-27T12:00:00.000Z",
    settlementStatus: "settled",
    recordKind: "settlement",
    recordGeneration: 1,
    priorSettlementRecordId: null,
    businessDay: "2026-08-27",
    invoiceNumber: "000042",
    sourceChannel: "self_order",
    orders: [{ orderId: 55, displayReference: "K #005" }],
    itemsSnapshot: [
      {
        orderId: 55,
        name: "Kabsa",
        quantity: 1,
        unitPrice: "80.00",
        lineTotal: "80.00",
      },
    ],
    paymentMethods: [
      {
        paymentMethod: "cash",
        amount: "86.25",
        currencyCode: "SAR",
        status: "captured",
        businessTimestamp: "2026-08-27T12:00:00.000Z",
      },
    ],
    financialSnapshot: {
      subtotal: "80.00",
      discountAmount: "5.00",
      taxAmount: "11.25",
      grandTotal: "86.25",
      currencyCode: "SAR",
      currencySymbol: "ر.س",
    },
    taxSnapshot: { totalTaxAmount: "11.25", lines: [] },
    grandTotal: "86.25",
    currencyCode: "SAR",
    currencySymbol: "ر.س",
    outcome: "paid",
    ...overrides,
  };
}

describe("toSettlementReceiptViewModel identity", () => {
  it("keeps Invoice serial and Settlement number separate", () => {
    const vm = toSettlementReceiptViewModel(receipt(), "en");
    expect(vm.invoiceNumber).toBe("000042");
    expect(vm.settlementNumber).toBe("ST-000010");
    expect(vm.documentNumber).toBe("ST-000010");
    expect(vm.invoiceNumber).not.toBe(vm.settlementNumber);
    expect(vm.orders[0]?.label).toBe("K #005");
    expect(vm.sourceChannelLabel).toBe("Self-Order");
  });

  it("does not fabricate ST identity for a CF-only receipt", () => {
    const vm = toSettlementReceiptViewModel(
      receipt({
        settlementRecordId: "",
        settlementNumber: "",
        documentNumber: "",
      }),
      "en"
    );
    expect(vm.invoiceNumber).toBe("000042");
    expect(vm.settlementNumber).toBe("");
    expect(vm.documentNumber).toBe("");
    expect(vm.documentNumber).not.toMatch(/^ST-/);
    expect(vm.invoiceNumber).not.toBe(vm.settlementNumber);
  });

  it("keeps refund RF identity on preview/print VM", () => {
    const vm = toSettlementReceiptViewModel(
      receipt({
        settlementRecordId: "sr:1:10:refund:2",
        settlementNumber: "RF-000001",
        documentNumber: "RF-000001",
        documentType: "refund",
        refundNumber: "RF-000001",
        originSettlementNumber: "ST-000010",
        recordKind: "refund",
        recordGeneration: 2,
        settlementStatus: "refunded",
      }),
      "en"
    );
    expect(vm.isRefundReceipt).toBe(true);
    expect(vm.documentNumber).toBe("RF-000001");
    expect(vm.originSettlementNumber).toBe("ST-000010");
    expect(vm.invoiceNumber).toBe("000042");
  });
});

describe("computeRemainingDisplay", () => {
  it("shows remaining as outstanding minus amount paid", () => {
    expect(computeRemainingDisplay("100.00", "40.00")).toBe("60.00");
  });

  it("clamps remaining at zero", () => {
    expect(computeRemainingDisplay("50.00", "50.00")).toBe("0.00");
    expect(computeRemainingDisplay("50.00", "60.00")).toBe("0.00");
  });
});
