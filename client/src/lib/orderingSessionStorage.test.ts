import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isOrderingSessionConsumed,
  loadOrderingSession,
  markOrderingSessionConsumed,
  orderingSessionStorageKey,
  resetOrderingSessionsForTests,
} from "./orderingSessionStorage";

function createLocalStorageMock(): Storage {
  const store = new Map<string, string>();
  return {
    get length() {
      return store.size;
    },
    clear() {
      store.clear();
    },
    getItem(key: string) {
      return store.get(key) ?? null;
    },
    key(index: number) {
      return [...store.keys()][index] ?? null;
    },
    removeItem(key: string) {
      store.delete(key);
    },
    setItem(key: string, value: string) {
      store.set(key, value);
    },
  };
}

describe("orderingSessionStorage ORDER-LINKED-SESSION-1", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetOrderingSessionsForTests();
  });

  it("marks and loads consumed session per slug and table", () => {
    markOrderingSessionConsumed("cafe", 5, {
      trackingToken: "tok-abc",
      orderNumber: "ORD-1",
    });

    expect(isOrderingSessionConsumed("cafe", 5)).toBe(true);
    expect(loadOrderingSession("cafe", 5)).toMatchObject({
      orderingSessionConsumed: true,
      trackingToken: "tok-abc",
      orderNumber: "ORD-1",
    });
    expect(isOrderingSessionConsumed("cafe", 6)).toBe(false);
    expect(isOrderingSessionConsumed("other", 5)).toBe(false);
  });

  it("uses stable localStorage key", () => {
    expect(orderingSessionStorageKey("cafe", 12)).toBe("mineuqr:ordering-session:cafe:12");
  });

  it("returns null for malformed stored JSON", () => {
    localStorage.setItem(orderingSessionStorageKey("cafe", 1), "{not-json");
    expect(loadOrderingSession("cafe", 1)).toBeNull();
  });

  it("returns null when consumed flag or tracking token missing", () => {
    localStorage.setItem(
      orderingSessionStorageKey("cafe", 2),
      JSON.stringify({ orderingSessionConsumed: false, trackingToken: "x" })
    );
    expect(loadOrderingSession("cafe", 2)).toBeNull();
  });
});
