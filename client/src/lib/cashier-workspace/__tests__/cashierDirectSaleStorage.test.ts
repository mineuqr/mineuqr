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
    clearCashierDirectSale(12);
    expect(readCashierDirectSale(12)).toBeNull();
    vi.unstubAllGlobals();
  });
});
