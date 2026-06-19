import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
  getActiveOrdersCount: vi.fn(),
}));

vi.mock("../db", () => ({
  getDb: (...args: unknown[]) => dbMocks.getDb(...args),
  getActiveOrdersCount: (...args: unknown[]) =>
    dbMocks.getActiveOrdersCount(...args),
}));

import {
  getRestaurantOverview,
  resolveActiveSessionOverviewMetrics,
} from "./restaurantOverview";

describe("restaurantOverview OPS-DASHBOARD-2B.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.where.mockResolvedValue([
      { activeSessions: 4, occupiedTables: 3, billRequests: 1 },
    ]);
    dbMocks.from.mockReturnValue({ where: dbMocks.where });
    dbMocks.select.mockReturnValue({ from: dbMocks.from });
    dbMocks.getDb.mockResolvedValue({ select: dbMocks.select });
    dbMocks.getActiveOrdersCount.mockResolvedValue(7);
  });

  it("resolves session metrics from dining_sessions active rows", async () => {
    const result = await resolveActiveSessionOverviewMetrics(10);

    expect(result).toEqual({
      activeSessions: 4,
      occupiedTables: 3,
      billRequests: 1,
    });
    expect(dbMocks.select).toHaveBeenCalled();
    expect(dbMocks.from).toHaveBeenCalled();
    expect(dbMocks.where).toHaveBeenCalled();
  });

  it("returns zeros when database is unavailable", async () => {
    dbMocks.getDb.mockResolvedValue(null);

    const result = await resolveActiveSessionOverviewMetrics(10);

    expect(result).toEqual({
      activeSessions: 0,
      occupiedTables: 0,
      billRequests: 0,
    });
  });

  it("combines session metrics with pending order count", async () => {
    const result = await getRestaurantOverview(10);

    expect(result).toEqual({
      activeSessions: 4,
      occupiedTables: 3,
      pendingOrders: 7,
      billRequests: 1,
    });
    expect(dbMocks.getActiveOrdersCount).toHaveBeenCalledWith(10);
  });
});
