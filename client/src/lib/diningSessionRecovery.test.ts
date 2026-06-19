import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  isDiningSessionOrderingEnabled,
  recoverDiningSession,
  type DiningSessionRecoveryClient,
  type RecoveredDiningSession,
} from "./diningSessionRecovery";
import {
  diningSessionStorageKey,
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

const openSession: RecoveredDiningSession = {
  sessionToken: "server-token-abc123456",
  status: "open",
  tableNumber: 5,
  openedAt: "2026-06-18T12:00:00.000Z",
};

const billRequestedSession: RecoveredDiningSession = {
  ...openSession,
  status: "bill_requested",
  billRequestedAt: "2026-06-18T13:00:00.000Z",
};

describe("diningSessionRecovery TABLE-MANAGEMENT-1 D4", () => {
  beforeEach(() => {
    vi.stubGlobal("localStorage", createLocalStorageMock());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    resetDiningSessionsForTests();
  });

  it("recovers by token (tier 1)", async () => {
    saveDiningSession({
      sessionToken: "stale-hint-token123456",
      slug: "cafe",
      tableNumber: 5,
    });

    const client: DiningSessionRecoveryClient = {
      getByToken: vi.fn(async () => openSession),
      getActiveByTable: vi.fn(async () => null),
    };

    const session = await recoverDiningSession({
      slug: "cafe",
      tableNumber: 5,
      client,
    });

    expect(client.getByToken).toHaveBeenCalledWith({
      slug: "cafe",
      sessionToken: "stale-hint-token123456",
    });
    expect(client.getActiveByTable).not.toHaveBeenCalled();
    expect(session).toEqual(openSession);
  });

  it("falls back to getActiveByTable when token lookup fails (tier 2)", async () => {
    saveDiningSession({
      sessionToken: "expired-token1234567",
      slug: "cafe",
      tableNumber: 5,
    });

    const client: DiningSessionRecoveryClient = {
      getByToken: vi.fn(async () => null),
      getActiveByTable: vi.fn(async () => openSession),
    };

    const session = await recoverDiningSession({
      slug: "cafe",
      tableNumber: 5,
      client,
    });

    expect(client.getActiveByTable).toHaveBeenCalledWith({
      slug: "cafe",
      tableNumber: 5,
    });
    expect(session).toEqual(openSession);
  });

  it("overwrites client hint when server token differs (server wins)", async () => {
    saveDiningSession({
      sessionToken: "old-client-token123456",
      slug: "cafe",
      tableNumber: 5,
    });

    const client: DiningSessionRecoveryClient = {
      getByToken: vi.fn(async () => null),
      getActiveByTable: vi.fn(async () => ({
        ...openSession,
        sessionToken: "new-server-token123456",
      })),
    };

    await recoverDiningSession({ slug: "cafe", tableNumber: 5, client });

    const stored = JSON.parse(
      localStorage.getItem(diningSessionStorageKey("cafe", 5)) ?? "{}"
    );
    expect(stored.sessionToken).toBe("new-server-token123456");
  });

  it("clears stale hint when no server session exists", async () => {
    saveDiningSession({
      sessionToken: "orphan-token12345678",
      slug: "cafe",
      tableNumber: 5,
    });

    const client: DiningSessionRecoveryClient = {
      getByToken: vi.fn(async () => null),
      getActiveByTable: vi.fn(async () => null),
    };

    const session = await recoverDiningSession({
      slug: "cafe",
      tableNumber: 5,
      client,
    });

    expect(session).toBeNull();
    expect(localStorage.getItem(diningSessionStorageKey("cafe", 5))).toBeNull();
  });

  it("supports multiple tabs with independent storage reads (same session from server)", async () => {
    saveDiningSession({
      sessionToken: "tab-a-token123456789",
      slug: "cafe",
      tableNumber: 5,
    });

    const clientA: DiningSessionRecoveryClient = {
      getByToken: vi.fn(async () => openSession),
      getActiveByTable: vi.fn(async () => openSession),
    };

    const tabA = await recoverDiningSession({
      slug: "cafe",
      tableNumber: 5,
      client: clientA,
    });

    saveDiningSession({
      sessionToken: "tab-b-token123456789",
      slug: "cafe",
      tableNumber: 5,
    });

    const clientB: DiningSessionRecoveryClient = {
      getByToken: vi.fn(async () => openSession),
      getActiveByTable: vi.fn(async () => openSession),
    };

    const tabB = await recoverDiningSession({
      slug: "cafe",
      tableNumber: 5,
      client: clientB,
    });

    expect(tabA?.sessionToken).toBe(openSession.sessionToken);
    expect(tabB?.sessionToken).toBe(openSession.sessionToken);
  });

  describe("isDiningSessionOrderingEnabled", () => {
    it("allows ordering when no session recovered", () => {
      expect(isDiningSessionOrderingEnabled(null)).toBe(true);
    });

    it("allows ordering for OPEN session", () => {
      expect(isDiningSessionOrderingEnabled(openSession)).toBe(true);
    });

    it("blocks ordering for BILL_REQUESTED session", () => {
      expect(isDiningSessionOrderingEnabled(billRequestedSession)).toBe(false);
    });

    it("blocks ordering after customer bill request state", () => {
      expect(
        isDiningSessionOrderingEnabled({
          sessionToken: "tok",
          status: "bill_requested",
          tableNumber: 5,
          openedAt: "2026-06-18T12:00:00.000Z",
          billRequestedAt: "2026-06-18T12:30:00.000Z",
        })
      ).toBe(false);
    });

    it("blocks ordering for PAYMENT_PENDING session", () => {
      expect(
        isDiningSessionOrderingEnabled({
          ...openSession,
          status: "payment_pending",
          paymentPendingAt: "2026-06-18T14:00:00.000Z",
        })
      ).toBe(false);
    });

    it("blocks ordering for CLOSED session", () => {
      expect(
        isDiningSessionOrderingEnabled({
          ...openSession,
          status: "closed",
        })
      ).toBe(false);
    });
  });
});
