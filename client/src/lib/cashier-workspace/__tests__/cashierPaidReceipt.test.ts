import { describe, expect, it } from "vitest";
import { buildCashierPaidReceiptSnapshot } from "../cashierPaidReceipt";

describe("buildCashierPaidReceiptSnapshot", () => {
  it("uses Confirm HTTP grandTotal, not a live ticket total", () => {
    const snapshot = buildCashierPaidReceiptSnapshot({
      orderId: 44,
      grandTotal: "23.00",
      orderNumber: "ORD-0007",
      displayReference: "POS-7",
      restaurantName: "Demo",
      currencySymbol: "ر.س",
      language: "en",
      ticketLines: [
        {
          nameAr: "كبسة",
          nameEn: "Kabsa",
          price: "10.00",
          quantity: 9,
        },
      ],
      tenders: [{ paymentMethod: "cash", amount: "23.00" }],
      paidAt: "2026-08-26T00:00:00.000Z",
    });
    expect(snapshot.grandTotal).toBe("23.00");
    expect(snapshot.grandTotal).not.toBe("90.00");
    expect(snapshot.orderId).toBe(44);
    expect(snapshot.displayReference).toBe("POS-7");
    expect(snapshot.tenders).toEqual([{ paymentMethod: "cash", amount: "23.00" }]);
  });
});
