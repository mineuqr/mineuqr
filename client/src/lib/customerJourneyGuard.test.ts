/**
 * TABLE-QR-SAME-SESSION-FRESH-QR-NEW-ORDER-1
 * plus CUSTOMER-CHECKOUT-UX-1C regressions.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolvePostSubmissionOrderingBlock } from "./customerJourneyGuard";
import {
  loadCustomerJourney,
  markCustomerJourneyTracking,
  readDocumentNavigationStartedAt,
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

const OPEN_SESSION = {
  sessionToken: "session-token-abc123456",
  status: "open" as const,
  tableNumber: 5,
  openedAt: "2026-06-18T12:00:00.000Z",
};

function submittedJourney() {
  markCustomerJourneyTracking({
    slug: "cafe",
    tableNumber: 5,
    trackingToken: "track-token-1234567890",
    sessionToken: OPEN_SESSION.sessionToken,
  });
}

function resolve(recovery: {
  session: typeof OPEN_SESSION | null;
  sessionEnded: boolean;
  endedStatus?: "closed" | "paid" | "complimentary";
}) {
  return resolvePostSubmissionOrderingBlock({
    slug: "cafe",
    tableNumber: 5,
    recovery,
    recoveryDone: true,
  });
}

/** Physical QR: a new document load. Does not use navType === "navigate" alone. */
function simulateFreshQrDocument() {
  const previous = readDocumentNavigationStartedAt() ?? 1;
  vi.spyOn(performance, "timeOrigin", "get").mockReturnValue(previous + 50_000);
  vi.spyOn(performance, "getEntriesByType").mockReturnValue([
    { type: "navigate" } as PerformanceNavigationTiming,
  ]);
}

describe("resolvePostSubmissionOrderingBlock same-session fresh QR", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createSessionStorageMock());
    vi.stubGlobal("sessionStorage", createSessionStorageMock());
    submittedJourney();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetCustomerJourneyForTests();
    vi.restoreAllMocks();
  });

  it("allows Menu on a fresh QR document with the same open Session", () => {
    simulateFreshQrDocument();

    const result = resolve({ session: OPEN_SESSION, sessionEnded: false });

    expect(result.blocked).toBe(false);
    expect(loadCustomerJourney("cafe", 5)).toBeNull();
  });

  it("allows a second, third, and fourth fresh QR on the same Session", () => {
    for (let order = 2; order <= 4; order += 1) {
      simulateFreshQrDocument();
      expect(resolve({ session: OPEN_SESSION, sessionEnded: false }).blocked).toBe(
        false
      );

      markCustomerJourneyTracking({
        slug: "cafe",
        tableNumber: 5,
        trackingToken: `track-token-order-${order}`.padEnd(20, "x"),
        sessionToken: OPEN_SESSION.sessionToken,
      });
    }

    expect(loadCustomerJourney("cafe", 5)?.sessionToken).toBe(
      OPEN_SESSION.sessionToken
    );
  });

  it("blocks Back after Order 1", () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { type: "back_forward" } as PerformanceNavigationTiming,
    ]);

    const result = resolve({ session: OPEN_SESSION, sessionEnded: false });

    expect(result.blocked).toBe(true);
    expect(result.trackingPath).toBe("/menu/cafe/order/track-token-1234567890");
  });

  it("blocks Refresh after Order 1", () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { type: "reload" } as PerformanceNavigationTiming,
    ]);

    const result = resolve({ session: OPEN_SESSION, sessionEnded: false });

    expect(result.blocked).toBe(true);
  });

  it("blocks a stale Menu URL on the submitted document", () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { type: "navigate" } as PerformanceNavigationTiming,
    ]);

    const result = resolve({ session: OPEN_SESSION, sessionEnded: false });

    expect(result.blocked).toBe(true);
  });

  it("blocks stale Review / Cart on the submitted document", () => {
    const result = resolve({ session: OPEN_SESSION, sessionEnded: false });

    expect(result.blocked).toBe(true);
    expect(loadCustomerJourney("cafe", 5)?.phase).toBe("tracking");
  });

  it("does not treat Session CLOSED as a reason to unlock the submitted document", () => {
    const result = resolve({
      session: null,
      sessionEnded: true,
      endedStatus: "closed",
    });

    expect(result.blocked).toBe(true);
  });

  it("preserves Device B: no local journey means Menu is allowed", () => {
    resetCustomerJourneyForTests();

    const result = resolve({ session: OPEN_SESSION, sessionEnded: false });

    expect(result.blocked).toBe(false);
  });

  it("still unlocks when staff opened Session B (different token)", () => {
    const result = resolve({
      session: {
        ...OPEN_SESSION,
        sessionToken: "fresh-session-token123",
      },
      sessionEnded: false,
    });

    expect(result.blocked).toBe(false);
  });
});

describe("resolvePostSubmissionOrderingBlock CUSTOMER-CHECKOUT-UX-1C", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createSessionStorageMock());
    vi.stubGlobal("sessionStorage", createSessionStorageMock());
    submittedJourney();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetCustomerJourneyForTests();
    vi.restoreAllMocks();
  });

  it("blocks when post-submit seal is present (same tab journey)", () => {
    const result = resolve({ session: null, sessionEnded: false });

    expect(result.blocked).toBe(true);
    expect(result.trackingPath).toBe("/menu/cafe/order/track-token-1234567890");
  });

  it("blocks on back_forward navigation", () => {
    vi.spyOn(performance, "getEntriesByType").mockReturnValue([
      { type: "back_forward" } as PerformanceNavigationTiming,
    ]);

    const result = resolve({ session: null, sessionEnded: false });

    expect(result.blocked).toBe(true);
  });

  it("allows ordering when no journey lock exists", () => {
    resetCustomerJourneyForTests();

    const result = resolve({ session: null, sessionEnded: false });

    expect(result.blocked).toBe(false);
  });

  it("clears stale lock in a new tab without post-submit seal", () => {
    sessionStorage.clear();

    const result = resolve({ session: null, sessionEnded: false });

    expect(result.blocked).toBe(false);
  });
});

describe("customer journey guard side-effect contract", () => {
  it("does not call order.create, Session, or Check APIs", () => {
    const guard = readFileSync(
      path.join(process.cwd(), "client/src/lib/customerJourneyGuard.ts"),
      "utf8"
    );
    const storage = readFileSync(
      path.join(process.cwd(), "client/src/lib/customerJourneyStorage.ts"),
      "utf8"
    );

    for (const source of [guard, storage]) {
      expect(source).not.toContain("trpc.order");
      expect(source).not.toContain("createOrder");
      expect(source).not.toContain("createSession");
      expect(source).not.toContain("createOpenCheckForSession");
      expect(source).not.toMatch(/fetch\(|trpc\./);
      expect(source).not.toContain("submissionId");
    }
  });
});
