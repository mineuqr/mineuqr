/**
 * ORDER-CREATE-LEGACY-FALLBACK-OUTBOX-SAFETY-1
 *
 * Order creation is atomic: Order + Order Items + OrderCreated Outbox commit
 * together, or nothing commits. A failed create transaction must fail closed —
 * it must never fall back to a non-transactional insert that commits an Order
 * without its required OrderCreated Outbox event.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Order } from "../../../domain/aggregate/Order";
import { DrizzleOrderRepository } from "../DrizzleOrderRepository";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  requireRestaurantRowForOrderPersist: vi.fn(),
  createOrder: vi.fn(),
  createOrderItems: vi.fn(),
  updateOrderStatus: vi.fn(),
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(),
  markOrderReadyAtIfFirstTransition: vi.fn(),
}));

vi.mock("../../../../db", () => ({
  getDb: mocks.getDb,
  createOrder: mocks.createOrder,
  createOrderItems: mocks.createOrderItems,
  updateOrderStatus: mocks.updateOrderStatus,
  getOrderById: mocks.getOrderById,
  getOrderItemsByOrderId: mocks.getOrderItemsByOrderId,
  markOrderReadyAtIfFirstTransition: mocks.markOrderReadyAtIfFirstTransition,
}));

vi.mock("../../../../db/restaurantRowLock", () => ({
  requireRestaurantRowForOrderPersist: mocks.requireRestaurantRowForOrderPersist,
}));

const WORKING_HOURS = { monday: { open: "09:00", close: "23:00" } };

/** Committed state, only appended when the transaction callback resolves. */
type Committed = {
  orders: Record<string, unknown>[];
  orderItems: Record<string, unknown>[];
  outbox: unknown[];
};

function placeQrOrder() {
  return Order.placeNew({
    restaurantId: 41,
    tableId: 7,
    tableNumber: 4,
    sessionId: 900,
    serviceMode: "dine_in",
    fulfilmentAnchorType: "table",
    fulfilmentLabel: "Table 4",
    customerName: null,
    customerPhone: null,
    notes: null,
    totalAmount: "15.00",
    orderNumber: "ORD-0001",
    trackingToken: "tracking-token-abcdefgh",
    createdAt: "2026-08-29T10:00:00.000Z",
    lines: [
      {
        menuItemId: 1,
        nameAr: "شاي",
        nameEn: "Tea",
        unitPrice: "5.00",
        quantity: 1,
        notes: null,
      },
      {
        menuItemId: 2,
        nameAr: "قهوة",
        nameEn: "Coffee",
        unitPrice: "10.00",
        quantity: 1,
        notes: null,
      },
    ],
  });
}

/** Mirrors the QR `order.create` call shape: no afterPersistInTransaction. */
function qrSaveOptions() {
  return {
    orderingChannel: "qr" as const,
    onPersisted: (persisted: Order) => {
      persisted.recordCreated(persisted.id!);
      return persisted.pullDomainEvents();
    },
  };
}

