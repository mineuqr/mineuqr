import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";
import { DiningSessionExpiredError } from "./diningSession/sessionTypes";

const mocks = vi.hoisted(() => ({ getDb: vi.fn() }));

vi.mock("./orderTrackingToken", () => ({
  generateOrderTrackingToken: vi.fn(() => "test-tracking-token-1f"),
}));

vi.mock("./diningSession/sessionService", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./diningSession/sessionService")>();
  return {
    ...actual,
    resolveSessionForOrderCreate: vi.fn(actual.resolveSessionForOrderCreate),
  };
});

vi.mock("./diningSession/sessionAggregateWriters", () => ({
  incrementSessionAggregatesForOrder: vi.fn(),
}));

vi.mock("./_core/opsLog", () => ({
  opsLog: vi.fn(),
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
  getTableByRestaurantAndNumber: vi.fn(async () => ({ id: 7, tableNumber: 3 })),
  generateOrderNumber: vi.fn(async () => "ORD-1F-001"),
  createOrder: vi.fn(async (data: Record<string, unknown>) => ({ id: 55, ...data })),
  createOrderItems: vi.fn(async () => undefined),
  createNotification: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("./commercial/guestOrderingAuthority", () => ({
  resolveGuestOrderingAllowed: vi.fn(async () => ({ canOrder: true })),
}));

import { appRouter } from "./routers";
import { createOrder } from "./db";
import { createTransactionalOrderDbFake } from "./order/__tests__/support/transactionalOrderDbFake";
import { resolveSessionForOrderCreate } from "./diningSession/sessionService";

const dbFake = createTransactionalOrderDbFake({ insertId: 55 });

function createCaller() {
  return appRouter.createCaller({
    user: null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("order.create expired session CUSTOMER-SESSION-LIFECYCLE-1F", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbFake.reset();
    mocks.getDb.mockImplementation(dbFake.getDb);
    ENV.tableSessionDualWrite = true;
  });

  afterEach(() => {
    ENV.tableSessionDualWrite = false;
  });

  it("rejects order when resolveSessionForOrderCreate throws DiningSessionExpiredError", async () => {
    vi.mocked(resolveSessionForOrderCreate).mockRejectedValue(
      new DiningSessionExpiredError()
    );

    const caller = createCaller();

    await expect(
      caller.order.create({
        restaurantId: 1,
        tableId: 7,
        tableNumber: 3,
        sessionToken: "closed-token123456789",
        items: [{ menuItemId: 1, quantity: 1 }],
      })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
      message: "انتهت جلسة الطاولة",
    });

    expect(dbFake.inserted.orders).toHaveLength(0);
    expect(dbFake.inserted.outbox).toHaveLength(0);
    expect(createOrder).not.toHaveBeenCalled();
  });

  it("passes sessionToken to resolveSessionForOrderCreate", async () => {
    vi.mocked(resolveSessionForOrderCreate).mockResolvedValue({
      session: {
        id: 10,
        restaurantId: 1,
        tableId: 7,
        tableNumber: 3,
        sessionToken: "open-token1234567890",
        status: "open",
        openGuard: 1,
        openedAt: "2026-06-18 12:00:00",
        settledAt: null,
        settlementOutcome: null,
        closedAt: null,
        totalAmount: null,
        totalOrders: 0,
        createdAt: "2026-06-18 12:00:00",
        updatedAt: "2026-06-18 12:00:00",
      },
      created: false,
    });

    const caller = createCaller();
    await caller.order.create({
      restaurantId: 1,
      tableId: 7,
      tableNumber: 3,
      sessionToken: "open-token1234567890",
      items: [{ menuItemId: 1, quantity: 1 }],
    });

    expect(resolveSessionForOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        tableId: 7,
        tableNumber: 3,
        sessionToken: "open-token1234567890",
        tableContext: expect.objectContaining({
          table: expect.objectContaining({ id: 7, tableNumber: 3 }),
        }),
      })
    );
  });
});
