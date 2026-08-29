/**
 * WAITER-ATTACH-MUST-NOT-OPEN-SESSION-1
 *
 * Closed-table Waiter attach must write nothing.
 * First successful Waiter Order opens Session + Check + Order + Items + Outbox
 * in the same persist transaction as Table/QR.
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
  generateOrderTrackingToken: vi.fn(() => "tracking-token-waiter-order"),
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
  generateOrderNumber: vi.fn(async () => "ORD-WT-001"),
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

vi.mock("../../commercial/assertCommercialAccountActive", () => ({
  assertCommercialAccountActive: vi.fn(async () => undefined),
  isFrozenBlockedCommercialMutation: vi.fn(() => false),
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

function createVerifiedCaller() {
  return appRouter.createCaller({
    user: {
      id: 10,
      openId: "waiter-10",
      role: "user",
      emailVerifiedAt: new Date().toISOString(),
      loginMethod: "local",
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

function createGuestCaller() {
  return appRouter.createCaller({
    user: null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

function placeWaiterOrder(
  items: { menuItemId: number; quantity: number }[] = [{ menuItemId: 1, quantity: 2 }]
) {
  return createVerifiedCaller().order.placeAsWaiter({
    restaurantId: 1,
    serviceMode: "table_service",
    fulfilmentAnchor: {
      anchorType: "table",
      tableId: 7,
      tableNumber: 3,
    },
    items,
  });
}

function attachClosedTable() {
  return createVerifiedCaller().waiter.attachTable({
    restaurantId: 1,
    tableId: 7,
    tableNumber: 3,
  });
}

describe("Waiter attach does not open a Session", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.findActiveSession.mockResolvedValue(null);
    mocks.findSessionByToken.mockResolvedValue(null);
  });

  it("closed table attach binds the table and writes no Session or Check", async () => {
    const attached = await attachClosedTable();

    expect(attached.tableId).toBe(7);
    expect(attached.tableNumber).toBe(3);
    expect(attached.sessionId).toBeNull();
    expect(attached.sessionToken).toBeNull();
    expect(attached.created).toBe(false);
    expect(mocks.insertSession).not.toHaveBeenCalled();
    expect(mocks.insertSessionEvent).not.toHaveBeenCalled();
    expect(mocks.createOpenCheckForSession).not.toHaveBeenCalled();
  });

  it("open table attach reads the existing Session and does not create another", async () => {
    mocks.findActiveSession.mockResolvedValue({
      id: 10,
      restaurantId: 1,
      tableId: 7,
      tableNumber: 3,
      sessionToken: "already-open-token1",
      status: "open",
    });

    const attached = await attachClosedTable();

    expect(attached.sessionId).toBe(10);
    expect(attached.sessionToken).toBe("already-open-token1");
    expect(attached.created).toBe(false);
    expect(mocks.insertSession).not.toHaveBeenCalled();
    expect(mocks.createOpenCheckForSession).not.toHaveBeenCalled();
  });
});

describe("first Waiter Order opens the Session atomically", () => {
  let committed: Rows;
  let failAt: "none" | "orders" | "orderItems" | "outbox" | "commit";
  let nextSessionId: number;

  beforeEach(() => {
    vi.clearAllMocks();
    ENV.tableSessionDualWrite = true;
    committed = emptyRows();
    failAt = "none";
    nextSessionId = 500;

    mocks.findActiveSession.mockResolvedValue(null);
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

  it("attach then successful first Order commits Session, Check, Order, Items, Outbox", async () => {
    const attached = await attachClosedTable();
    expect(attached.sessionId).toBeNull();
    expect(mocks.insertSession).not.toHaveBeenCalled();

    const result = await placeWaiterOrder();

    expect(committed.diningSessions).toHaveLength(1);
    expect(committed.sessionOpenedEvents).toHaveLength(1);
    expect(committed.checks).toHaveLength(1);
    expect(committed.orders).toHaveLength(1);
    expect(committed.orderItems).toHaveLength(1);
    expect(committed.outbox).toHaveLength(1);
    expect(committed.orders[0]).toMatchObject({ sessionId: 500 });
    expect(result.sessionId).toBe(500);
    expect(result.orderId).toBe(55);
  });

  it("leaves no Session when attach is followed by empty-cart Submit", async () => {
    await attachClosedTable();
    await expect(placeWaiterOrder([])).rejects.toThrow();
    expectNothingCommitted();
    expect(mocks.insertSession).not.toHaveBeenCalled();
  });

  it("leaves no Session when pricing/validation fails", async () => {
    await attachClosedTable();
    await expect(
      placeWaiterOrder([{ menuItemId: 999, quantity: 1 }])
    ).rejects.toThrow();
    expectNothingCommitted();
    expect(mocks.insertSession).not.toHaveBeenCalled();
  });

  it("leaves no Session when the Order INSERT fails", async () => {
    failAt = "orders";
    await expect(placeWaiterOrder()).rejects.toThrow();
    expectNothingCommitted();
  });

  it("leaves no Session when the Order Items INSERT fails", async () => {
    failAt = "orderItems";
    await expect(placeWaiterOrder()).rejects.toThrow();
    expectNothingCommitted();
  });

  it("leaves no Session when the OrderCreated Outbox fails", async () => {
    failAt = "outbox";
    await expect(placeWaiterOrder()).rejects.toThrow();
    expectNothingCommitted();
  });

  it("retry after a failed first Submit opens one Session with the successful Order", async () => {
    failAt = "orders";
    await expect(placeWaiterOrder()).rejects.toThrow();
    expectNothingCommitted();

    failAt = "none";
    const result = await placeWaiterOrder();
    expect(committed.diningSessions).toHaveLength(1);
    expect(committed.checks).toHaveLength(1);
    expect(committed.orders).toHaveLength(1);
    expect(result.sessionId).toBe(501);
  });
});

describe("existing open Session is reused by later Waiter Orders", () => {
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
    const result = await placeWaiterOrder();
    expect(mocks.insertSession).not.toHaveBeenCalled();
    expect(mocks.createOpenCheckForSession).not.toHaveBeenCalled();
    expect(committed.diningSessions).toHaveLength(0);
    expect(committed.orders[0]).toMatchObject({ sessionId: 10 });
    expect(result.sessionId).toBe(10);
  });

  it("supports many Waiter Orders on one Session", async () => {
    await placeWaiterOrder();
    await placeWaiterOrder();
    await placeWaiterOrder();
    expect(committed.orders).toHaveLength(3);
    expect(committed.orders.every((row) => row.sessionId === 10)).toBe(true);
    expect(mocks.insertSession).not.toHaveBeenCalled();
  });

  it("leaves the existing Session intact when a later Waiter Order fails", async () => {
    failOrderInsert = true;
    await expect(placeWaiterOrder()).rejects.toThrow();
    expect(mocks.insertSession).not.toHaveBeenCalled();
    expect(committed.orders).toHaveLength(0);
    expect(committed.diningSessions).toHaveLength(0);
    expect(committed.checks).toHaveLength(0);
  });

  it("QR then Waiter share the same open Session", async () => {
    ENV.tableSessionDualWrite = true;
    const qr = await createGuestCaller().order.create({
      restaurantId: 1,
      tableId: 999,
      tableNumber: 3,
      items: [{ menuItemId: 1, quantity: 1 }],
    });
    const waiter = await placeWaiterOrder();
    expect(qr.sessionId).toBe(10);
    expect(waiter.sessionId).toBe(10);
    expect(committed.orders).toHaveLength(2);
    expect(mocks.insertSession).not.toHaveBeenCalled();
  });
});
