/**
 * ORDER-UPDATE-LEGACY-FALLBACK-OUTBOX-SAFETY-1
 *
 * A supported Order status update is atomic: the Order row change and its
 * required OrderStatusChanged Outbox commit together, or nothing commits.
 * After a failed update transaction the repository must fail closed — it must
 * never fall back to a non-transactional status write that commits a change
 * without its required event.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { Order } from "../../../domain/aggregate/Order";
import type { OrderActor } from "../../../domain/value-objects/OrderActor";
import { DrizzleOrderRepository } from "../DrizzleOrderRepository";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  updateOrderStatus: vi.fn(),
  markOrderReadyAtIfFirstTransition: vi.fn(),
  sleepMs: vi.fn(async () => undefined),
}));

vi.mock("../../../../db", () => ({
  getDb: mocks.getDb,
  updateOrderStatus: mocks.updateOrderStatus,
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(),
  markOrderReadyAtIfFirstTransition: mocks.markOrderReadyAtIfFirstTransition,
}));

vi.mock("../../../business-identity/config/businessIdentityRetryPolicy", async (importOriginal) => {
  const actual = await importOriginal<
    typeof import("../../../business-identity/config/businessIdentityRetryPolicy")
  >();
  return {
    ...actual,
    sleepMs: mocks.sleepMs,
  };
});

type Committed = {
  statusUpdates: Record<string, unknown>[];
  outbox: unknown[];
};

const ownerActor: OrderActor = {
  kind: "user",
  userId: 9,
  dashboardRole: "owner",
  displayName: "Owner",
  restaurantId: 41,
};

function persistedPending() {
  return Order.reconstitute({
    id: 77,
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
    updatedAt: "2026-08-29 10:00:00",
    status: "pending",
    lifecycleStage: "active",
    readyAt: null,
    lines: [
      {
        menuItemId: 1,
        nameAr: "شاي",
        nameEn: "Tea",
        unitPrice: "15.00",
        quantity: 1,
        notes: null,
      },
    ],
  });
}

function currentRow() {
  return {
    id: 77,
    restaurantId: 41,
    status: "pending",
    lifecycleStage: "active",
    readyAt: null,
    updatedAt: "2026-08-29 10:00:00",
  };
}

/** Mirrors AdvanceOrderStatusService: drain events, then persist them. */
function statusSaveOptions(order: Order) {
  order.advanceStatus("preparing", ownerActor, "2026-08-29 10:05:00");
  return {
    expectedUpdatedAt: "2026-08-29 10:00:00",
    domainEvents: order.pullDomainEvents(),
  };
}

function deadlockError() {
  return Object.assign(new Error("deadlock"), { errno: 1213 });
}

