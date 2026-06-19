import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  tableSelect: vi.fn(),
  tableFrom: vi.fn(),
  tableLeftJoin: vi.fn(),
  tableWhere: vi.fn(),
  tableOrderBy: vi.fn(),
  tableLimit: vi.fn(),
  orderSelect: vi.fn(),
  orderFrom: vi.fn(),
  orderLeftJoin: vi.fn(),
  orderWhere: vi.fn(),
  orderOrderBy: vi.fn(),
  orderLimit: vi.fn(),
}));

vi.mock("../db", () => ({
  getDb: (...args: unknown[]) => dbMocks.getDb(...args),
}));

import { TABLE_EVENT_TYPES } from "../diningSession/sessionTypes";
import { getActivityFeed } from "./activityFeed";

describe("getActivityFeed integration OPS-DASHBOARD-2E.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    dbMocks.tableLimit.mockResolvedValue([
      {
        eventType: TABLE_EVENT_TYPES.SESSION_OPENED,
        occurredAt: "2026-06-18 20:00:00",
        sessionId: 10,
        tableId: 1,
        tableNumber: 1,
        nameAr: null,
        nameEn: "Table 1",
        metadata: {},
      },
      {
        eventType: TABLE_EVENT_TYPES.ORDER_CREATED,
        occurredAt: "2026-06-18 21:00:00",
        sessionId: 10,
        tableId: 1,
        tableNumber: 1,
        nameAr: null,
        nameEn: "Table 1",
        metadata: { orderNumber: "ORD-1" },
      },
    ]);
    dbMocks.tableOrderBy.mockReturnValue({ limit: dbMocks.tableLimit });
    dbMocks.tableWhere.mockReturnValue({ orderBy: dbMocks.tableOrderBy });
    dbMocks.tableLeftJoin.mockReturnValue({ where: dbMocks.tableWhere });
    dbMocks.tableFrom.mockReturnValue({ leftJoin: dbMocks.tableLeftJoin });
    dbMocks.tableSelect.mockReturnValue({ from: dbMocks.tableFrom });

    dbMocks.orderLimit.mockResolvedValue([
      {
        occurredAt: "2026-06-18 21:30:00",
        sessionId: 10,
        tableId: 1,
        tableNumber: 1,
        nameAr: null,
        nameEn: "Table 1",
        orderNumber: "ORD-1",
        status: "ready",
      },
    ]);
    dbMocks.orderOrderBy.mockReturnValue({ limit: dbMocks.orderLimit });
    dbMocks.orderWhere.mockReturnValue({ orderBy: dbMocks.orderOrderBy });
    dbMocks.orderLeftJoin.mockReturnValue({ where: dbMocks.orderWhere });
    dbMocks.orderFrom.mockReturnValue({ leftJoin: dbMocks.orderLeftJoin });
    dbMocks.orderSelect.mockReturnValue({ from: dbMocks.orderFrom });

    dbMocks.getDb.mockResolvedValue({
      select: vi
        .fn()
        .mockImplementationOnce(() => dbMocks.tableSelect())
        .mockImplementationOnce(() => dbMocks.orderSelect()),
    });
  });

  it("merges two parallel queries, sorts DESC, and applies limit", async () => {
    const fixedNow = new Date("2026-06-18T22:00:00.000Z");
    const result = await getActivityFeed(5, { limit: 2, now: fixedNow });

    expect(result.generatedAt).toBe(fixedNow.toISOString());
    expect(result.events).toHaveLength(2);
    expect(result.events[0]?.eventType).toBe("order_status_changed");
    expect(result.events[0]?.occurredAt).toBe("2026-06-18 21:30:00");
    expect(result.events[1]?.eventType).toBe("order_created");
    expect(dbMocks.getDb).toHaveBeenCalledTimes(1);
    expect(dbMocks.tableSelect).toHaveBeenCalledTimes(1);
    expect(dbMocks.orderSelect).toHaveBeenCalledTimes(1);
  });

  it("returns empty feed when database unavailable", async () => {
    dbMocks.getDb.mockResolvedValue(null);

    const result = await getActivityFeed(5);

    expect(result.events).toEqual([]);
  });

  it("scopes both queries to the requested restaurant via getActivityFeed", async () => {
    await getActivityFeed(99, { limit: 25 });

    expect(dbMocks.tableWhere).toHaveBeenCalled();
    expect(dbMocks.orderWhere).toHaveBeenCalled();
  });
});
