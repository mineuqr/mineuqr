import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  consumeOrderWelcomeReceived,
  markOrderWelcomeReceived,
  resetOrderWelcomeForTests,
} from "./orderWelcomeStorage";

function createSessionStorageMock(): Storage {
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

describe("orderWelcomeStorage CUSTOMER-UX-2", () => {
  beforeEach(() => {
    vi.stubGlobal("sessionStorage", createSessionStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetOrderWelcomeForTests();
  });

  it("consumeOrderWelcomeReceived returns true once then false", () => {
    markOrderWelcomeReceived("tok123456789012345");
    expect(consumeOrderWelcomeReceived("tok123456789012345")).toBe(true);
    expect(consumeOrderWelcomeReceived("tok123456789012345")).toBe(false);
  });
});
