import { describe, expect, it, vi } from "vitest";
import {
  clearCashierDirectSale,
  readCashierDirectSale,
  writeCashierDirectSale,
} from "../cashierDirectSaleStorage";

describe("cashier direct-sale snapshot", () => {
  it("round-trips a payment snapshot for Register Ops return", () => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
      removeItem: (key: string) => {
        store.delete(key);
      },
    });
    writeCashierDirectSale(12, {
      v: 1,
      orderId: 44,
      orderNumber: "1001",
      displayReference: "C #001",
      totalAmount: "50.00",
      checkId: 9,
      phase: "payment",
      paymentMethod: "cash",
      cashReceived: "50.00",
      paid: null,
    });
    expect(readCashierDirectSale(12)?.orderId).toBe(44);
    writeCashierDirectSale(12, {
      v: 2,
      orderId: 44,
      orderNumber: "1001",
      displayReference: "P #015",
      totalAmount: "50.00",
      checkId: null,
      phase: "payment",
      paymentMethod: "cash",
      cashReceived: "50.00",
      invoice: {
        createdAt: "2026-08-26T12:30:00.000Z",
        money: {
          subtotal: "50.00",
          taxAmount: "0.00",
          grandTotal: "50.00",
          billDiscountAmount: "0.00",
        },
        lines: [
          {
            key: "prepared-1",
            nameAr: "عصير",
            nameEn: "Juice",
            quantity: 1,
            unitPrice: "50.00",
            lineTotal: "50.00",
            menuItemId: 3,
          },
        ],
      },
      paid: null,
    });
    expect(readCashierDirectSale(12)?.invoice?.lines).toHaveLength(1);
    writeCashierDirectSale(12, {
      v: 2,
      orderId: 44,
      orderNumber: "1001",
      displayReference: "P #015",
      totalAmount: "50.00",
      checkId: null,
      phase: "ticket",
      paymentMethod: null,
      cashReceived: "",
      invoice: {
        createdAt: "2026-08-26T12:30:00.000Z",
        money: {
          subtotal: "50.00",
          taxAmount: "0.00",
          grandTotal: "50.00",
          billDiscountAmount: "0.00",
        },
        lines: [
          {
            key: "prepared-1",
            nameAr: "عصير",
            nameEn: "Juice",
            quantity: 1,
            unitPrice: "50.00",
            lineTotal: "50.00",
            menuItemId: 3,
          },
        ],
      },
      paid: null,
    });
    expect(readCashierDirectSale(12)?.phase).toBe("ticket");
    clearCashierDirectSale(12);
    expect(readCashierDirectSale(12)).toBeNull();
    vi.unstubAllGlobals();
  });
});
