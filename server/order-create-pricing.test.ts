import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));

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
  getTableByRestaurantAndNumber: vi.fn(async () => ({ id: 1, tableNumber: 1 })),
  generateOrderNumber: vi.fn(async () => "ORD-TEST"),
  createOrder: vi.fn(async (data: { totalAmount: string }) => ({ id: 99, ...data })),
  createOrderItems: vi.fn(async () => undefined),
  createNotification: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("./restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(async () => undefined),
}));

vi.mock("./commercial/guestOrderingAuthority", () => ({
  resolveGuestOrderingAllowed: vi.fn(async () => ({ canOrder: true })),
}));

import { appRouter } from "./routers";
import { createOrder, createOrderItems } from "./db";
import { createTransactionalOrderDbFake } from "./order/__tests__/support/transactionalOrderDbFake";

const dbFake = createTransactionalOrderDbFake({ insertId: 99 });

describe("order.create authoritative pricing", () => {
  beforeEach(() => {
    dbFake.reset();
    mocks.getDb.mockImplementation(dbFake.getDb);
  });

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

    expect(dbFake.orderRow()?.totalAmount).toBe("20.00");
    expect(dbFake.inserted.orderItems[0]?.price).toBe("10.00");
    expect(dbFake.inserted.orderItems[0]?.nameAr).toBe("حمص");
    // ORDER-CREATE-LEGACY-FALLBACK-OUTBOX-SAFETY-1 — transaction-only create.
    expect(dbFake.inserted.outbox).toHaveLength(1);
    expect(vi.mocked(createOrder)).not.toHaveBeenCalled();
    expect(vi.mocked(createOrderItems)).not.toHaveBeenCalled();
  });
});
