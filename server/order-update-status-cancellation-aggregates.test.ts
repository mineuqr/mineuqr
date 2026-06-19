import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";
import { OPS_EVENT } from "./_core/opsTaxonomy";

vi.mock("./db", () => ({
  getOrderById: vi.fn(),
  getRestaurantById: vi.fn(async () => ({ id: 1, userId: 1 })),
  updateOrderStatus: vi.fn(async () => undefined),
  markOrderReadyAtIfFirstTransition: vi.fn(async () => undefined),
}));

vi.mock("./customerPush/sendReadyPush", () => ({
  sendReadyPushForOrder: vi.fn(async () => undefined),
}));

vi.mock("./customerPush/routes", () => ({
  cleanupPushSubscriptionsForOrder: vi.fn(async () => undefined),
}));

vi.mock("./diningSession/sessionAggregateWriters", () => ({
  incrementSessionAggregatesForOrder: vi.fn(),
  decrementSessionAggregatesForCancelledOrder: vi.fn(),
}));

vi.mock("./_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

import { appRouter } from "./routers";
import { getOrderById, updateOrderStatus } from "./db";
import { decrementSessionAggregatesForCancelledOrder } from "./diningSession/sessionAggregateWriters";
import { opsLog } from "./_core/opsLog";

const baseOrder = {
  id: 7,
  restaurantId: 1,
  sessionId: 10,
  status: "pending",
  orderNumber: "ORD-1",
  trackingToken: "tok",
  totalAmount: "45.00",
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

describe("order.updateStatus cancellation aggregates SESSION-AGGREGATES-1 Phase A.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ENV.tableSessionDualWrite = true;
    vi.mocked(getOrderById).mockResolvedValue(baseOrder);
    vi.mocked(decrementSessionAggregatesForCancelledOrder).mockResolvedValue(undefined);
  });

  afterEach(() => {
    ENV.tableSessionDualWrite = false;
  });

  it("decrements session aggregates when cancelling an open order", async () => {
    const caller = createCaller();

    const result = await caller.order.updateStatus({ id: 7, status: "cancelled" });

    expect(updateOrderStatus).toHaveBeenCalledWith(7, "cancelled");
    expect(decrementSessionAggregatesForCancelledOrder).toHaveBeenCalledWith(
      {
        restaurantId: 1,
        sessionId: 10,
        orderTotalAmount: "45.00",
      },
      { procedure: "order.updateStatus" }
    );
    expect(result).toEqual({ success: true });
  });

  it("does not decrement when order is already cancelled", async () => {
    vi.mocked(getOrderById).mockResolvedValue({
      ...baseOrder,
      status: "cancelled",
    } as Awaited<ReturnType<typeof getOrderById>>);

    const caller = createCaller();
    await caller.order.updateStatus({ id: 7, status: "cancelled" });

    expect(decrementSessionAggregatesForCancelledOrder).not.toHaveBeenCalled();
  });

  it("skips aggregate write when order has no sessionId", async () => {
    vi.mocked(getOrderById).mockResolvedValue({
      ...baseOrder,
      sessionId: null,
    } as Awaited<ReturnType<typeof getOrderById>>);

    const caller = createCaller();
    await caller.order.updateStatus({ id: 7, status: "cancelled" });

    expect(decrementSessionAggregatesForCancelledOrder).not.toHaveBeenCalled();
  });

  it("skips aggregate write when TABLE_SESSION_DUAL_WRITE is off", async () => {
    ENV.tableSessionDualWrite = false;

    const caller = createCaller();
    await caller.order.updateStatus({ id: 7, status: "cancelled" });

    expect(decrementSessionAggregatesForCancelledOrder).not.toHaveBeenCalled();
  });

  it("still cancels order when aggregate decrement fails", async () => {
    vi.mocked(decrementSessionAggregatesForCancelledOrder).mockRejectedValue(
      new Error("aggregate update failed")
    );

    const caller = createCaller();
    const result = await caller.order.updateStatus({ id: 7, status: "cancelled" });

    expect(updateOrderStatus).toHaveBeenCalledWith(7, "cancelled");
    expect(result).toEqual({ success: true });
    expect(opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: OPS_EVENT.session_aggregate_update_failed,
        procedure: "order.updateStatus",
        metadata: expect.objectContaining({
          sessionId: 10,
          orderId: 7,
          operation: "cancel",
        }),
      })
    );
  });
});
