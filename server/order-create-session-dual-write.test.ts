import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";
import { OPS_EVENT } from "./_core/opsTaxonomy";
import {
  DiningSessionUnavailableError,
  TABLE_EVENT_TYPES,
} from "./diningSession/sessionTypes";

vi.mock("./orderTrackingToken", () => ({
  generateOrderTrackingToken: vi.fn(() => "test-tracking-token-d3"),
}));

vi.mock("./diningSession/sessionService", () => ({
  resolveSessionForOrderCreate: vi.fn(),
  recordSessionEvent: vi.fn(),
}));

vi.mock("./diningSession/sessionAggregateWriters", () => ({
  incrementSessionAggregatesForOrder: vi.fn(),
}));

vi.mock("./_core/opsLog", () => ({
  opsLog: vi.fn(),
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
    userId: 10,
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
}));

vi.mock("./commercial/guestOrderingAuthority", () => ({
  resolveGuestOrderingAllowed: vi.fn(async () => ({ canOrder: true })),
}));

import { appRouter } from "./routers";
import { createOrder } from "./db";
import { resolveSessionForOrderCreate, recordSessionEvent } from "./diningSession/sessionService";
import { incrementSessionAggregatesForOrder } from "./diningSession/sessionAggregateWriters";
import { opsLog } from "./_core/opsLog";

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

describe("order.create session dual-write TABLE-MANAGEMENT-1 D3", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    ENV.tableSessionDualWrite = false;
    vi.mocked(resolveSessionForOrderCreate).mockResolvedValue({
      session: baseSession,
      created: true,
    });
    vi.mocked(recordSessionEvent).mockResolvedValue({ eventId: 100 });
    vi.mocked(incrementSessionAggregatesForOrder).mockResolvedValue(undefined);
  });

  afterEach(() => {
    ENV.tableSessionDualWrite = false;
  });

  it("flag OFF — no session service calls and no sessionId on order", async () => {
    const caller = createCaller();

    await caller.order.create({
      restaurantId: 1,
      tableId: 999,
      tableNumber: 3,
      items: [{ menuItemId: 1, quantity: 1 }],
    });

    expect(resolveSessionForOrderCreate).not.toHaveBeenCalled();
    expect(recordSessionEvent).not.toHaveBeenCalled();
    expect(incrementSessionAggregatesForOrder).not.toHaveBeenCalled();
    expect(vi.mocked(createOrder).mock.calls[0]?.[0]).not.toHaveProperty("sessionId");
  });

  it("flag OFF — response omits sessionToken", async () => {
    const caller = createCaller();
    const result = await caller.order.create({
      restaurantId: 1,
      tableId: 999,
      tableNumber: 3,
      items: [{ menuItemId: 1, quantity: 1 }],
    });

    expect(result).not.toHaveProperty("sessionToken");
  });

  it("flag ON — new session attaches sessionId (post-commit session via consumer)", async () => {
    ENV.tableSessionDualWrite = true;
    vi.mocked(resolveSessionForOrderCreate).mockResolvedValue({
      session: baseSession,
      created: true,
    });

    const caller = createCaller();
    const result = await caller.order.create({
      restaurantId: 1,
      tableId: 999,
      tableNumber: 3,
      items: [{ menuItemId: 1, quantity: 2 }],
    });

    expect(resolveSessionForOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        tableId: 7,
        tableNumber: 3,
        sessionToken: undefined,
        tableContext: expect.objectContaining({
          restaurant: expect.objectContaining({ id: 1, isActive: true }),
          table: expect.objectContaining({ id: 7, tableNumber: 3 }),
        }),
      })
    );
    expect(vi.mocked(createOrder).mock.calls[0]?.[0]).toMatchObject({
      sessionId: 10,
    });
    expect(recordSessionEvent).not.toHaveBeenCalled();
    expect(incrementSessionAggregatesForOrder).not.toHaveBeenCalled();
    expect(opsLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: OPS_EVENT.session_created })
    );
    expect(result.orderId).toBe(55);
    expect(result.sessionToken).toBe("sess-tok");
  });

  it("flag ON — reuses existing session and logs session_reused", async () => {
    ENV.tableSessionDualWrite = true;
    vi.mocked(resolveSessionForOrderCreate).mockResolvedValue({
      session: baseSession,
      created: false,
    });

    const caller = createCaller();
    await caller.order.create({
      restaurantId: 1,
      tableId: 1,
      tableNumber: 3,
      items: [{ menuItemId: 1, quantity: 1 }],
    });

    expect(opsLog).toHaveBeenCalledWith(
      expect.objectContaining({ type: OPS_EVENT.session_reused })
    );
  });

  it("flag ON — session failure blocks order", async () => {
    ENV.tableSessionDualWrite = true;
    vi.mocked(resolveSessionForOrderCreate).mockRejectedValue(
      new DiningSessionUnavailableError()
    );

    const caller = createCaller();

    await expect(
      caller.order.create({
        restaurantId: 1,
        tableId: 1,
        tableNumber: 3,
        items: [{ menuItemId: 1, quantity: 1 }],
      })
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });

    expect(createOrder).not.toHaveBeenCalled();
  });

  it("flag ON — uses server-resolved table.id not client tableId", async () => {
    ENV.tableSessionDualWrite = true;

    const caller = createCaller();
    await caller.order.create({
      restaurantId: 1,
      tableId: 888,
      tableNumber: 3,
      items: [{ menuItemId: 1, quantity: 1 }],
    });

    expect(resolveSessionForOrderCreate).toHaveBeenCalledWith(
      expect.objectContaining({ tableId: 7 })
    );
    expect(recordSessionEvent).not.toHaveBeenCalled();
    expect(incrementSessionAggregatesForOrder).not.toHaveBeenCalled();
  });
});
