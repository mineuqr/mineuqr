import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createOrder: vi.fn(async (data: Record<string, unknown>) => ({ id: 42, ...data })),
  createOrderItems: vi.fn(async () => undefined),
}));

vi.mock("./orderTrackingToken", () => ({
  generateOrderTrackingToken: vi.fn(() => "test-tracking-token-abc"),
}));

vi.mock("./db", () => ({
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
  getTableByRestaurantAndNumber: vi.fn(async () => ({ id: 1, tableNumber: 3 })),
  generateOrderNumber: vi.fn(async () => "ORD-0007"),
  createOrder: mocks.createOrder,
  createOrderItems: mocks.createOrderItems,
  createNotification: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("./commercial/guestOrderingAuthority", () => ({
  resolveGuestOrderingAllowed: vi.fn(async () => ({ canOrder: true })),
}));

import { appRouter } from "./routers";
import { createTransactionalOrderDbFake } from "./order/__tests__/support/transactionalOrderDbFake";

const dbFake = createTransactionalOrderDbFake({ insertId: 42 });

describe("order.create tracking token PR-CUX-1A", () => {
  beforeEach(() => {
    dbFake.reset();
    mocks.getDb.mockImplementation(dbFake.getDb);
  });

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

    expect(dbFake.orderRow()).toMatchObject({
      trackingToken: "test-tracking-token-abc",
      orderNumber: "ORD-0007",
    });
    // ORDER-CREATE-LEGACY-FALLBACK-OUTBOX-SAFETY-1 — Order + Items + Outbox
    // commit in one transaction; the non-transactional path is gone.
    expect(dbFake.inserted.orderItems).toHaveLength(1);
    expect(dbFake.inserted.outbox).toHaveLength(1);
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.createOrderItems).not.toHaveBeenCalled();
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
