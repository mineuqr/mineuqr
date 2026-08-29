import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  getOrderById: vi.fn(),
}));

vi.mock("./db", () => ({
  getDb: mocks.getDb,
  getOrderById: mocks.getOrderById,
  getOrderItemsByOrderId: vi.fn(async () => []),
  generateOrderNumber: vi.fn(async () => "ORD-0001"),
  getRestaurantById: vi.fn(async () => ({ id: 1, userId: 1 })),
}));

vi.mock("./customerPush/sendReadyPush", () => ({
  sendReadyPushForOrder: vi.fn(async () => undefined),
}));

// COMMERCIAL-FROZEN-ACCOUNT-STATE-1 fails closed without a database, which would
// reject order.updateStatus before the persistence path under test is reached.
vi.mock("./subscription-runtime", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./subscription-runtime")>();
  return {
    ...actual,
    resolveOwnerEntitlements: vi.fn(async () => ({
      meta: { commercialAccountState: "active" },
    })),
  };
});

vi.mock("./order/eventInfrastructureComposition", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./order/eventInfrastructureComposition")>();
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

import { appRouter } from "./routers";
import { createTransactionalOrderDbFake } from "./order/__tests__/support/transactionalOrderDbFake";

/**
 * TRACKING-EXPIRY-1 readyAt stamping, now proven on the transactional update
 * path. ORDER-LIFECYCLE-ATOMICITY-AND-SESSION-CONSISTENCY-HARDENING-1 removed
 * the non-transactional fallback these assertions previously observed, so the
 * expectations moved to the `UPDATE orders` payloads staged inside the
 * transaction.
 */
describe("order.updateStatus TRACKING-EXPIRY-1", () => {
  const caller = appRouter.createCaller({
    user: {
      id: 1,
      openId: "owner-1",
      role: "user",
      emailVerifiedAt: new Date(),
    } as TrpcContext["user"],
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });

  function existingOrder(overrides: Record<string, unknown>) {
    return {
      id: 7,
      restaurantId: 1,
      tableId: 1,
      tableNumber: 1,
      // LIFECYCLE-SETTLEMENT-GUARDS-1 — table serve stays allowed while unpaid;
      // a sessionless serve would require a settled Check instead.
      sessionId: 900,
      orderNumber: "ORD-1",
      trackingToken: "tok",
      totalAmount: "10.00",
      createdAt: "2026-01-01 00:00:00",
      updatedAt: "2026-01-01 00:00:00",
      lifecycleStage: "active",
      readyAt: null,
      ...overrides,
    };
  }

  function arrange(row: Record<string, unknown>) {
    const dbFake = createTransactionalOrderDbFake({ existingOrderRow: row });
    mocks.getDb.mockImplementation(dbFake.getDb);
    mocks.getOrderById.mockResolvedValue(row);
    return dbFake;
  }

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("marks readyAt on first transition into ready", async () => {
    const dbFake = arrange(existingOrder({ status: "preparing", readyAt: null }));

    await caller.order.updateStatus({ id: 7, status: "ready" });

    expect(dbFake.orderUpdates).toContainEqual(
      expect.objectContaining({ readyAt: expect.any(String) })
    );
    expect(dbFake.orderUpdates).toContainEqual(
      expect.objectContaining({ status: "ready" })
    );
  });

  it("does not mark readyAt when already ready", async () => {
    const dbFake = arrange(
      existingOrder({ status: "ready", readyAt: "2026-01-01 01:00:00" })
    );

    await caller.order.updateStatus({ id: 7, status: "served" });

    expect(
      dbFake.orderUpdates.some((update) => "readyAt" in update)
    ).toBe(false);
    expect(dbFake.orderUpdates).toContainEqual(
      expect.objectContaining({ status: "served" })
    );
  });

  it("commits the status change with its Outbox event in one transaction", async () => {
    const dbFake = arrange(existingOrder({ status: "preparing", readyAt: null }));

    await caller.order.updateStatus({ id: 7, status: "ready" });

    expect(dbFake.orderUpdates.length).toBeGreaterThan(0);
    expect(dbFake.inserted.outbox.length).toBeGreaterThan(0);
  });
});
