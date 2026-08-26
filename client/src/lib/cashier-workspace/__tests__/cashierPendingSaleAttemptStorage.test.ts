import { describe, expect, it, vi } from "vitest";
import {
  clearCashierPendingSaleAttempt,
  readCashierPendingSaleAttempt,
  writeCashierPendingSaleAttempt,
} from "../cashierPendingSaleAttemptStorage";

describe("cashier pending sale.create attempt", () => {
  it("round-trips a stable idempotency key for lost-response retry", () => {
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
    writeCashierPendingSaleAttempt(12, {
      idempotencyKey: "sale-key-stable-01",
      items: [{ menuItemId: 3, quantity: 2 }],
    });
    expect(readCashierPendingSaleAttempt(12)).toEqual({
      idempotencyKey: "sale-key-stable-01",
      items: [{ menuItemId: 3, quantity: 2 }],
    });
    clearCashierPendingSaleAttempt(12);
    expect(readCashierPendingSaleAttempt(12)).toBeNull();
  });
});
