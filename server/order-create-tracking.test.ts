import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./orderTrackingToken", () => ({
  generateOrderTrackingToken: vi.fn(() => "test-tracking-token-abc"),
}));

vi.mock("./db", () => ({
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
  getTableByRestaurantAndNumber: vi.fn(async () => ({ id: 1, tableNumber: 3 })),
  generateOrderNumber: vi.fn(async () => "ORD-0007"),
  createOrder: vi.fn(async (data: Record<string, unknown>) => ({ id: 42, ...data })),
  createOrderItems: vi.fn(async () => undefined),
  createNotification: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("./commercial/guestOrderingAuthority", () => ({
  resolveGuestOrderingAllowed: vi.fn(async () => ({ canOrder: true })),
}));

import { appRouter } from "./routers";
import { createOrder } from "./db";

describe("order.create tracking token PR-CUX-1A", () => {
  it("persists trackingToken and returns confirmation payload", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    const result = await caller.order.create({
      restaurantId: 1,
      tableId: 1,
      tableNumber: 3,
      items: [{ menuItemId: 1, quantity: 2 }],
    });

    expect(vi.mocked(createOrder).mock.calls[0]?.[0]).toMatchObject({
      trackingToken: "test-tracking-token-abc",
      orderNumber: "ORD-0007",
    });
    expect(result).toMatchObject({
      orderId: 42,
      orderNumber: "ORD-0007",
      trackingToken: "test-tracking-token-abc",
      tableNumber: 3,
      totalAmount: "20.00",
      itemCount: 2,
      status: "pending",
    });
    expect(result.createdAt).toBeTruthy();
  });
});
