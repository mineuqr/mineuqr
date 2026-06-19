import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  tableSelect: vi.fn(),
  tableFrom: vi.fn(),
  tableLeftJoin: vi.fn(),
  tableWhere: vi.fn(),
  tableOrderBy: vi.fn(),
  orderSelect: vi.fn(),
  orderFrom: vi.fn(),
  orderWhere: vi.fn(),
  orderGroupBy: vi.fn(),
}));

vi.mock("../db", () => ({
  getDb: (...args: unknown[]) => dbMocks.getDb(...args),
}));

import { getActiveTablesBoard } from "./activeTablesBoard";

describe("getActiveTablesBoard integration OPS-DASHBOARD-2C.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    dbMocks.orderGroupBy.mockResolvedValue([{ sessionId: 10, pendingOrders: 1 }]);
    dbMocks.orderWhere.mockReturnValue({ groupBy: dbMocks.orderGroupBy });
    dbMocks.orderFrom.mockReturnValue({ where: dbMocks.orderWhere });
    dbMocks.orderSelect.mockReturnValue({ from: dbMocks.orderFrom });

    dbMocks.tableOrderBy.mockResolvedValue([
      {
        tableId: 1,
        tableNumber: 1,
        nameAr: null,
        nameEn: "Table 1",
        sessionId: 10,
        sessionStatus: "open",
        openedAt: "2026-06-18 21:00:00",
        totalOrders: 2,
        billRequestedAt: null,
      },
      {
        tableId: 2,
        tableNumber: 2,
        nameAr: null,
        nameEn: "Table 2",
        sessionId: null,
        sessionStatus: null,
        openedAt: null,
        totalOrders: null,
        billRequestedAt: null,
      },
    ]);
    dbMocks.tableWhere.mockReturnValue({ orderBy: dbMocks.tableOrderBy });
    dbMocks.tableLeftJoin.mockReturnValue({ where: dbMocks.tableWhere });
    dbMocks.tableFrom.mockReturnValue({
      leftJoin: dbMocks.tableLeftJoin,
    });
    dbMocks.tableSelect.mockReturnValue({ from: dbMocks.tableFrom });

    dbMocks.getDb.mockImplementation(async () => ({
      select: (selector: Record<string, unknown>) => {
        if ("pendingOrders" in selector) {
          return { from: dbMocks.orderFrom };
        }
        return { from: dbMocks.tableFrom };
      },
    }));
  });

  it("returns generatedAt and merged table rows from two aggregate queries", async () => {
    const fixedNow = new Date("2026-06-18T22:00:00.000Z");
    const result = await getActiveTablesBoard(5, fixedNow);

    expect(result.generatedAt).toBe(fixedNow.toISOString());
    expect(result.tables).toHaveLength(2);
    expect(result.tables[0]).toMatchObject({
      tableId: 1,
      tableName: "Table 1",
      sessionId: "10",
      status: "occupied",
      totalOrders: 2,
      pendingOrders: 1,
    });
    expect(result.tables[1]).toMatchObject({
      tableId: 2,
      status: "available",
      sessionId: null,
    });
  });

  it("returns empty tables when database unavailable", async () => {
    dbMocks.getDb.mockResolvedValue(null);

    const result = await getActiveTablesBoard(5);

    expect(result.tables).toEqual([]);
    expect(result.generatedAt).toBeTruthy();
  });
});
