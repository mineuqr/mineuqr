import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";

vi.mock("./orderTrackingToken", () => ({
  generateOrderTrackingToken: vi.fn(() => "test-tracking-token-d3"),
}));

vi.mock("./diningSession/sessionService", () => ({
  resolveSessionForOrderCreate: vi.fn(),
  recordSessionEvent: vi.fn(),
}));

vi.mock("./diningSession/sessionAggregateWriters", () => ({
  incrementSessionAggregatesForOrder: vi.fn(),
  decrementSessionAggregatesForCancelledOrder: vi.fn(),
}));

vi.mock("./customerPush/sendReadyPush", () => ({
  sendReadyPushForOrder: vi.fn(),
}));

vi.mock("./customerPush/routes", () => ({
  cleanupPushSubscriptionsForOrder: vi.fn(),
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
    userId: 1,
    nameAr: "r",
    isActive: true,
    workingHours: null,
    temporaryClosure: null,
    currencySymbol: "ر.س",
  })),
  getTableByRestaurantAndNumber: vi.fn(async () => ({ id: 7, tableNumber: 3 })),
  generateOrderNumber: vi.fn(async () => "ORD-D3-001"),
  createOrder: vi.fn(async (data: Record<string, unknown>) => ({ id: 55, ...data })),
  createOrderItems: vi.fn(async () => undefined),
  createNotification: vi.fn(async () => ({ id: 1 })),
  getOrderById: vi.fn(),
  getOrderItemsByOrderId: vi.fn(async () => []),
  updateOrderStatus: vi.fn(async () => undefined),
  markOrderReadyAtIfFirstTransition: vi.fn(async () => undefined),
}));

vi.mock("./commercial/guestOrderingAuthority", () => ({
  resolveGuestOrderingAllowed: vi.fn(async () => ({ canOrder: true })),
}));

import { appRouter } from "./routers";
import { createNotification } from "./db";
import { resolveSessionForOrderCreate, recordSessionEvent } from "./diningSession/sessionService";
import { incrementSessionAggregatesForOrder } from "./diningSession/sessionAggregateWriters";
import { sendReadyPushForOrder } from "./customerPush/sendReadyPush";
import { cleanupPushSubscriptionsForOrder } from "./customerPush/routes";
import { decrementSessionAggregatesForCancelledOrder } from "./diningSession/sessionAggregateWriters";

const baseSession = {
  id: 10,
  restaurantId: 1,
  tableId: 7,
  tableNumber: 3,
  sessionToken: "sess-tok",
  status: "open" as const,
  openGuard: 1,
  openedAt: "2026-06-18 12:00:00",
  settledAt: null,
  settlementOutcome: null,
  closedAt: null,
  totalAmount: null,
  totalOrders: 0,
  createdAt: "2026-06-18 12:00:00",
  updatedAt: "2026-06-18 12:00:00",
};

function createCaller() {
  return appRouter.createCaller({
    user: null,
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("order router cleanup ORDER-EVENTS-1B", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ENV.tableSessionDualWrite = true;
    vi.mocked(resolveSessionForOrderCreate).mockResolvedValue({
      session: baseSession,
      created: true,
    });
  });

  afterEach(() => {
    ENV.tableSessionDualWrite = false;
  });

  it("order.create does not invoke operational side-effects inline", async () => {
    const caller = createCaller();
    await caller.order.create({
      restaurantId: 1,
      tableId: 999,
      tableNumber: 3,
      items: [{ menuItemId: 1, quantity: 2 }],
    });

    expect(recordSessionEvent).not.toHaveBeenCalled();
    expect(incrementSessionAggregatesForOrder).not.toHaveBeenCalled();
    expect(createNotification).not.toHaveBeenCalled();
  });

  it("order.updateStatus does not invoke push or session aggregate side-effects inline", async () => {
    const { getOrderById } = await import("./db");
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
      sessionId: 10,
    } as Awaited<ReturnType<typeof getOrderById>>);

    const ownerCaller = appRouter.createCaller({
      user: {
        id: 1,
        openId: "owner-1",
        role: "user",
        emailVerifiedAt: new Date(),
      } as TrpcContext["user"],
      req: { headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    });

    await ownerCaller.order.updateStatus({ id: 7, status: "ready" });

    expect(sendReadyPushForOrder).not.toHaveBeenCalled();
    expect(cleanupPushSubscriptionsForOrder).not.toHaveBeenCalled();
    expect(decrementSessionAggregatesForCancelledOrder).not.toHaveBeenCalled();
  });
});