describe("DrizzleOrderRepository create atomicity", () => {
  let committed: Committed;
  let failAt: "none" | "orders" | "orderItems" | "outbox" | "commit";

  beforeEach(() => {
    committed = { orders: [], orderItems: [], outbox: [] };
    failAt = "none";
    vi.clearAllMocks();

    mocks.requireRestaurantRowForOrderPersist.mockImplementation(async () => ({
      id: 41,
      userId: 9,
      workingHours: WORKING_HOURS,
    }));

    mocks.getDb.mockResolvedValue({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        // Staged writes are discarded unless the callback resolves — this is the
        // rollback semantic under test.
        const staged: Committed = { orders: [], orderItems: [], outbox: [] };
        const tx = {
          insert: (_table: unknown) => ({
            values: async (values: unknown) => {
              if (Array.isArray(values)) {
                if (failAt === "orderItems") throw new Error("order_items_insert_failed");
                staged.orderItems.push(...(values as Record<string, unknown>[]));
                return;
              }
              if (failAt === "orders") throw new Error("order_insert_failed");
              staged.orders.push(values as Record<string, unknown>);
              return [{ insertId: 501 }];
            },
          }),
          update: () => ({
            set: () => ({ where: async () => undefined }),
          }),
          select: () => ({ from: () => ({ where: async () => [] }) }),
          __staged: staged,
        };
        const result = await fn(tx);
        if (failAt === "commit") throw new Error("commit_failed");
        committed.orders.push(...staged.orders);
        committed.orderItems.push(...staged.orderItems);
        committed.outbox.push(...staged.outbox);
        return result;
      },
    });
  });

  const appendInTransaction = vi.fn(async (tx: unknown, messages: unknown[]) => {
    if (failAt === "outbox") throw new Error("outbox_insert_failed");
    (tx as { __staged: Committed }).__staged.outbox.push(...messages);
  });

  function repository() {
    return new DrizzleOrderRepository(
      { appendInTransaction } as never,
      {
        allocateForNewOrder: async () => ({
          businessDay: "2026-08-29",
          dailyDisplayNumber: 3,
          identityScope: "DINE_IN" as const,
        }),
      } as never
    );
  }

  function expectNothingCommitted() {
    expect(committed.orders).toHaveLength(0);
    expect(committed.orderItems).toHaveLength(0);
    expect(committed.outbox).toHaveLength(0);
  }

  it("commits Order + Items + exactly one OrderCreated Outbox on success", async () => {
    const result = await repository().save(placeQrOrder(), qrSaveOptions());

    expect(committed.orders).toHaveLength(1);
    expect(committed.orderItems).toHaveLength(2);
    expect(committed.outbox).toHaveLength(1);
    expect(result.outboxEventIds).toHaveLength(1);
    expect(result.order.id).toBe(501);
    expect(appendInTransaction).toHaveBeenCalledTimes(1);
  });

  it("rolls back everything when the Order INSERT fails", async () => {
    failAt = "orders";

    await expect(repository().save(placeQrOrder(), qrSaveOptions())).rejects.toThrow(
      "order_insert_failed"
    );

    expectNothingCommitted();
    expect(appendInTransaction).not.toHaveBeenCalled();
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("rolls back everything when the Order Items INSERT fails", async () => {
    failAt = "orderItems";

    await expect(repository().save(placeQrOrder(), qrSaveOptions())).rejects.toThrow(
      "order_items_insert_failed"
    );

    expectNothingCommitted();
    expect(appendInTransaction).not.toHaveBeenCalled();
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("rolls back the Order and Items when the Outbox INSERT fails", async () => {
    failAt = "outbox";

    await expect(repository().save(placeQrOrder(), qrSaveOptions())).rejects.toThrow(
      "outbox_insert_failed"
    );

    expectNothingCommitted();
    expect(appendInTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("reports failure and commits nothing when the transaction commit fails", async () => {
    failAt = "commit";

    await expect(repository().save(placeQrOrder(), qrSaveOptions())).rejects.toThrow(
      "commit_failed"
    );

    expectNothingCommitted();
    expect(mocks.createOrder).not.toHaveBeenCalled();
  });

  it("never falls back to a non-transactional Order insert after a failed create", async () => {
    for (const stage of ["orders", "orderItems", "outbox", "commit"] as const) {
      failAt = stage;
      await expect(
        repository().save(placeQrOrder(), qrSaveOptions())
      ).rejects.toBeInstanceOf(Error);
    }

    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.createOrderItems).not.toHaveBeenCalled();
    expectNothingCommitted();
  });

  it("fails closed instead of creating an Order when the database is unavailable", async () => {
    mocks.getDb.mockResolvedValue(null);

    await expect(repository().save(placeQrOrder(), qrSaveOptions())).rejects.toThrow(
      "database_unavailable"
    );

    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.createOrderItems).not.toHaveBeenCalled();
    expectNothingCommitted();
  });

  it("never returns a successful create result with an empty Outbox", async () => {
    for (const stage of ["none", "orders", "orderItems", "outbox", "commit"] as const) {
      failAt = stage;
      const outcome = await repository()
        .save(placeQrOrder(), qrSaveOptions())
        .then((value) => ({ ok: true as const, value }))
        .catch(() => ({ ok: false as const }));

      if (outcome.ok) {
        expect(outcome.value.outboxEventIds.length).toBeGreaterThan(0);
      }
    }
  });
});
