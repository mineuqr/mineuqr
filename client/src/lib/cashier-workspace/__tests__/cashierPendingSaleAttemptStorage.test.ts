import { describe, expect, it, vi } from "vitest";
import {
  cashierPendingSaleAttemptAppliesToOrder,
  clearCashierPendingSaleAttempt,
  readCashierPendingSaleAttempt,
  writeCashierPendingSaleAttempt,
} from "../cashierPendingSaleAttemptStorage";

function stubSessionStorage() {
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
  return store;
}

describe("cashier pending sale.create attempt", () => {
  it("round-trips a stable idempotency key for lost-response retry", () => {
    stubSessionStorage();
    writeCashierPendingSaleAttempt(12, {
      idempotencyKey: "sale-key-stable-01",
      items: [{ menuItemId: 3, quantity: 2 }],
    });
    expect(readCashierPendingSaleAttempt(12)).toEqual({
      idempotencyKey: "sale-key-stable-01",
      items: [{ menuItemId: 3, quantity: 2 }],
      orderId: null,
    });
    clearCashierPendingSaleAttempt(12);
    expect(readCashierPendingSaleAttempt(12)).toBeNull();
  });

  it("round-trips Incoming orderId as the owning Order identity", () => {
    stubSessionStorage();
    writeCashierPendingSaleAttempt(12, {
      idempotencyKey: "sale-key-order-44",
      items: [{ menuItemId: 3, quantity: 2 }],
      orderId: 44,
    });
    expect(readCashierPendingSaleAttempt(12)).toEqual({
      idempotencyKey: "sale-key-order-44",
      items: [{ menuItemId: 3, quantity: 2 }],
      orderId: 44,
    });
  });
});

describe("cashierPendingSaleAttemptAppliesToOrder", () => {
  const attemptA = { orderId: 10 };
  const attemptPos = { orderId: null };
  const attemptLegacy = {};

  it("applies only to the same Incoming Order", () => {
    expect(cashierPendingSaleAttemptAppliesToOrder(attemptA, 10)).toBe(true);
    expect(cashierPendingSaleAttemptAppliesToOrder(attemptA, 11)).toBe(false);
  });

  it("does not let a different Order inherit the attempt even with identical items", () => {
    expect(cashierPendingSaleAttemptAppliesToOrder(attemptA, 99)).toBe(false);
  });

  it("does not let a legacy attempt without orderId block Incoming", () => {
    expect(cashierPendingSaleAttemptAppliesToOrder(attemptLegacy, 10)).toBe(
      false
    );
    expect(cashierPendingSaleAttemptAppliesToOrder(attemptPos, 10)).toBe(false);
  });

  it("keeps POS retry for attempts with no Incoming orderId", () => {
    expect(cashierPendingSaleAttemptAppliesToOrder(attemptPos, null)).toBe(true);
    expect(cashierPendingSaleAttemptAppliesToOrder(attemptLegacy, null)).toBe(
      true
    );
    expect(cashierPendingSaleAttemptAppliesToOrder(attemptA, null)).toBe(false);
  });

  it("does not apply a missing attempt", () => {
    expect(cashierPendingSaleAttemptAppliesToOrder(null, 10)).toBe(false);
    expect(cashierPendingSaleAttemptAppliesToOrder(null, null)).toBe(false);
  });
});
