import { describe, expect, it, beforeEach, afterEach } from "vitest";
import {
  ORDERING_CART_PERSISTENCE_NAMESPACE,
  buildCartPersistenceKey,
  clearCartByScopeKey,
  loadCartByScopeKey,
  saveCartByScopeKey,
  createQrTableCartScopeAdapter,
} from "../index";

describe("ORDERING-CLIENT-CART-1 persistence", () => {
  const memory = new Map<string, string>();

  beforeEach(() => {
    memory.clear();
    Object.defineProperty(globalThis, "sessionStorage", {
      configurable: true,
      value: {
        getItem: (k: string) => memory.get(k) ?? null,
        setItem: (k: string, v: string) => {
          memory.set(k, v);
        },
        removeItem: (k: string) => {
          memory.delete(k);
        },
      },
    });
  });

  afterEach(() => {
    // restore is best-effort for node vitest
  });

  it("preserves QR legacy storage key format", () => {
    const adapter = createQrTableCartScopeAdapter("cafe", 4);
    expect(adapter.persistenceNamespace).toBe(ORDERING_CART_PERSISTENCE_NAMESPACE);
    expect(adapter.resolveScopeKey()).toBe("mineuqr:cart:cafe:4");
    expect(
      buildCartPersistenceKey(ORDERING_CART_PERSISTENCE_NAMESPACE, ["cafe", "4"])
    ).toBe("mineuqr:cart:cafe:4");
  });

  it("hydrates restores and clears by opaque scope key", () => {
    const a = createQrTableCartScopeAdapter("r1", 1);
    const b = createQrTableCartScopeAdapter("r1", 2);
    const keyA = a.resolveScopeKey();
    const keyB = b.resolveScopeKey();

    saveCartByScopeKey(keyA, [
      {
        menuItemId: 10,
        nameAr: "أ",
        nameEn: "A",
        price: "5.00",
        quantity: 2,
      },
    ]);
    saveCartByScopeKey(keyB, [
      {
        menuItemId: 20,
        nameAr: "ب",
        nameEn: "B",
        price: "3.00",
        quantity: 1,
      },
    ]);

    expect(loadCartByScopeKey(keyA)).toHaveLength(1);
    expect(loadCartByScopeKey(keyA)[0]?.menuItemId).toBe(10);
    expect(loadCartByScopeKey(keyB)[0]?.menuItemId).toBe(20);

    clearCartByScopeKey(keyA);
    expect(loadCartByScopeKey(keyA)).toEqual([]);
    expect(loadCartByScopeKey(keyB)).toHaveLength(1);
  });

  it("isolates carts across restaurants", () => {
    const left = createQrTableCartScopeAdapter("alpha", 1).resolveScopeKey();
    const right = createQrTableCartScopeAdapter("beta", 1).resolveScopeKey();
    expect(left).not.toBe(right);
    saveCartByScopeKey(left, [
      {
        menuItemId: 1,
        nameAr: "x",
        price: "1",
        quantity: 1,
      },
    ]);
    expect(loadCartByScopeKey(right)).toEqual([]);
  });
});
