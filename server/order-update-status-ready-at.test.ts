import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./db", () => ({
  getOrderById: vi.fn(),
  getRestaurantById: vi.fn(async () => ({ id: 1, userId: 1 })),
  updateOrderStatus: vi.fn(async () => undefined),
  markOrderReadyAtIfFirstTransition: vi.fn(async () => undefined),
}));

vi.mock("./customerPush/sendReadyPush", () => ({
  sendReadyPushForOrder: vi.fn(async () => undefined),
}));

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
      status: "preparing",
      orderNumber: "ORD-1",
      trackingToken: "tok",
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
      status: "ready",
      orderNumber: "ORD-1",
      trackingToken: "tok",
    } as Awaited<ReturnType<typeof getOrderById>>);

    await caller.order.updateStatus({ id: 7, status: "served" });

    expect(markOrderReadyAtIfFirstTransition).toHaveBeenCalledWith(7, "ready", "served");
    expect(updateOrderStatus).toHaveBeenCalledWith(7, "served");
  });
});
