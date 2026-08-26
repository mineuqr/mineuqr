import { describe, expect, it } from "vitest";
import { buildCashierPaidReceiptProjection } from "../cashierPaidReceiptProjection";

describe("buildCashierPaidReceiptProjection", () => {
  it("uses freeze money and invoice lines without recalculating totals", () => {
    const projection = buildCashierPaidReceiptProjection({
      freeze: {
        orderId: 44,
        subtotal: "24.00",
        discountAmount: "2.00",
        taxAmount: "3.30",
        grandTotal: "25.30",
        tenders: [
          { paymentMethod: "cash", amount: "10.00" },
          { paymentMethod: "card", amount: "15.30" },
        ],
        currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
      },
      receiptInvoiceLines: [
        {
          nameAr: "عصير",
          nameEn: "Juice",
          quantity: 2,
          unitPrice: "12.00",
          lineTotal: "24.00",
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
    expect(projection.grandTotal).toBe("25.30");
    expect(projection.subtotal).toBe("24.00");
    expect(projection.discountAmount).toBe("2.00");
    expect(projection.taxAmount).toBe("3.30");
    expect(projection.lines[0]?.quantity).toBe(2);
    expect(projection.lines[0]?.unitPrice).toBe("12.00");
    expect(projection.lines[0]?.lineTotal).toBe("24.00");
    expect(projection.tenders).toEqual([
      { paymentMethod: "cash", amount: "10.00" },
      { paymentMethod: "card", amount: "15.30" },
    ]);
    expect(projection.cashierDisplayName).toBe("خالد");
    expect(projection.terminalId).toBe("term-1");
    expect(projection.displayReference.length).toBeGreaterThan(0);
  });
});
