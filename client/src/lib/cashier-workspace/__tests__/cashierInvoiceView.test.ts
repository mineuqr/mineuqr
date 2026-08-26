import { describe, expect, it } from "vitest";
import {
  buildDraftCashierInvoiceView,
  buildPreparedCashierInvoiceView,
  mapSaleCreateLinesToInvoiceLines,
  unitPriceFromLineTotal,
} from "../cashierInvoiceView";

describe("CashierInvoiceView", () => {
  it("builds a draft invoice from catalog lines without Order identity", () => {
    const view = buildDraftCashierInvoiceView({
      ticket: [
        {
          menuItemId: 3,
          nameAr: "عصير",
          nameEn: "Juice",
          price: "10.00",
          quantity: 2,
        },
      ],
      previewMoney: {
        subtotal: "20.00",
        discountAmount: "0.00",
        taxAmount: "3.00",
        grandTotal: "23.00",
      },
      cashierDisplayName: "خالد",
      terminalId: "term-1",
    });
    expect(view.stage).toBe("draft");
    expect(view.editable).toBe(true);
    expect(view.displayReference).toBeNull();
    expect(view.lines[0]?.lineTotal).toBe("20.00");
    expect(view.money?.grandTotal).toBe("23.00");
  });

  it("maps sale.create lines and money as the prepared invoice", () => {
    const lines = mapSaleCreateLinesToInvoiceLines(
      [
        {
          description: "عصير",
          quantity: 2,
          netAmount: "24.00",
          originOrderItemId: 91,
        },
      ],
      [
        {
          menuItemId: 3,
          nameAr: "عصير برتقال",
          nameEn: "Orange juice",
          price: "12.00",
          quantity: 2,
        },
      ]
    );
    expect(unitPriceFromLineTotal("24.00", 2)).toBe("12.00");
    const view = buildPreparedCashierInvoiceView({
      orderId: 44,
      orderNumber: "ORD-0007",
      displayReference: "P #015",
      createdAt: "2026-08-26T12:30:00.000Z",
      money: {
        subtotal: "24.00",
        taxAmount: "3.60",
        grandTotal: "27.60",
        billDiscountAmount: "0.00",
      },
      lines,
      cashierDisplayName: "خالد",
      terminalId: "term-1",
    });
    expect(view.stage).toBe("prepared");
    expect(view.editable).toBe(false);
    expect(view.displayReference).toBe("P #015");
    expect(view.lines).toHaveLength(1);
    expect(view.lines[0]?.nameEn).toBe("Orange juice");
    expect(view.lines[0]?.unitPrice).toBe("12.00");
    expect(view.lines[0]?.lineTotal).toBe("24.00");
    expect(view.money?.grandTotal).toBe("27.60");
    expect(view.money?.taxAmount).toBe("3.60");
    expect(view.money?.subtotal).toBe("24.00");
  });
});
