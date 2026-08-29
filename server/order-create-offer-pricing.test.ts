import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const OFFER_CART_ID = 1_000_000_000 + 55;

const mocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  createOrder: vi.fn(async (data: Record<string, unknown>) => ({ id: 88, ...data })),
  createOrderItems: vi.fn(async () => undefined),
}));

vi.mock("./db", () => ({
  getDb: mocks.getDb,
  getMenuItemById: vi.fn(),
  getOfferById: vi.fn(async (id: number) =>
    id === 55
      ? {
          id: 55,
          restaurantId: 1,
          titleAr: "عرض خاص",
          titleEn: "Special",
          offerType: "daily",
          originalPrice: "50.00",
          offerPrice: "35.00",
          isActive: true,
          startDate: "2020-01-01T00:00:00.000Z",
          endDate: "2099-01-01T00:00:00.000Z",
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
  getTableByRestaurantAndNumber: vi.fn(async () => ({ id: 1, tableNumber: 1 })),
  generateOrderNumber: vi.fn(async () => "ORD-OFFER"),
  createOrder: mocks.createOrder,
  createOrderItems: mocks.createOrderItems,
  createNotification: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("./orderTrackingToken", () => ({
  generateOrderTrackingToken: vi.fn(() => "offer-track-token"),
}));

vi.mock("./commercial/guestOrderingAuthority", () => ({
  resolveGuestOrderingAllowed: vi.fn(async () => ({ canOrder: true })),
}));

import { appRouter } from "./routers";
import { createTransactionalOrderDbFake } from "./order/__tests__/support/transactionalOrderDbFake";

const dbFake = createTransactionalOrderDbFake({ insertId: 88 });

describe("order.create offer lines PR-CUX-1B-POLISH-3", () => {
  beforeEach(() => {
    dbFake.reset();
    mocks.getDb.mockImplementation(dbFake.getDb);
  });

  it("resolves active offer price from DB via synthetic cart id", async () => {
    const caller = appRouter.createCaller({
      user: null,
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await caller.order.create({
      restaurantId: 1,
      tableId: 1,
      tableNumber: 1,
      items: [{ menuItemId: OFFER_CART_ID, quantity: 2 }],
    });

    expect(dbFake.inserted.orderItems[0]).toMatchObject({
      menuItemId: 0,
      nameAr: "عرض خاص",
      price: "35.00",
      quantity: 2,
    });
    // ORDER-CREATE-LEGACY-FALLBACK-OUTBOX-SAFETY-1 — transaction-only create.
    expect(dbFake.inserted.outbox).toHaveLength(1);
    expect(mocks.createOrder).not.toHaveBeenCalled();
    expect(mocks.createOrderItems).not.toHaveBeenCalled();
  });
});
