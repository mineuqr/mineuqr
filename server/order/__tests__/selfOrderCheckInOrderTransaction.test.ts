/**
 * SELF-ORDER-CHECK-IN-ORDER-TRANSACTION-HARDENING-1
 *
 * Self-Order Submit commits Check + Order + Items + OrderCreated Outbox
 * in one transaction. sessionId stays null. No Dining Session.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../../_core/context";
import { orderDomainOutbox, orderItems, orders } from "../../../drizzle/schema";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  ensureSessionlessCheckForOrderInTransaction: vi.fn(),
}));

vi.mock("../../orderTrackingToken", () => ({
  generateOrderTrackingToken: vi.fn(() => "tracking-token-kiosk-order"),
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
  getTableByRestaurantAndNumber: vi.fn(async () => undefined),
  generateOrderNumber: vi.fn(async () => "ORD-K-001"),
  createNotification: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("../../operational-session/check/CheckService", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../operational-session/check/CheckService")
  >();
  return {
    ...actual,
    ensureSessionlessCheckForOrderInTransaction:
      mocks.ensureSessionlessCheckForOrderInTransaction,
  };
});

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
  checks: Record<string, unknown>[];
  orders: Record<string, unknown>[];
  orderItems: Record<string, unknown>[];
  outbox: Record<string, unknown>[];
};

function emptyRows(): Rows {
  return {
    diningSessions: [],
    checks: [],
    orders: [],
    orderItems: [],
    outbox: [],
  };
}

function createGuestCaller() {
  return appRouter.createCaller({
    user: null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

function placeSelfOrder(input?: {
  stationId?: string;
  items?: { menuItemId: number; quantity: number }[];
}) {
  return createGuestCaller().order.placeWithIdentity({
    restaurantId: 1,
    serviceMode: "counter",
    fulfilmentAnchor: {
      anchorType: "station",
      stationId: input?.stationId ?? "kiosk-a",
      fulfilmentLabel: input?.stationId ?? "Kiosk A",
    },
    orderingChannel: "kiosk",
    items: input?.items ?? [{ menuItemId: 1, quantity: 1 }],
  });
}

describe("Self-Order Check is atomic with Order persist", () => {
  let committed: Rows;
  let failAt:
    | "none"
    | "orders"
    | "orderItems"
    | "outbox"
    | "check"
    | "commit";
  let nextOrderId: number;
  let nextCheckId: number;

  beforeEach(() => {
    vi.clearAllMocks();
    committed = emptyRows();
    failAt = "none";
    nextOrderId = 70;
    nextCheckId = 900;

    mocks.ensureSessionlessCheckForOrderInTransaction.mockImplementation(
      async (
        input: { restaurantId: number; orderId: number },
        client: { __staged?: Rows }
      ) => {
        if (failAt === "check") throw new Error("check_insert_failed");
        if (client == null) {
          throw new Error("Order transaction client required");
        }
        const id = nextCheckId++;
        client.__staged?.checks.push({
          id,
          restaurantId: input.restaurantId,
          orderId: input.orderId,
          sessionId: null,
        });
        return { id, sessionId: null };
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
                return [{ insertId: nextOrderId++ }];
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
        committed.checks.push(...staged.checks);
        committed.orders.push(...staged.orders);
        committed.orderItems.push(...staged.orderItems);
        committed.outbox.push(...staged.outbox);
        return result;
      },
    });
  });

  function expectNothingCommitted() {
    expect(committed.diningSessions).toHaveLength(0);
    expect(committed.checks).toHaveLength(0);
    expect(committed.orders).toHaveLength(0);
    expect(committed.orderItems).toHaveLength(0);
    expect(committed.outbox).toHaveLength(0);
  }

  it("successful Submit commits Order + Items + Check + OrderCreated Outbox", async () => {
    const result = await placeSelfOrder();

    expect(committed.orders).toHaveLength(1);
    expect(committed.orderItems).toHaveLength(1);
    expect(committed.checks).toHaveLength(1);
    expect(committed.outbox).toHaveLength(1);
    expect(committed.diningSessions).toHaveLength(0);
    expect(committed.orders[0]?.sessionId).toBeUndefined();
    expect(committed.checks[0]).toMatchObject({
      orderId: 70,
      sessionId: null,
    });
    expect(committed.outbox[0]).toMatchObject({ eventType: "OrderCreated" });
    expect(result.sessionPersistence).toBe("ephemeral");
    expect(result.sessionToken).toBeUndefined();
    expect(
      committed.outbox.filter((row) => row.eventType === "OrderCreated")
    ).toHaveLength(1);
  });

  it("Check failure rolls back Order, Items, and Outbox", async () => {
    failAt = "check";
    await expect(placeSelfOrder()).rejects.toThrow("check_insert_failed");
    expectNothingCommitted();
  });

  it("Order INSERT failure rolls back Check", async () => {
    failAt = "orders";
    await expect(placeSelfOrder()).rejects.toThrow("order_insert_failed");
    expectNothingCommitted();
    expect(mocks.ensureSessionlessCheckForOrderInTransaction).not.toHaveBeenCalled();
  });

  it("Order Items failure rolls back Check", async () => {
    failAt = "orderItems";
    await expect(placeSelfOrder()).rejects.toThrow("order_items_insert_failed");
    expectNothingCommitted();
    expect(mocks.ensureSessionlessCheckForOrderInTransaction).not.toHaveBeenCalled();
  });

  it("OrderCreated Outbox failure rolls back Check and Order", async () => {
    failAt = "outbox";
    await expect(placeSelfOrder()).rejects.toThrow("outbox_insert_failed");
    expectNothingCommitted();
    expect(mocks.ensureSessionlessCheckForOrderInTransaction).not.toHaveBeenCalled();
  });

  it("transaction commit failure leaves no Self-Order state", async () => {
    failAt = "commit";
    await expect(placeSelfOrder()).rejects.toThrow("commit_failed");
    expectNothingCommitted();
  });

  it("DB unavailable leaves no Order or Check", async () => {
    mocks.getDb.mockResolvedValue(null);
    await expect(placeSelfOrder()).rejects.toThrow("database_unavailable");
    expectNothingCommitted();
  });

  it("retry after Check failure commits one Order and one Check", async () => {
    failAt = "check";
    await expect(placeSelfOrder()).rejects.toThrow("check_insert_failed");
    expectNothingCommitted();

    failAt = "none";
    const result = await placeSelfOrder();
    expect(committed.orders).toHaveLength(1);
    expect(committed.checks).toHaveLength(1);
    expect(committed.outbox).toHaveLength(1);
    expect(committed.diningSessions).toHaveLength(0);
    expect(result.sessionPersistence).toBe("ephemeral");
    expect(result.sessionToken).toBeUndefined();
  });

  it("multiple Self-Orders create independent Checks and no Dining Session", async () => {
    await placeSelfOrder({ stationId: "kiosk-a" });
    await placeSelfOrder({ stationId: "kiosk-a" });
    await placeSelfOrder({ stationId: "kiosk-b" });

    expect(committed.orders).toHaveLength(3);
    expect(committed.checks).toHaveLength(3);
    expect(committed.outbox).toHaveLength(3);
    expect(committed.diningSessions).toHaveLength(0);
    expect(committed.checks.map((row) => row.orderId)).toEqual([70, 71, 72]);
    expect(committed.checks.every((row) => row.sessionId == null)).toBe(true);
    expect(committed.orders.every((row) => row.sessionId == null)).toBe(true);
    expect(
      committed.outbox.filter((row) => row.eventType === "OrderCreated")
    ).toHaveLength(3);
  });

  it("does not create a Dining Session on Self-Order Submit", async () => {
    await placeSelfOrder();
    expect(committed.diningSessions).toHaveLength(0);
    expect(committed.orders[0]?.sessionId).toBeUndefined();
  });
});
