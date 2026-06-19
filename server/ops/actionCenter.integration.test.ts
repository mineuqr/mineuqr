import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  leftJoin: vi.fn(),
  where: vi.fn(),
}));

vi.mock("../db", () => ({
  getDb: (...args: unknown[]) => dbMocks.getDb(...args),
}));

import { getActionCenter } from "./actionCenter";

describe("getActionCenter integration OPS-DASHBOARD-2D.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    dbMocks.where.mockResolvedValue([
      {
        sessionId: 10,
        tableId: 1,
        tableNumber: 1,
        sessionStatus: "bill_requested",
        openedAt: "2026-06-18 19:00:00",
        billRequestedAt: "2026-06-18 21:30:00",
        paymentPendingAt: null,
        nameAr: null,
        nameEn: "Table 1",
      },
      {
        sessionId: 11,
        tableId: 2,
        tableNumber: 2,
        sessionStatus: "payment_pending",
        openedAt: "2026-06-18 20:00:00",
        billRequestedAt: "2026-06-18 21:00:00",
        paymentPendingAt: "2026-06-18 21:45:00",
        nameAr: null,
        nameEn: "Table 2",
      },
    ]);
    dbMocks.leftJoin.mockReturnValue({ where: dbMocks.where });
    dbMocks.from.mockReturnValue({ leftJoin: dbMocks.leftJoin });
    dbMocks.select.mockReturnValue({ from: dbMocks.from });
    dbMocks.getDb.mockResolvedValue({ select: dbMocks.select });
  });

  it("returns generatedAt and partitioned action lists from one query", async () => {
    const fixedNow = new Date("2026-06-18T22:00:00.000Z");
    const result = await getActionCenter(5, fixedNow);

    expect(result.generatedAt).toBe(fixedNow.toISOString());
    expect(result.billRequests).toHaveLength(1);
    expect(result.paymentPending).toHaveLength(1);
    expect(result.billRequests[0]?.sessionId).toBe("10");
    expect(result.paymentPending[0]?.sessionId).toBe("11");
    expect(dbMocks.select).toHaveBeenCalledTimes(1);
  });

  it("returns empty lists when database unavailable", async () => {
    dbMocks.getDb.mockResolvedValue(null);

    const result = await getActionCenter(5);

    expect(result.billRequests).toEqual([]);
    expect(result.paymentPending).toEqual([]);
    expect(result.longRunningSessions).toEqual([]);
  });
});
