import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePostSubmissionOrderingBlock } from "./customerJourneyGuard";
import {
  markCustomerJourneyTracking,
  resetCustomerJourneyForTests,
} from "./customerJourneyStorage";

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

describe("resolvePostSubmissionOrderingBlock CUSTOMER-CHECKOUT-UX-1C", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createSessionStorageMock());
    vi.stubGlobal("sessionStorage", createSessionStorageMock());
    markCustomerJourneyTracking({
      slug: "cafe",
      tableNumber: 5,
      trackingToken: "track-token-1234567890",
      sessionToken: "session-token-abc123456",
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetCustomerJourneyForTests();
    vi.restoreAllMocks();
  });

  it("blocks when post-submit seal is present (same tab journey)", () => {
    const result = resolvePostSubmissionOrderingBlock({
      slug: "cafe",
      tableNumber: 5,
      recovery: { session: null, sessionEnded: false },
      recoveryDone: true,
    });

    expect(result.blocked).toBe(true);
    expect(result.trackingPath).toBe("/menu/cafe/order/track-token-1234567890");
  });

  it("blocks on back_forward navigation", () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { type: "back_forward" } as PerformanceNavigationTiming,
    ]);

    const result = resolvePostSubmissionOrderingBlock({
      slug: "cafe",
      tableNumber: 5,
      recovery: { session: null, sessionEnded: false },
      recoveryDone: true,
    });

    expect(result.blocked).toBe(true);
  });

  it("clears lock when a new open session token is detected (Session B)", () => {
    const result = resolvePostSubmissionOrderingBlock({
      slug: "cafe",
      tableNumber: 5,
      recovery: {
        session: {
          sessionToken: "fresh-session-token123",
          status: "open",
          tableNumber: 5,
          openedAt: "2026-06-18T12:00:00.000Z",
        },
        sessionEnded: false,
      },
      recoveryDone: true,
    });

    expect(result.blocked).toBe(false);
  });

  it("allows ordering when no journey lock exists", () => {
    resetCustomerJourneyForTests();

    const result = resolvePostSubmissionOrderingBlock({
      slug: "cafe",
      tableNumber: 5,
      recovery: { session: null, sessionEnded: false },
      recoveryDone: true,
    });

    expect(result.blocked).toBe(false);
  });

  it("clears stale lock in a new tab without post-submit seal", () => {
    sessionStorage.clear();

    const result = resolvePostSubmissionOrderingBlock({
      slug: "cafe",
      tableNumber: 5,
      recovery: { session: null, sessionEnded: false },
      recoveryDone: true,
    });

    expect(result.blocked).toBe(false);
  });
});
