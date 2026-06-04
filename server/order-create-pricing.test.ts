import { describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

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
  getRestaurantById: vi.fn(async (id: number) =>
    id === 1
      ? {
          id: 1,
          userId: 10,
          nameAr: "r",
          isActive: true,
          workingHours: null,
          temporaryClosure: null,
          currencySymbol: "ر.س",
        }
      : null
  ),
  restaurantAllowsTableOrdering: vi.fn(async () => true),
  getTableByRestaurantAndNumber: vi.fn(async () => ({ id: 1, tableNumber: 1 })),
  generateOrderNumber: vi.fn(async () => "ORD-TEST"),
  createOrder: vi.fn(async (data: { totalAmount: string }) => ({ id: 99, ...data })),
  createOrderItems: vi.fn(async () => undefined),
  createNotification: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("./restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(async () => undefined),
}));

import { appRouter } from "./routers";
import { createOrder, createOrderItems } from "./db";

describe("order.create authoritative pricing", () => {
  it("persists DB total when client sends a manipulated low price", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await caller.order.create({
      restaurantId: 1,
      tableId: 1,
      tableNumber: 1,
      items: [{ menuItemId: 1, quantity: 2, price: "0.01", nameAr: "fake" }],
    });

    expect(vi.mocked(createOrder).mock.calls[0]?.[0].totalAmount).toBe("20.00");
    expect(vi.mocked(createOrderItems).mock.calls[0]?.[0][0]?.price).toBe("10.00");
    expect(vi.mocked(createOrderItems).mock.calls[0]?.[0][0]?.nameAr).toBe("حمص");
  });
});
