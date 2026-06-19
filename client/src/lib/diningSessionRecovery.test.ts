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

const paidSession: RecoveredDiningSession = {
  ...openSession,
  status: "paid",
};

const complimentarySession: RecoveredDiningSession = {
  ...openSession,
  status: "complimentary",
};

const closedSession: RecoveredDiningSession = {
  ...openSession,
  status: "closed",
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

  describe("CUSTOMER-SESSION-LIFECYCLE-1A closed session recovery", () => {
    it("A: closed token clears storage and calls getActiveByTable", async () => {
      saveDiningSession({
        sessionToken: "closed-token123456789",
        slug: "cafe",
        tableNumber: 5,
      });

      const client: DiningSessionRecoveryClient = {
        getByToken: vi.fn(async () => closedSession),
        getActiveByTable: vi.fn(async () => null),
      };

      await recoverDiningSession({ slug: "cafe", tableNumber: 5, client });

      expect(client.getByToken).toHaveBeenCalledWith({
        slug: "cafe",
        sessionToken: "closed-token123456789",
      });
      expect(client.getActiveByTable).toHaveBeenCalledWith({
        slug: "cafe",
        tableNumber: 5,
      });
      expect(localStorage.getItem(diningSessionStorageKey("cafe", 5))).toBeNull();
    });

    it("B: closed token with no active session returns null", async () => {
      saveDiningSession({
        sessionToken: "closed-token123456789",
        slug: "cafe",
        tableNumber: 5,
      });

      const client: DiningSessionRecoveryClient = {
        getByToken: vi.fn(async () => closedSession),
        getActiveByTable: vi.fn(async () => null),
      };

      const session = await recoverDiningSession({
        slug: "cafe",
        tableNumber: 5,
        client,
      });

      expect(session).toBeNull();
      expect(isDiningSessionOrderingEnabled(session)).toBe(true);
    });

    it("C: open session recovery unchanged (tier 1, no tier 2)", async () => {
      saveDiningSession({
        sessionToken: "open-token1234567890",
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

      expect(session).toEqual(openSession);
      expect(client.getActiveByTable).not.toHaveBeenCalled();
      expect(
        JSON.parse(localStorage.getItem(diningSessionStorageKey("cafe", 5)) ?? "{}")
          .sessionToken
      ).toBe(openSession.sessionToken);
    });

    it("D: paid session is not recoverable (tier 1 cleared)", async () => {
      saveDiningSession({
        sessionToken: "paid-token12345678901",
        slug: "cafe",
        tableNumber: 5,
      });

      const client: DiningSessionRecoveryClient = {
        getByToken: vi.fn(async () => paidSession),
        getActiveByTable: vi.fn(async () => null),
      };

      const session = await recoverDiningSession({
        slug: "cafe",
        tableNumber: 5,
        client,
      });

      expect(session).toBeNull();
      expect(localStorage.getItem(diningSessionStorageKey("cafe", 5))).toBeNull();
      expect(client.getActiveByTable).toHaveBeenCalled();
    });

    it("E: complimentary session is not recoverable (tier 1 cleared)", async () => {
      saveDiningSession({
        sessionToken: "comp-token12345678901",
        slug: "cafe",
        tableNumber: 5,
      });

      const client: DiningSessionRecoveryClient = {
        getByToken: vi.fn(async () => complimentarySession),
        getActiveByTable: vi.fn(async () => null),
      };

      const session = await recoverDiningSession({
        slug: "cafe",
        tableNumber: 5,
        client,
      });

      expect(session).toBeNull();
      expect(client.getActiveByTable).toHaveBeenCalled();
    });

    it("closed token falls through to active session on table when present", async () => {
      saveDiningSession({
        sessionToken: "closed-token123456789",
        slug: "cafe",
        tableNumber: 5,
      });

      const newOpenSession: RecoveredDiningSession = {
        ...openSession,
        sessionToken: "fresh-open-token123456",
      };

      const client: DiningSessionRecoveryClient = {
        getByToken: vi.fn(async () => closedSession),
        getActiveByTable: vi.fn(async () => newOpenSession),
      };

      const session = await recoverDiningSession({
        slug: "cafe",
        tableNumber: 5,
        client,
      });

      expect(session).toEqual(newOpenSession);
      expect(
        JSON.parse(localStorage.getItem(diningSessionStorageKey("cafe", 5)) ?? "{}")
          .sessionToken
      ).toBe("fresh-open-token123456");
    });
  });

  describe("isDiningSessionOrderingEnabled", () => {
    it("allows ordering when no session recovered", () => {
      expect(isDiningSessionOrderingEnabled(null)).toBe(true);
    });

    it("allows ordering for OPEN session", () => {
      expect(isDiningSessionOrderingEnabled(openSession)).toBe(true);
    });

    it("blocks ordering for paid session", () => {
      expect(isDiningSessionOrderingEnabled(paidSession)).toBe(false);
    });

    it("blocks ordering for complimentary session", () => {
      expect(isDiningSessionOrderingEnabled(complimentarySession)).toBe(false);
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
