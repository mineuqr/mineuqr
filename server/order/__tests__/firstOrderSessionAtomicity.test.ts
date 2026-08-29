/**
 * FIRST-ORDER-SESSION-CREATE-FAIL-CLOSED-HARDENING-1
 *
 * A first Table/QR Order against a closed Session must open the Session as part
 * of the successful Order, and must leave NOTHING behind when it fails:
 *
 *   success → 1 dining_session + 1 SESSION_OPENED + 1 Check + 1 Order + Items + OrderCreated Outbox
 *   failure → 0 dining_sessions, 0 SESSION_OPENED, 0 Checks, 0 Orders
 *
 * The fake transaction below only publishes staged rows when the transaction
 * callback resolves, so "committed" here means exactly what it means in MySQL.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../../_core/context";
import { ENV } from "../../_core/env";
import { orderDomainOutbox, orderItems, orders } from "../../../drizzle/schema";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  insertSession: vi.fn(),
  insertSessionEvent: vi.fn(),
  findActiveSession: vi.fn(),
  findSessionByToken: vi.fn(),
  findSessionById: vi.fn(),
  createOpenCheckForSession: vi.fn(),
}));

vi.mock("../../orderTrackingToken", () => ({
  generateOrderTrackingToken: vi.fn(() => "tracking-token-first-order"),
}));

vi.mock("../../db", () => ({
  getDb: mocks.getDb,
  getMenuItemById: vi.fn(async (id: number) =>
    id === 1
      ? {
          id: 1,
          categoryId: 1,
          restaurantId: 1,
          nameAr: "حمص",
          nameEn: null,
          price: "10.00",
          isAvailable: true,
          descriptionAr: null,
          descriptionEn: null,
          imageUrl: null,
          sortOrder: 0,
          createdAt: "2026-01-01",
          updatedAt: "2026-01-01",
          calories: null,
        }
      : undefined
  ),
  getRestaurantById: vi.fn(async () => ({
    id: 1,
    userId: 10,
    nameAr: "r",
    isActive: true,
    workingHours: null,
    temporaryClosure: null,
    currencySymbol: "ر.س",
  })),
  getTableByRestaurantAndNumber: vi.fn(async () => ({
    id: 7,
    tableNumber: 3,
    restaurantId: 1,
    isActive: true,
  })),
  getTableById: vi.fn(async () => ({
    id: 7,
    tableNumber: 3,
    restaurantId: 1,
    isActive: true,
  })),
  generateOrderNumber: vi.fn(async () => "ORD-FO-001"),
  createNotification: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("../../diningSession/sessionRepository", () => ({
  insertSession: mocks.insertSession,
  insertSessionEvent: mocks.insertSessionEvent,
  findActiveSession: mocks.findActiveSession,
  findSessionByToken: mocks.findSessionByToken,
  findSessionById: mocks.findSessionById,
  updateSessionStatus: vi.fn(),
}));

vi.mock("../../operational-session/check/CheckService", () => ({
  createOpenCheckForSession: mocks.createOpenCheckForSession,
}));

vi.mock("../../commercial/guestOrderingAuthority", () => ({
  resolveGuestOrderingAllowed: vi.fn(async () => ({ canOrder: true })),
}));

vi.mock("../../order/eventInfrastructureComposition", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../order/eventInfrastructureComposition")
  >();
  return {
    ...actual,
    runOrderEventRelayBatch: vi.fn(async () => ({
      processed: 0,
      published: 0,
      failed: 0,
      skipped: 0,
    })),
  };
});

import { appRouter } from "../../routers";

type Rows = {
  diningSessions: Record<string, unknown>[];
  sessionOpenedEvents: Record<string, unknown>[];
  checks: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  orderItems: Record<string, unknown>[];
  outbox: Record<string, unknown>[];
};

function emptyRows(): Rows {
  return {
    diningSessions: [],
    sessionOpenedEvents: [],
    checks: [],
    orders: [],
    orderItems: [],
    outbox: [],
  };
}

function createCaller() {
  return appRouter.createCaller({
    user: null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

function submitFirstOrder(items: { menuItemId: number; quantity: number }[] = [
  { menuItemId: 1, quantity: 2 },
]) {
  return createCaller().order.create({
    restaurantId: 1,
    tableId: 999,
    tableNumber: 3,
    items,
  });
}

describe("first Order opens the Session atomically", () => {
  let committed: Rows;
  let failAt: "none" | "orders" | "orderItems" | "outbox" | "commit";
  let nextSessionId: number;

  beforeEach(() => {
    vi.clearAllMocks();
    ENV.tableSessionDualWrite = true;
    committed = emptyRows();
    failAt = "none";
    nextSessionId = 500;

    // Closed table: no active Session, no hinted token.
    mocks.findActiveSession.mockResolvedValue(null);
    mocks.findSessionByToken.mockResolvedValue(null);

    // Session opening writes stage onto the caller transaction it is handed.
    mocks.insertSession.mockImplementation(
      async (data: Record<string, unknown>, client: { __staged?: Rows }) => {
        const id = nextSessionId++;
        client.__staged?.diningSessions.push({ id, ...data });
        return id;
      }
    );
    mocks.insertSessionEvent.mockImplementation(
      async (data: Record<string, unknown>, client: { __staged?: Rows }) => {
        if (data.eventType === "SESSION_OPENED") {
          client.__staged?.sessionOpenedEvents.push(data);
        }
        return 1;
      }
    );
    mocks.createOpenCheckForSession.mockImplementation(
      async (input: Record<string, unknown>, client: { __staged?: Rows }) => {
        const id = 800 + (client.__staged?.checks.length ?? 0);
        client.__staged?.checks.push({ id, ...input });
        return { id };
      }
    );

    mocks.getDb.mockResolvedValue({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        const staged = emptyRows();
        const tx = {
          __staged: staged,
          execute: async () => [
            [{ id: 1, userId: 10, workingHours: null, n: 1 }],
          ],
          insert: (table: unknown) => ({
            values: async (values: unknown) => {
              const rows = (Array.isArray(values) ? values : [values]) as Record<
                string,
                unknown
              >[];
              if (table === orders) {
                if (failAt === "orders") throw new Error("order_insert_failed");
                staged.orders.push(...rows);
                return [{ insertId: 55 }];
              }
              if (table === orderItems) {
                if (failAt === "orderItems") {
                  throw new Error("order_items_insert_failed");
                }
                staged.orderItems.push(...rows);
                return undefined;
              }
              if (table === orderDomainOutbox) {
                if (failAt === "outbox") throw new Error("outbox_insert_failed");
                staged.outbox.push(...rows);
                return undefined;
              }
              return undefined;
            },
          }),
          select: () => ({
            from: (table: unknown) => {
              const chain = {
                where: () => chain,
                orderBy: () => chain,
                limit: () => chain,
                for: () => chain,
                then: (
                  onFulfilled?: (value: Record<string, unknown>[]) => unknown,
                  onRejected?: (reason: unknown) => unknown
                ) =>
                  Promise.resolve(
                    table === orderDomainOutbox ? [{ maxSeq: 0 }] : []
                  ).then(onFulfilled, onRejected),
              };
              return chain;
            },
          }),
          update: () => ({ set: () => ({ where: async () => undefined }) }),
        };

        const result = await fn(tx);
        if (failAt === "commit") throw new Error("commit_failed");
        committed.diningSessions.push(...staged.diningSessions);
        committed.sessionOpenedEvents.push(...staged.sessionOpenedEvents);
        committed.checks.push(...staged.checks);
        committed.orders.push(...staged.orders);
        committed.orderItems.push(...staged.orderItems);
        committed.outbox.push(...staged.outbox);
        return result;
      },
    });
  });

  afterEach(() => {
    ENV.tableSessionDualWrite = false;
  });

  function expectNothingCommitted() {
    expect(committed.diningSessions).toHaveLength(0);
    expect(committed.sessionOpenedEvents).toHaveLength(0);
    expect(committed.checks).toHaveLength(0);
    expect(committed.orders).toHaveLength(0);
    expect(committed.orderItems).toHaveLength(0);
    expect(committed.outbox).toHaveLength(0);
  }

  it("commits one Session, SESSION_OPENED, Check, Order, Items and Outbox", async () => {
    const result = await submitFirstOrder();

    expect(committed.diningSessions).toHaveLength(1);
    expect(committed.sessionOpenedEvents).toHaveLength(1);
    expect(committed.checks).toHaveLength(1);
    expect(committed.orders).toHaveLength(1);
    expect(committed.orderItems).toHaveLength(1);
    expect(committed.outbox).toHaveLength(1);

    // The Order row carries the Session opened in the same transaction.
    expect(committed.orders[0]).toMatchObject({ sessionId: 500 });
    expect(result.sessionId).toBe(500);
    expect(result.orderId).toBe(55);
  });

  it("stamps the new sessionId on the OrderCreated event", async () => {
    await submitFirstOrder();

    const row = committed.outbox[0];
    expect(row.eventType).toBe("OrderCreated");
    const payload = JSON.parse(String(row.payload)) as { sessionId?: number };
    expect(payload.sessionId).toBe(500);
  });

  it("leaves no Session and no Check when the Order INSERT fails", async () => {
    failAt = "orders";

    await expect(submitFirstOrder()).rejects.toThrow();

    expectNothingCommitted();
  });

  it("leaves no Session and no Check when the Order Items INSERT fails", async () => {
    failAt = "orderItems";

    await expect(submitFirstOrder()).rejects.toThrow();

    expectNothingCommitted();
  });

  it("leaves no Session and no Check when the OrderCreated Outbox fails", async () => {
    failAt = "outbox";

    await expect(submitFirstOrder()).rejects.toThrow();

    expectNothingCommitted();
  });

  it("leaves no Session and no Check when the commit fails", async () => {
    failAt = "commit";

    await expect(submitFirstOrder()).rejects.toThrow();

    expectNothingCommitted();
  });

  it("leaves no Session and no Check when an item is not orderable", async () => {
    // Deterministic customer-input rejection: pricing throws before persistence.
    await expect(submitFirstOrder([{ menuItemId: 999, quantity: 1 }])).rejects.toThrow();

    expectNothingCommitted();
    expect(mocks.insertSession).not.toHaveBeenCalled();
  });

  it("leaves no Session and no Check when the database is unavailable", async () => {
    mocks.getDb.mockResolvedValue(null);

    await expect(submitFirstOrder()).rejects.toThrow("database_unavailable");

    expectNothingCommitted();
    expect(mocks.insertSession).not.toHaveBeenCalled();
  });

  it("opens exactly one Session when a failed first attempt is retried", async () => {
    failAt = "orders";
    await expect(submitFirstOrder()).rejects.toThrow();
    expectNothingCommitted();

    failAt = "none";
    const result = await submitFirstOrder();

    expect(committed.diningSessions).toHaveLength(1);
    expect(committed.checks).toHaveLength(1);
    expect(committed.orders).toHaveLength(1);
    // The retry opens a fresh Session; it never adopts an orphan from the failure.
    expect(result.sessionId).toBe(501);
  });
});

describe("existing open Session is never disturbed by a new Order", () => {
  let committed: Rows;
  let failOrderInsert: boolean;

  const activeSession = {
    id: 10,
    restaurantId: 1,
    tableId: 7,
    tableNumber: 3,
    sessionToken: "sess-tok",
    status: "open" as const,
    openGuard: 1,
    openedAt: "2026-06-18 12:00:00",
    settledAt: null,
    settlementOutcome: null,
    closedAt: null,
    totalAmount: null,
    totalOrders: 1,
    activeCheckId: 800,
    createdAt: "2026-06-18 12:00:00",
    updatedAt: "2026-06-18 12:00:00",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    ENV.tableSessionDualWrite = true;
    committed = emptyRows();
    failOrderInsert = false;

    mocks.findActiveSession.mockResolvedValue(activeSession);
    mocks.findSessionByToken.mockResolvedValue(null);

    mocks.getDb.mockResolvedValue({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        const staged = emptyRows();
        const tx = {
          __staged: staged,
          execute: async () => [
            [{ id: 1, userId: 10, workingHours: null, n: 1 }],
          ],
          insert: (table: unknown) => ({
            values: async (values: unknown) => {
              const rows = (Array.isArray(values) ? values : [values]) as Record<
                string,
                unknown
              >[];
              if (table === orders) {
                if (failOrderInsert) throw new Error("order_insert_failed");
                staged.orders.push(...rows);
                return [{ insertId: 56 }];
              }
              if (table === orderItems) {
                staged.orderItems.push(...rows);
                return undefined;
              }
              if (table === orderDomainOutbox) {
                staged.outbox.push(...rows);
                return undefined;
              }
              return undefined;
            },
          }),
          select: () => ({
            from: (table: unknown) => {
              const chain = {
                where: () => chain,
                orderBy: () => chain,
                limit: () => chain,
                for: () => chain,
                then: (
                  onFulfilled?: (value: Record<string, unknown>[]) => unknown,
                  onRejected?: (reason: unknown) => unknown
                ) =>
                  Promise.resolve(
                    table === orderDomainOutbox ? [{ maxSeq: 0 }] : []
                  ).then(onFulfilled, onRejected),
              };
              return chain;
            },
          }),
          update: () => ({ set: () => ({ where: async () => undefined }) }),
        };
        const result = await fn(tx);
        committed.diningSessions.push(...staged.diningSessions);
        committed.checks.push(...staged.checks);
        committed.orders.push(...staged.orders);
        committed.outbox.push(...staged.outbox);
        return result;
      },
    });
  });

  afterEach(() => {
    ENV.tableSessionDualWrite = false;
  });

  it("reuses the open Session and creates no second Session or Check", async () => {
    const result = await submitFirstOrder();

    expect(mocks.insertSession).not.toHaveBeenCalled();
    expect(mocks.createOpenCheckForSession).not.toHaveBeenCalled();
    expect(committed.diningSessions).toHaveLength(0);
    expect(committed.orders[0]).toMatchObject({ sessionId: 10 });
    expect(result.sessionId).toBe(10);
  });

  it("supports many Orders on one Session", async () => {
    await submitFirstOrder();
    await submitFirstOrder();
    await submitFirstOrder();

    expect(committed.orders).toHaveLength(3);
    expect(committed.orders.every((row) => row.sessionId === 10)).toBe(true);
    expect(mocks.insertSession).not.toHaveBeenCalled();
  });

  it("leaves the existing Session and Check intact when a later Order fails", async () => {
    failOrderInsert = true;

    await expect(submitFirstOrder()).rejects.toThrow();

    // No deletion, no closure, no compensation touched the shared Session.
    expect(mocks.insertSession).not.toHaveBeenCalled();
    expect(committed.orders).toHaveLength(0);
    expect(committed.diningSessions).toHaveLength(0);
    expect(committed.checks).toHaveLength(0);
  });
});

describe("concurrent first Orders converge on one Session", () => {
  let committed: Rows;
  let activeSession: Record<string, unknown> | null;
  let nextSessionId: number;

  beforeEach(() => {
    vi.clearAllMocks();
    ENV.tableSessionDualWrite = true;
    committed = emptyRows();
    activeSession = null;
    nextSessionId = 700;

    // The restaurant row FOR UPDATE lock serializes order persist per restaurant,
    // so a second request observes the first request's committed Session.
    mocks.findActiveSession.mockImplementation(async () => activeSession);
    mocks.findSessionByToken.mockResolvedValue(null);

    mocks.insertSession.mockImplementation(
      async (data: Record<string, unknown>, client: { __staged?: Rows }) => {
        const id = nextSessionId++;
        client.__staged?.diningSessions.push({ id, ...data });
        return id;
      }
    );
    mocks.insertSessionEvent.mockImplementation(
      async (data: Record<string, unknown>, client: { __staged?: Rows }) => {
        if (data.eventType === "SESSION_OPENED") {
          client.__staged?.sessionOpenedEvents.push(data);
        }
        return 1;
      }
    );
    mocks.createOpenCheckForSession.mockImplementation(
      async (input: Record<string, unknown>, client: { __staged?: Rows }) => {
        client.__staged?.checks.push(input);
        return { id: 900 };
      }
    );

    let nextOrderId = 60;
    mocks.getDb.mockResolvedValue({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        const staged = emptyRows();
        const tx = {
          __staged: staged,
          execute: async () => [
            [{ id: 1, userId: 10, workingHours: null, n: 1 }],
          ],
          insert: (table: unknown) => ({
            values: async (values: unknown) => {
              const rows = (Array.isArray(values) ? values : [values]) as Record<
                string,
                unknown
              >[];
              if (table === orders) {
                staged.orders.push(...rows);
                return [{ insertId: nextOrderId++ }];
              }
              if (table === orderItems) return undefined;
              if (table === orderDomainOutbox) {
                staged.outbox.push(...rows);
                return undefined;
              }
              return undefined;
            },
          }),
          select: () => ({
            from: (table: unknown) => {
              const chain = {
                where: () => chain,
                orderBy: () => chain,
                limit: () => chain,
                for: () => chain,
                then: (
                  onFulfilled?: (value: Record<string, unknown>[]) => unknown,
                  onRejected?: (reason: unknown) => unknown
                ) =>
                  Promise.resolve(
                    table === orderDomainOutbox ? [{ maxSeq: 0 }] : []
                  ).then(onFulfilled, onRejected),
              };
              return chain;
            },
          }),
          update: () => ({ set: () => ({ where: async () => undefined }) }),
        };
        const result = await fn(tx);
        committed.diningSessions.push(...staged.diningSessions);
        committed.sessionOpenedEvents.push(...staged.sessionOpenedEvents);
        committed.checks.push(...staged.checks);
        committed.orders.push(...staged.orders);
        committed.outbox.push(...staged.outbox);
        // Publishing the Session is what a later serialized request observes.
        const opened = staged.diningSessions[0];
        if (opened) {
          activeSession = {
            ...opened,
            activeCheckId: 900,
            status: "open",
            openGuard: 1,
          };
        }
        return result;
      },
    });
  });

  afterEach(() => {
    ENV.tableSessionDualWrite = false;
  });

  it("two serialized first Orders yield one Session and two Orders", async () => {
    const first = await submitFirstOrder();
    const second = await submitFirstOrder();

    expect(committed.diningSessions).toHaveLength(1);
    expect(committed.sessionOpenedEvents).toHaveLength(1);
    expect(committed.checks).toHaveLength(1);
    expect(committed.orders).toHaveLength(2);
    expect(first.sessionId).toBe(700);
    expect(second.sessionId).toBe(700);
    expect(first.orderId).not.toBe(second.orderId);
  });

  it("three serialized first Orders yield one Session and three Orders", async () => {
    await submitFirstOrder();
    await submitFirstOrder();
    await submitFirstOrder();

    expect(committed.diningSessions).toHaveLength(1);
    expect(committed.orders).toHaveLength(3);
    expect(committed.orders.every((row) => row.sessionId === 700)).toBe(true);
  });
});
