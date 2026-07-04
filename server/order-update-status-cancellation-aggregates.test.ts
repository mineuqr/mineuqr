import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";

vi.mock("./db", () => ({
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(async () => []),
  generateOrderNumber: vi.fn(async () => "ORD-0001"),
  getRestaurantById: vi.fn(async () => ({ id: 1, userId: 1 })),
  updateOrderStatus: vi.fn(async () => undefined),
  markOrderReadyAtIfFirstTransition: vi.fn(async () => undefined),
}));

vi.mock("./customerPush/sendReadyPush", () => ({
  sendReadyPushForOrder: vi.fn(async () => undefined),
}));

vi.mock("./diningSession/sessionAggregateWriters", () => ({
  decrementSessionAggregatesForCancelledOrder: vi.fn(),
}));

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
import { getOrderById, updateOrderStatus } from "./db";
import { decrementSessionAggregatesForCancelledOrder } from "./diningSession/sessionAggregateWriters";

const baseOrder = {
  id: 7,
  restaurantId: 1,
  tableId: 1,
  tableNumber: 2,
  sessionId: 10,
  status: "pending",
  orderNumber: "ORD-1",
  trackingToken: "tok",
  totalAmount: "45.00",
  createdAt: "2026-01-01 00:00:00",
  updatedAt: "2026-01-01 00:00:00",
  readyAt: null,
} as Awaited<ReturnType<typeof getOrderById>>;

function createCaller() {
  return appRouter.createCaller({
    user: {
      id: 1,
      openId: "owner-1",
      role: "user",
      emailVerifiedAt: new Date(),
    } as TrpcContext["user"],
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("order.updateStatus cancellation router ORDER-EVENTS-1B", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ENV.tableSessionDualWrite = true;
    vi.mocked(getOrderById).mockResolvedValue(baseOrder);
  });

  afterEach(() => {
    ENV.tableSessionDualWrite = false;
  });

  it("does not decrement session aggregates inline when cancelling", async () => {
    const caller = createCaller();
    const result = await caller.order.updateStatus({ id: 7, status: "cancelled" });

    expect(updateOrderStatus).toHaveBeenCalledWith(7, "cancelled");
    expect(decrementSessionAggregatesForCancelledOrder).not.toHaveBeenCalled();
    expect(result).toEqual({
      success: true,
      orderId: 7,
      previousStatus: "pending",
      newStatus: "cancelled",
    });
  });
});
