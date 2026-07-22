import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import type { SelectDiningSession } from "../drizzle/schema";
import { TABLE_EVENT_TYPES } from "./diningSession/sessionTypes";

vi.mock("./restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(),
}));

vi.mock("./diningSession/sessionRepository", () => ({
  findSessionById: vi.fn(),
  findEventsBySessionId: vi.fn(),
}));

vi.mock("./db", () => ({
  generateOrderNumber: vi.fn(async () => "ORD-MOCK-001"),
  getOrdersBySessionId: vi.fn(),
}));

vi.mock("./operational-session/check/CheckService", () => ({
  getCheckById: vi.fn(async () => null),
}));

vi.mock("./operational-session/check/orderSettlementRepository", () => ({
  listOrderSettlementsForCheck: vi.fn(async () => []),
}));

vi.mock("./operational-session/check/api/orderSettlementReadComposition", () => ({
  getOrderSettlementProjectionStore: vi.fn(() => ({})),
}));

vi.mock(
  "./operational-session/check/read/orderSettlementProjectionMaterializer",
  () => ({
    tryMaterializeOrderSettlementProjections: vi.fn(async () => null),
  })
);

import { appRouter } from "./routers";
import { assertRestaurantAccess } from "./restaurantAccess";
import { findEventsBySessionId, findSessionById } from "./diningSession/sessionRepository";
import { getOrdersBySessionId } from "./db";

const baseSession: SelectDiningSession = {
  id: 1,
  restaurantId: 10,
  tableId: 3,
  tableNumber: 5,
  sessionToken: "workspace-token123456789",
  status: "open",
  openGuard: 1,
  openedAt: "2026-06-18 21:42:00",
  settledAt: null,
  settlementOutcome: null,
  closedAt: null,
  totalAmount: null,
  totalOrders: 0,
  createdAt: "2026-06-18 21:42:00",
  updatedAt: "2026-06-18 21:42:00",
};

function createVerifiedCaller() {
  return appRouter.createCaller({
    user: {
      id: 1,
      openId: "user-1",
      role: "user",
      emailVerifiedAt: new Date().toISOString(),
      loginMethod: "local",
    },
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("session.getOwnerWorkspace UX-1B", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(findSessionById).mockResolvedValue(baseSession);
    vi.mocked(getOrdersBySessionId).mockResolvedValue([
      {
        id: 142,
        orderNumber: "ORD-0142",
        businessDay: "2026-06-18",
        dailyDisplayNumber: 2,
        status: "served",
        totalAmount: "70.00",
        createdAt: "2026-06-18 21:43:00",
      },
      {
        id: 143,
        orderNumber: "ORD-0143",
        businessDay: null,
        dailyDisplayNumber: null,
        status: "cancelled",
        totalAmount: "99.00",
        createdAt: "2026-06-18 21:44:00",
      },
      {
        id: 144,
        orderNumber: "ORD-0144",
        businessDay: "2026-06-18",
        dailyDisplayNumber: 3,
        status: "pending",
        totalAmount: "95.00",
        createdAt: "2026-06-18 21:48:00",
      },
    ]);
    vi.mocked(findEventsBySessionId).mockResolvedValue([
      {
        id: 100,
        restaurantId: 10,
        tableId: 3,
        sessionId: 1,
        orderId: null,
        eventType: TABLE_EVENT_TYPES.SESSION_OPENED,
        metadata: { source: "get_or_create", tableNumber: 5 },
        createdAt: "2026-06-18 21:42:00",
      },
    ]);
  });

  it("returns workspace with aggregates and timeline", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.session.getOwnerWorkspace({
      restaurantId: 10,
      sessionId: 1,
    });

    expect(result).toMatchObject({
      sessionId: 1,
      tableNumber: 5,
      status: "open",
      openedAt: "2026-06-18 21:42:00",
      closedAt: null,
      orderCount: 3,
      ordersTotalAmount: "165.00",
      checkId: null,
      aggregateSource: "computed",
    });
    expect(result.orders).toHaveLength(3);
    expect(result.orders[0]?.displayReference).toBe("T #002");
    expect(result.orders[1]?.displayReference).toBe("ORD-0143");
    expect(result.events).toHaveLength(1);
    expect(getOrdersBySessionId).toHaveBeenCalledWith(10, 1);
  });

  it("uses maintained aggregates when session rollups are populated", async () => {
    vi.mocked(findSessionById).mockResolvedValue({
      ...baseSession,
      totalOrders: 2,
      totalAmount: "165.00",
    });

    const caller = createVerifiedCaller();
    const result = await caller.session.getOwnerWorkspace({
      restaurantId: 10,
      sessionId: 1,
    });

    expect(result).toMatchObject({
      orderCount: 2,
      ordersTotalAmount: "165.00",
      aggregateSource: "maintained",
    });
    expect(result.orders).toHaveLength(3);
  });

  it("rejects cross-tenant session lookup", async () => {
    vi.mocked(findSessionById).mockResolvedValue({
      ...baseSession,
      restaurantId: 999,
    });

    const caller = createVerifiedCaller();
    await expect(
      caller.session.getOwnerWorkspace({ restaurantId: 10, sessionId: 1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("session.getOwnerTimeline UX-1C unchanged", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(findSessionById).mockResolvedValue(baseSession);
    vi.mocked(findEventsBySessionId).mockResolvedValue([]);
  });

  it("still returns timeline-only payload without orders", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.session.getOwnerTimeline({
      restaurantId: 10,
      sessionId: 1,
    });

    expect(result).toMatchObject({
      sessionId: 1,
      tableNumber: 5,
      events: [],
    });
    expect(result).not.toHaveProperty("orders");
    expect(getOrdersBySessionId).not.toHaveBeenCalled();
  });
});
