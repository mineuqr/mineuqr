import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "../_core/context";

vi.mock("../restaurantAccess", () => ({
  assertRestaurantAccess: vi.fn(),
}));

vi.mock("./restaurantOverview", () => ({
  getRestaurantOverview: vi.fn(),
}));

vi.mock("./activeTablesBoard", () => ({
  getActiveTablesBoard: vi.fn(),
}));

vi.mock("./actionCenter", () => ({
  getActionCenter: vi.fn(),
}));

vi.mock("./activityFeed", () => ({
  getActivityFeed: vi.fn(),
}));

vi.mock("../analytics/settlementMetrics", () => ({
  getSettlementSummary: vi.fn(),
  getSettlementBreakdown: vi.fn(),
  getSettlementTrend: vi.fn(),
}));

import { assertRestaurantAccess } from "../restaurantAccess";
import { appRouter } from "../routers";
import { getRestaurantOverview } from "./restaurantOverview";
import { getActiveTablesBoard } from "./activeTablesBoard";
import { getActionCenter } from "./actionCenter";
import { getActivityFeed } from "./activityFeed";
import {
  getSettlementBreakdown,
  getSettlementSummary,
  getSettlementTrend,
} from "../analytics/settlementMetrics";
import { TRPCError } from "@trpc/server";

function createVerifiedCaller() {
  return appRouter.createCaller({
    user: {
      id: 1,
      openId: "owner-1",
      role: "user",
      emailVerifiedAt: new Date(),
    } as TrpcContext["user"],
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  });
}

describe("ops.getRestaurantOverview OPS-DASHBOARD-2B.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(getRestaurantOverview).mockResolvedValue({
      activeSessions: 2,
      occupiedTables: 2,
      pendingOrders: 5,
    });
  });

  it("returns overview metrics for authorized restaurant", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.ops.getRestaurantOverview({ restaurantId: 42 });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: 1 }) }),
      42,
      "ops.getRestaurantOverview"
    );
    expect(getRestaurantOverview).toHaveBeenCalledWith(42);
    expect(result).toEqual({
      activeSessions: 2,
      occupiedTables: 2,
      pendingOrders: 5,
    });
  });

  it("coerces numeric string restaurantId", async () => {
    const caller = createVerifiedCaller();
    await caller.ops.getRestaurantOverview({
      restaurantId: "42" as unknown as number,
    });

    expect(getRestaurantOverview).toHaveBeenCalledWith(42);
  });
});

describe("ops.getActiveTablesBoard OPS-DASHBOARD-2C.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(getActiveTablesBoard).mockResolvedValue({
      generatedAt: "2026-06-18T22:00:00.000Z",
      tables: [
        {
          tableId: 1,
          tableName: "Table 1",
          sessionId: "10",
          status: "occupied",
          guestCount: 0,
          durationMinutes: 45,
          totalOrders: 2,
          pendingOrders: 1,
        },
      ],
    });
  });

  it("returns active tables board for authorized restaurant", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.ops.getActiveTablesBoard({ restaurantId: 42 });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: 1 }) }),
      42,
      "ops.getActiveTablesBoard"
    );
    expect(getActiveTablesBoard).toHaveBeenCalledWith(42);
    expect(result.tables).toHaveLength(1);
    expect(result.tables[0]?.sessionId).toBe("10");
  });
});

describe("ops.getActionCenter OPS-DASHBOARD-2D.1", () => {
  const actionCenterPayload = {
    generatedAt: "2026-06-18T22:00:00.000Z",
    longRunningSessions: [
      {
        sessionId: "10",
        tableId: 1,
        tableName: "Table 1",
        durationMinutes: 90,
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(getActionCenter).mockResolvedValue(actionCenterPayload);
  });

  it("returns action center for authorized restaurant", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.ops.getActionCenter({ restaurantId: 42 });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: 1 }) }),
      42,
      "ops.getActionCenter"
    );
    expect(getActionCenter).toHaveBeenCalledWith(42);
    expect(result.longRunningSessions).toHaveLength(1);
  });

  it("denies cross-tenant access before loading action center", async () => {
    vi.mocked(assertRestaurantAccess).mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" })
    );

    const caller = createVerifiedCaller();

    await expect(caller.ops.getActionCenter({ restaurantId: 999 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(getActionCenter).not.toHaveBeenCalled();
  });
});

describe("ops.getActivityFeed OPS-DASHBOARD-2E.1", () => {
  const feedPayload = {
    generatedAt: "2026-06-18T22:00:00.000Z",
    events: [
      {
        eventType: "order_status_changed" as const,
        occurredAt: "2026-06-18 21:30:00",
        sessionId: "10",
        tableId: 1,
        tableName: "Table 1",
        title: "Order status updated",
        subtitle: "#ORD-1 · ready · Table 1",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(getActivityFeed).mockResolvedValue(feedPayload);
  });

  it("returns activity feed for authorized restaurant with default limit", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.ops.getActivityFeed({ restaurantId: 42 });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: 1 }) }),
      42,
      "ops.getActivityFeed"
    );
    expect(getActivityFeed).toHaveBeenCalledWith(42, { limit: 25 });
    expect(result.events).toHaveLength(1);
    expect(result.events[0]?.eventType).toBe("order_status_changed");
  });

  it("passes custom limit to getActivityFeed", async () => {
    const caller = createVerifiedCaller();
    await caller.ops.getActivityFeed({ restaurantId: 42, limit: 10 });

    expect(getActivityFeed).toHaveBeenCalledWith(42, { limit: 10 });
  });

  it("denies cross-tenant access before loading activity feed", async () => {
    vi.mocked(assertRestaurantAccess).mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" })
    );

    const caller = createVerifiedCaller();

    await expect(caller.ops.getActivityFeed({ restaurantId: 999 })).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(getActivityFeed).not.toHaveBeenCalled();
  });
});

