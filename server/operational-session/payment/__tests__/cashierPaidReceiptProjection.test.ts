import { describe, expect, it } from "vitest";
import { cashierInvoicePresentationSubtotal } from "@shared/operational-session";
import { computeCheckMoney } from "@shared/operational-session/check/checkMoney";
import type { TaxPolicySnapshot } from "@shared/operational-session/check/checkContract";
import { buildCashierPaidReceiptProjection } from "../cashierPaidReceiptProjection";

const inclusive15: TaxPolicySnapshot = {
  version: 1,
  enabled: true,
  mode: "inclusive",
  components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
};

const exclusive15: TaxPolicySnapshot = {
  version: 1,
  enabled: true,
  mode: "exclusive",
  components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
};

function receiptFromFreezeMoney(input: {
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  unusedDomainSubtotal?: string;
}) {
  const freeze = {
    orderId: 44,
    discountAmount: input.discountAmount,
    taxAmount: input.taxAmount,
    grandTotal: input.grandTotal,
    tenders: [{ paymentMethod: "cash" as const, amount: input.grandTotal }],
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    ...(input.unusedDomainSubtotal != null
      ? { subtotal: input.unusedDomainSubtotal }
      : {}),
  };
  return buildCashierPaidReceiptProjection({
    freeze,
    receiptInvoiceLines: [
      {
        nameAr: "عصير",
        nameEn: "Juice",
        quantity: 1,
        unitPrice: input.grandTotal,
        lineTotal: input.grandTotal,
      },
    ],
    order: {
      id: 44,
      orderNumber: "ORD-0007",
      businessDay: "2026-08-26",
      dailyDisplayNumber: 15,
      identityScope: "POS",
    },
    paidAt: "2026-08-26T12:30:00.000Z",
    cashierUserId: 7,
    cashierDisplayName: "خالد",
    terminalId: "term-1",
  });
}

describe("buildCashierPaidReceiptProjection", () => {
  it("uses freeze money and invoice lines without recalculating tax", () => {
    const projection = receiptFromFreezeMoney({
      unusedDomainSubtotal: "24.00",
      discountAmount: "2.00",
      taxAmount: "3.30",
      grandTotal: "25.30",
    });
    expect(projection.grandTotal).toBe("25.30");
    expect(projection.subtotal).toBe(
      cashierInvoicePresentationSubtotal({
        grandTotal: "25.30",
        taxAmount: "3.30",
      })
    );
    expect(projection.subtotal).toBe("22.00");
    expect(projection.discountAmount).toBe("2.00");
    expect(projection.taxAmount).toBe("3.30");
    expect(projection.lines[0]?.quantity).toBe(1);
    expect(projection.tenders).toEqual([
      { paymentMethod: "cash", amount: "25.30" },
    ]);
    expect(projection.cashierDisplayName).toBe("خالد");
    expect(projection.terminalId).toBe("term-1");
    expect(projection.displayReference.length).toBeGreaterThan(0);
  });
});

describe("CASHIER-PAID-RECEIPT-SUBTOTAL-PRESENTATION-1", () => {
  it("maps inclusive 115 / 15% to Subtotal 100, VAT 15, Grand 115", () => {
    const engine = computeCheckMoney({
      chargesSubtotal: "115.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: inclusive15,
    });
    expect(engine.subtotal).toBe("115.00");
    const receipt = receiptFromFreezeMoney({
      unusedDomainSubtotal: engine.subtotal,
      discountAmount: "0.00",
      taxAmount: engine.taxAmount,
      grandTotal: engine.grandTotal,
    });
    expect(receipt.subtotal).toBe("100.00");
    expect(receipt.taxAmount).toBe("15.00");
    expect(receipt.grandTotal).toBe("115.00");
    expect(receipt.subtotal).not.toBe(engine.subtotal);
  });

  it("maps exclusive 100 / 15% to Subtotal 100, VAT 15, Grand 115", () => {
    const engine = computeCheckMoney({
      chargesSubtotal: "100.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: exclusive15,
    });
    const receipt = receiptFromFreezeMoney({
      unusedDomainSubtotal: engine.subtotal,
      discountAmount: "0.00",
      taxAmount: engine.taxAmount,
      grandTotal: engine.grandTotal,
    });
    expect(receipt.subtotal).toBe("100.00");
    expect(receipt.taxAmount).toBe("15.00");
    expect(receipt.grandTotal).toBe("115.00");
  });

  it("maps exclusive discount 100-20 / 15% to Subtotal 80, Discount 20, VAT 12, Grand 92", () => {
    const engine = computeCheckMoney({
      chargesSubtotal: "100.00",
      billDiscountAmount: "20.00",
      taxPolicySnapshot: exclusive15,
    });
    const receipt = receiptFromFreezeMoney({
      unusedDomainSubtotal: engine.subtotal,
      discountAmount: "20.00",
      taxAmount: engine.taxAmount,
      grandTotal: engine.grandTotal,
    });
    expect(engine.subtotal).toBe("80.00");
    expect(receipt.subtotal).toBe("80.00");
    expect(receipt.discountAmount).toBe("20.00");
    expect(receipt.taxAmount).toBe("12.00");
    expect(receipt.grandTotal).toBe("92.00");
  });

  it("maps inclusive discount using grandTotal − taxAmount, not domain subtotal", () => {
    const engine = computeCheckMoney({
      chargesSubtotal: "115.00",
      billDiscountAmount: "20.00",
      taxPolicySnapshot: inclusive15,
    });
    const receipt = receiptFromFreezeMoney({
      unusedDomainSubtotal: engine.subtotal,
      discountAmount: "20.00",
      taxAmount: engine.taxAmount,
      grandTotal: engine.grandTotal,
    });
    expect(receipt.subtotal).toBe(
      cashierInvoicePresentationSubtotal({
        grandTotal: engine.grandTotal,
        taxAmount: engine.taxAmount,
      })
    );
    expect(receipt.subtotal).not.toBe(engine.subtotal);
    expect(receipt.discountAmount).toBe("20.00");
    expect(receipt.taxAmount).toBe(engine.taxAmount);
    expect(receipt.grandTotal).toBe(engine.grandTotal);
  });

  it("produces the same receipt Subtotal for freeze Confirm and CF replay shapes", () => {
    const engine = computeCheckMoney({
      chargesSubtotal: "115.00",
      billDiscountAmount: "0.00",
      taxPolicySnapshot: inclusive15,
    });
    const fromFreeze = receiptFromFreezeMoney({
      unusedDomainSubtotal: engine.subtotal,
      discountAmount: "0.00",
      taxAmount: engine.taxAmount,
      grandTotal: engine.grandTotal,
    });
    const fromReplay = receiptFromFreezeMoney({
      unusedDomainSubtotal: "999.00",
      discountAmount: "0.00",
      taxAmount: engine.taxAmount,
      grandTotal: engine.grandTotal,
    });
    expect(fromFreeze.subtotal).toBe("100.00");
    expect(fromReplay.subtotal).toBe(fromFreeze.subtotal);
    expect(fromReplay.taxAmount).toBe(fromFreeze.taxAmount);
    expect(fromReplay.grandTotal).toBe(fromFreeze.grandTotal);
    expect(fromReplay.discountAmount).toBe(fromFreeze.discountAmount);
  });
});
