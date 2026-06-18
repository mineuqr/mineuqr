import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearDiningSession,
  diningSessionStorageKey,
  loadDiningSession,
  resetDiningSessionsForTests,
  saveDiningSession,
} from "./diningSessionStorage";

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

describe("diningSessionStorage TABLE-MANAGEMENT-1 D4", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetDiningSessionsForTests();
  });

  it("saves and loads dining session hint per slug and table", () => {
    saveDiningSession({
      sessionToken: "tok-abc123456789012",
      slug: "cafe",
      tableNumber: 5,
    });

    expect(loadDiningSession("cafe", 5)).toMatchObject({
      sessionToken: "tok-abc123456789012",
      slug: "cafe",
      tableNumber: 5,
    });
    expect(loadDiningSession("cafe", 6)).toBeNull();
    expect(loadDiningSession("other", 5)).toBeNull();
  });

  it("uses stable localStorage key", () => {
    expect(diningSessionStorageKey("cafe", 12)).toBe("mineuqr:dining-session:cafe:12");
  });

  it("clears stored session", () => {
    saveDiningSession({
      sessionToken: "tok-abc123456789012",
      slug: "cafe",
      tableNumber: 3,
    });
    clearDiningSession("cafe", 3);
    expect(loadDiningSession("cafe", 3)).toBeNull();
  });

  it("returns null for malformed stored JSON", () => {
    localStorage.setItem(diningSessionStorageKey("cafe", 1), "{not-json");
    expect(loadDiningSession("cafe", 1)).toBeNull();
  });

  it("returns null when slug or tableNumber mismatch", () => {
    localStorage.setItem(
      diningSessionStorageKey("cafe", 2),
      JSON.stringify({
        sessionToken: "tok-abc123456789012",
        slug: "other",
        tableNumber: 2,
      })
    );
    expect(loadDiningSession("cafe", 2)).toBeNull();
  });

  it("ignores save when required fields missing", () => {
    saveDiningSession({ sessionToken: "", slug: "cafe", tableNumber: 1 });
    expect(loadDiningSession("cafe", 1)).toBeNull();
  });
});