describe("ops.getSettlementSummary SETTLEMENT-ARCHITECTURE-1B.2", () => {
  const summaryPayload = {
    generatedAt: "2026-06-18T22:00:00.000Z",
    paidSessionCount: 3,
    complimentarySessionCount: 1,
    totalSettledSessions: 4,
    paidRevenue: "120.00",
    complimentaryTotalAmount: "25.00",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(getSettlementSummary).mockResolvedValue(summaryPayload);
  });

  it("returns settlement summary for authorized restaurant", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.ops.getSettlementSummary({
      restaurantId: 42,
      from: "2026-06-01",
      to: "2026-06-30",
    });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: 1 }) }),
      42,
      "ops.getSettlementSummary"
    );
    expect(getSettlementSummary).toHaveBeenCalledWith({
      restaurantId: 42,
      from: "2026-06-01",
      to: "2026-06-30",
    });
    expect(result).toEqual(summaryPayload);
  });

  it("denies cross-tenant access before loading settlement summary", async () => {
    vi.mocked(assertRestaurantAccess).mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" })
    );

    const caller = createVerifiedCaller();

    await expect(
      caller.ops.getSettlementSummary({ restaurantId: 999 })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(getSettlementSummary).not.toHaveBeenCalled();
  });
});

describe("ops.getSettlementBreakdown SETTLEMENT-ARCHITECTURE-1B.2", () => {
  const breakdownPayload = {
    generatedAt: "2026-06-18T22:00:00.000Z",
    paidRevenue: "120.00",
    items: [
      {
        outcome: "paid" as const,
        sessionCount: 3,
        totalAmount: "120.00",
        revenueContribution: "120.00",
      },
      {
        outcome: "complimentary" as const,
        sessionCount: 1,
        totalAmount: "25.00",
        revenueContribution: "0.00",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(getSettlementBreakdown).mockResolvedValue(breakdownPayload);
  });

  it("returns settlement breakdown for authorized restaurant", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.ops.getSettlementBreakdown({
      restaurantId: 42,
      from: "2026-06-01",
    });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: 1 }) }),
      42,
      "ops.getSettlementBreakdown"
    );
    expect(getSettlementBreakdown).toHaveBeenCalledWith({
      restaurantId: 42,
      from: "2026-06-01",
    });
    expect(result.items).toHaveLength(2);
    expect(result.paidRevenue).toBe("120.00");
  });
});

describe("ops.getSettlementTrend SETTLEMENT-ARCHITECTURE-1B.2", () => {
  const trendPayload = {
    generatedAt: "2026-06-18T22:00:00.000Z",
    grouping: "day" as const,
    points: [
      {
        periodKey: "2026-06-01",
        periodStart: "2026-06-01T00:00:00.000Z",
        paidSessionCount: 2,
        complimentarySessionCount: 0,
        paidRevenue: "80.00",
        complimentaryTotalAmount: "0.00",
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(assertRestaurantAccess).mockResolvedValue(undefined);
    vi.mocked(getSettlementTrend).mockResolvedValue(trendPayload);
  });

  it("returns settlement trend for authorized restaurant", async () => {
    const caller = createVerifiedCaller();
    const result = await caller.ops.getSettlementTrend({
      restaurantId: 42,
      grouping: "day",
      to: "2026-06-30",
    });

    expect(assertRestaurantAccess).toHaveBeenCalledWith(
      expect.objectContaining({ user: expect.objectContaining({ id: 1 }) }),
      42,
      "ops.getSettlementTrend"
    );
    expect(getSettlementTrend).toHaveBeenCalledWith({
      restaurantId: 42,
      grouping: "day",
      to: "2026-06-30",
    });
    expect(result.grouping).toBe("day");
    expect(result.points).toHaveLength(1);
  });

  it("accepts week and month grouping values", async () => {
    const caller = createVerifiedCaller();

    await caller.ops.getSettlementTrend({ restaurantId: 42, grouping: "week" });
    await caller.ops.getSettlementTrend({ restaurantId: 42, grouping: "month" });

    expect(getSettlementTrend).toHaveBeenNthCalledWith(1, {
      restaurantId: 42,
      grouping: "week",
    });
    expect(getSettlementTrend).toHaveBeenNthCalledWith(2, {
      restaurantId: 42,
      grouping: "month",
    });
  });

  it("denies cross-tenant access before loading settlement trend", async () => {
    vi.mocked(assertRestaurantAccess).mockRejectedValue(
      new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" })
    );

    const caller = createVerifiedCaller();

    await expect(
      caller.ops.getSettlementTrend({ restaurantId: 999, grouping: "day" })
    ).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
    expect(getSettlementTrend).not.toHaveBeenCalled();
  });
});