describe("DrizzleOrderRepository update atomicity", () => {
  let committed: Committed;
  let failAt: "none" | "orderUpdate" | "outbox" | "commit";
  let transactionFailuresRemaining: number;

  beforeEach(() => {
    committed = { statusUpdates: [], outbox: [] };
    failAt = "none";
    transactionFailuresRemaining = 0;
    vi.clearAllMocks();

    mocks.getDb.mockResolvedValue({
      transaction: async (fn: (tx: unknown) => Promise<unknown>) => {
        if (transactionFailuresRemaining > 0) {
          transactionFailuresRemaining -= 1;
          throw deadlockError();
        }
        const staged: Committed = { statusUpdates: [], outbox: [] };
        const tx = {
          select: () => ({
            from: () => ({
              where: async () => [currentRow()],
            }),
          }),
          update: () => ({
            set: (values: Record<string, unknown>) => ({
              where: async () => {
                if (values.status != null) {
                  if (failAt === "orderUpdate") {
                    throw new Error("order_update_failed");
                  }
                  staged.statusUpdates.push(values);
                }
              },
            }),
          }),
          __staged: staged,
        };
        const result = await fn(tx);
        if (failAt === "commit") throw new Error("commit_failed");
        committed.statusUpdates.push(...staged.statusUpdates);
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
    return new DrizzleOrderRepository({ appendInTransaction } as never);
  }

  function expectNothingCommitted() {
    expect(committed.statusUpdates).toHaveLength(0);
    expect(committed.outbox).toHaveLength(0);
  }

  it("commits the status change and exactly one OrderStatusChanged Outbox", async () => {
    const order = persistedPending();
    const result = await repository().save(order, statusSaveOptions(order));

    expect(committed.statusUpdates).toHaveLength(1);
    expect(committed.statusUpdates[0]).toMatchObject({
      status: "preparing",
      lifecycleStage: "active",
    });
    expect(committed.outbox).toHaveLength(1);
    expect(result.outboxEventIds).toHaveLength(1);
    expect(result.order.status).toBe("preparing");
    expect(appendInTransaction).toHaveBeenCalledTimes(1);

    const message = committed.outbox[0] as {
      envelope: { eventType: string };
    };
    expect(message.envelope.eventType).toBe("OrderStatusChanged");
  });

  it("rolls back everything when the Order status UPDATE fails", async () => {
    failAt = "orderUpdate";
    const order = persistedPending();

    await expect(repository().save(order, statusSaveOptions(order))).rejects.toThrow(
      "order_update_failed"
    );

    expectNothingCommitted();
    expect(appendInTransaction).not.toHaveBeenCalled();
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("rolls back the status change when the OrderStatusChanged Outbox fails", async () => {
    failAt = "outbox";
    const order = persistedPending();

    await expect(repository().save(order, statusSaveOptions(order))).rejects.toThrow(
      "outbox_insert_failed"
    );

    expectNothingCommitted();
    expect(appendInTransaction).toHaveBeenCalledTimes(1);
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("reports failure and commits nothing when the transaction commit fails", async () => {
    failAt = "commit";
    const order = persistedPending();

    await expect(repository().save(order, statusSaveOptions(order))).rejects.toThrow(
      "commit_failed"
    );

    expectNothingCommitted();
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("fails closed when the database is unavailable", async () => {
    mocks.getDb.mockResolvedValue(null);
    const order = persistedPending();

    await expect(repository().save(order, statusSaveOptions(order))).rejects.toThrow(
      "database_unavailable"
    );

    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
    expectNothingCommitted();
  });

  it("retries a retryable deadlock and then commits status + event once", async () => {
    transactionFailuresRemaining = 2;
    const order = persistedPending();
    const result = await repository().save(order, statusSaveOptions(order));

    expect(committed.statusUpdates).toHaveLength(1);
    expect(committed.outbox).toHaveLength(1);
    expect(result.outboxEventIds).toHaveLength(1);
    expect(mocks.sleepMs).toHaveBeenCalledTimes(2);
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
  });

  it("fails closed after retryable failures exhaust the retry budget", async () => {
    transactionFailuresRemaining = 99;
    const order = persistedPending();

    await expect(repository().save(order, statusSaveOptions(order))).rejects.toMatchObject({
      errno: 1213,
    });

    expectNothingCommitted();
    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
    expect(mocks.sleepMs).toHaveBeenCalledTimes(4);
  });

  it("never falls back to a non-transactional status write after a failed update", async () => {
    for (const stage of ["orderUpdate", "outbox", "commit"] as const) {
      failAt = stage;
      const order = persistedPending();
      await expect(
        repository().save(order, statusSaveOptions(order))
      ).rejects.toBeInstanceOf(Error);
    }

    expect(mocks.updateOrderStatus).not.toHaveBeenCalled();
    expect(mocks.markOrderReadyAtIfFirstTransition).not.toHaveBeenCalled();
    expectNothingCommitted();
  });

  it("never returns a successful status update with an empty required Outbox", async () => {
    for (const stage of ["none", "orderUpdate", "outbox", "commit"] as const) {
      failAt = stage;
      const order = persistedPending();
      const outcome = await repository()
        .save(order, statusSaveOptions(order))
        .then((value) => ({ ok: true as const, value }))
        .catch(() => ({ ok: false as const }));

      if (outcome.ok) {
        expect(outcome.value.outboxEventIds.length).toBeGreaterThan(0);
      }
    }
  });
});
