import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

vi.mock("./orderTrackingToken", () => ({
  generateOrderTrackingToken: vi.fn(() => "test-tracking-token-auto-print"),
}));

const printMocks = vi.hoisted(() => ({
  enqueueAutoPrintJobForOrder: vi.fn(),
}));

vi.mock("./printing/autoPrintOnOrderCreate", () => ({
  enqueueAutoPrintJobForOrder: (...args: unknown[]) =>
    printMocks.enqueueAutoPrintJobForOrder(...args),
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
  generateOrderNumber: vi.fn(async () => "ORD-AUTO-PRINT-001"),
  createOrder: vi.fn(async (data: Record<string, unknown>) => ({ id: 42, ...data })),
  createOrderItems: vi.fn(async () => undefined),
  createNotification: vi.fn(async () => ({ id: 1 })),
}));

vi.mock("./commercial/guestOrderingAuthority", () => ({
  resolveGuestOrderingAllowed: vi.fn(async () => ({ canOrder: true })),
}));

import { appRouter } from "./routers";

describe("order.create auto print THERMAL-PRINTING-3B.3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    printMocks.enqueueAutoPrintJobForOrder.mockResolvedValue(undefined);
  });

  it("enqueues auto print job after order and items persist", async () => {
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

    expect(result).toMatchObject({
      orderId: 42,
      status: "pending",
    });
    expect(printMocks.enqueueAutoPrintJobForOrder).toHaveBeenCalledWith({
      orderId: 42,
      restaurantId: 1,
      procedure: "order.create",
    });
  });
});
