import { describe, expect, it } from "vitest";
import {
  buildCashierPaidReceiptSnapshot,
  formatCashierReceiptDateTime,
  formatCashierReceiptRestaurantHeading,
} from "../cashierPaidReceipt";

const PROJECTION = {
  orderId: 44,
  orderNumber: "ORD-0007",
  displayReference: "P #015",
  paidAt: "2026-08-26T12:30:00.000Z",
  cashierUserId: 7,
  cashierDisplayName: "خالد",
  terminalId: "term-1",
  currencySymbol: "ر.س",
  lines: [
    {
      nameAr: "عصير برتقال",
      nameEn: "Orange juice",
      quantity: 1,
      unitPrice: "12.00",
      lineTotal: "12.00",
    },
  ],
  subtotal: "12.00",
  discountAmount: "0.00",
  taxAmount: "1.80",
  grandTotal: "13.80",
  tenders: [{ paymentMethod: "cash" as const, amount: "13.80" }],
};

describe("buildCashierPaidReceiptSnapshot", () => {
  it("copies Confirm HTTP projection without recalculating money or using a ticket", () => {
    const snapshot = buildCashierPaidReceiptSnapshot({
      projection: PROJECTION,
      restaurantName: "Demo",
    });
    expect(snapshot.grandTotal).toBe("13.80");
    expect(snapshot.subtotal).toBe("12.00");
    expect(snapshot.discountAmount).toBe("0.00");
    expect(snapshot.taxAmount).toBe("1.80");
    expect(snapshot.lines[0]?.quantity).toBe(1);
    expect(snapshot.lines[0]?.unitPrice).toBe("12.00");
    expect(snapshot.lines[0]?.lineTotal).toBe("12.00");
    expect(snapshot.tenders).toEqual([{ paymentMethod: "cash", amount: "13.80" }]);
    expect(snapshot.cashierDisplayName).toBe("خالد");
    expect(snapshot.terminalId).toBe("term-1");
    expect(snapshot.restaurantName).toBe("Demo");
  });

  it("formats paidAt for Arabic and English without changing the ISO value", () => {
    const ar = formatCashierReceiptDateTime(PROJECTION.paidAt, "ar");
    const en = formatCashierReceiptDateTime(PROJECTION.paidAt, "en");
    expect(ar.date.length).toBeGreaterThan(0);
    expect(ar.time.length).toBeGreaterThan(0);
    expect(en.date.length).toBeGreaterThan(0);
    expect(en.time.length).toBeGreaterThan(0);
  });

  it("prefixes Arabic restaurant heading with مطعم when absent", () => {
    expect(formatCashierReceiptRestaurantHeading("خالد", "ar")).toBe("مطعم خالد");
    expect(formatCashierReceiptRestaurantHeading("مطعم خالد", "ar")).toBe(
      "مطعم خالد"
    );
    expect(formatCashierReceiptRestaurantHeading("Demo", "en")).toBe("Demo");
  });
});
