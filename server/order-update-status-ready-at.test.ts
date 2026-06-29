import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

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
import {
  getOrderById,
  markOrderReadyAtIfFirstTransition,
  updateOrderStatus,
} from "./db";

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

  it("marks readyAt on first transition into ready", async () => {
    vi.mocked(getOrderById).mockResolvedValue({
      id: 7,
      restaurantId: 1,
      tableId: 1,
      tableNumber: 1,
      status: "preparing",
      orderNumber: "ORD-1",
      trackingToken: "tok",
      totalAmount: "10.00",
      createdAt: "2026-01-01 00:00:00",
      updatedAt: "2026-01-01 00:00:00",
      readyAt: null,
    } as Awaited<ReturnType<typeof getOrderById>>);

    await caller.order.updateStatus({ id: 7, status: "ready" });

    expect(markOrderReadyAtIfFirstTransition).toHaveBeenCalledWith(
      7,
      "preparing",
      "ready"
    );
    expect(updateOrderStatus).toHaveBeenCalledWith(7, "ready");
  });

  it("does not mark readyAt when already ready", async () => {
    vi.mocked(getOrderById).mockResolvedValue({
      id: 7,
      restaurantId: 1,
      tableId: 1,
      tableNumber: 1,
      status: "ready",
      orderNumber: "ORD-1",
      trackingToken: "tok",
      totalAmount: "10.00",
      createdAt: "2026-01-01 00:00:00",
      updatedAt: "2026-01-01 00:00:00",
      readyAt: "2026-01-01 01:00:00",
    } as Awaited<ReturnType<typeof getOrderById>>);

    await caller.order.updateStatus({ id: 7, status: "served" });

    expect(markOrderReadyAtIfFirstTransition).toHaveBeenCalledWith(7, "ready", "served");
    expect(updateOrderStatus).toHaveBeenCalledWith(7, "served");
  });
});
