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

import { appRouter } from "./routers";
import { assertRestaurantAccess } from "./restaurantAccess";
import { findEventsBySessionId, findSessionById } from "./diningSession/sessionRepository";

const baseSession: SelectDiningSession = {
  id: 1,
  restaurantId: 10,
  tableId: 3,
  tableNumber: 5,
  sessionToken: "owner-timeline-token123456",
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

describe("session.getOwnerTimeline UX-1C", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(findSessionById).mockResolvedValue(baseSession);
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
      {
        id: 101,
        restaurantId: 10,
        tableId: 3,
        sessionId: 1,
        orderId: 142,
        eventType: TABLE_EVENT_TYPES.ORDER_CREATED,
        metadata: { orderNumber: "ORD-0142", totalAmount: "95.00", itemCount: 2 },
        createdAt: "2026-06-18 21:43:00",
      },
    ]);
  });

  it("returns session header and chronological V1 events", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.session.getOwnerTimeline({
      restaurantId: 10,
      sessionId: 1,
    });

    expect(assertRestaurantAccess).toHaveBeenCalled();
    expect(result).toEqual({
      sessionId: 1,
      tableNumber: 5,
      status: "open",
      openedAt: "2026-06-18 21:42:00",
      events: [
        {
          id: 100,
          eventType: TABLE_EVENT_TYPES.SESSION_OPENED,
          createdAt: "2026-06-18 21:42:00",
          orderId: null,
          orderNumber: null,
          totalAmount: null,
        },
        {
          id: 101,
          eventType: TABLE_EVENT_TYPES.ORDER_CREATED,
          createdAt: "2026-06-18 21:43:00",
          orderId: 142,
          orderNumber: "ORD-0142",
          totalAmount: "95.00",
        },
      ],
    });
    expect(findEventsBySessionId).toHaveBeenCalledWith(
      10,
      1,
      expect.objectContaining({
        eventTypes: [TABLE_EVENT_TYPES.SESSION_OPENED, TABLE_EVENT_TYPES.ORDER_CREATED],
      })
    );
  });

  it("rejects cross-tenant session lookup", async () => {
    vi.mocked(findSessionById).mockResolvedValue({
      ...baseSession,
      restaurantId: 999,
    });

    const caller = createVerifiedCaller();
    await expect(
      caller.session.getOwnerTimeline({ restaurantId: 10, sessionId: 1 })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
