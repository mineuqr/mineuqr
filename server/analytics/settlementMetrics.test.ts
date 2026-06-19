import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getDb: vi.fn(),
  select: vi.fn(),
  from: vi.fn(),
  where: vi.fn(),
}));

vi.mock("../db", () => ({
  getDb: (...args: unknown[]) => dbMocks.getDb(...args),
}));

import {
  buildSettlementBreakdown,
  buildSettlementSummary,
  buildSettlementTrend,
  formatIsoWeekKey,
  getSettlementBreakdown,
  getSettlementSummary,
  getSettlementTrend,
  parseSettledTimestampMs,
  resolvePeriodKey,
  resolvePeriodStart,
  type SettledSessionMetricRow,
} from "./settlementMetrics";

const FIXED_NOW = new Date("2026-06-18T12:00:00.000Z");

const sampleRows: SettledSessionMetricRow[] = [
  {
    settlementOutcome: "paid",
    settledAt: "2026-06-01 10:00:00",
    totalAmount: "42.50",
  },
  {
    settlementOutcome: "paid",
    settledAt: "2026-06-02 11:30:00",
    totalAmount: "17.50",
  },
  {
    settlementOutcome: "complimentary",
    settledAt: "2026-06-02 14:00:00",
    totalAmount: "25.00",
  },
  {
    settlementOutcome: "complimentary",
    settledAt: "2026-06-03 09:15:00",
    totalAmount: "10.00",
  },
];

describe("settlementMetrics SETTLEMENT-ARCHITECTURE-1B.1", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.where.mockResolvedValue([]);
    dbMocks.from.mockReturnValue({ where: dbMocks.where });
    dbMocks.select.mockReturnValue({ from: dbMocks.from });
    dbMocks.getDb.mockResolvedValue({ select: dbMocks.select });
  });

  describe("parseSettledTimestampMs", () => {
    it("parses MySQL datetime strings as UTC", () => {
      expect(parseSettledTimestampMs("2026-06-01 10:00:00")).toBe(
        Date.parse("2026-06-01T10:00:00Z")
      );
    });

    it("parses ISO datetime strings", () => {
      expect(parseSettledTimestampMs("2026-06-01T10:00:00.000Z")).toBe(
        Date.parse("2026-06-01T10:00:00.000Z")
      );
    });
  });

  describe("resolvePeriodKey", () => {
    it("groups by day", () => {
      expect(resolvePeriodKey("2026-06-01 10:00:00", "day")).toBe("2026-06-01");
      expect(resolvePeriodKey("2026-06-02 11:30:00", "day")).toBe("2026-06-02");
    });

    it("groups by month", () => {
      expect(resolvePeriodKey("2026-06-01 10:00:00", "month")).toBe("2026-06");
      expect(resolvePeriodKey("2026-07-15 08:00:00", "month")).toBe("2026-07");
    });

    it("groups by ISO week", () => {
      expect(resolvePeriodKey("2026-06-01 10:00:00", "week")).toBe("2026-W23");
    });

    it("returns null for invalid timestamps", () => {
      expect(resolvePeriodKey("not-a-date", "day")).toBeNull();
    });
  });

  describe("formatIsoWeekKey / resolvePeriodStart", () => {
    it("formats ISO week keys consistently", () => {
      const date = new Date("2026-06-01T10:00:00.000Z");
      const weekKey = formatIsoWeekKey(date);
      expect(weekKey).toMatch(/^\d{4}-W\d{2}$/);
      expect(resolvePeriodStart(weekKey, "week")).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });

    it("resolves day and month period starts", () => {
      expect(resolvePeriodStart("2026-06-15", "day")).toBe("2026-06-15T00:00:00.000Z");
      expect(resolvePeriodStart("2026-06", "month")).toBe("2026-06-01T00:00:00.000Z");
    });
  });

  describe("buildSettlementSummary", () => {
    it("counts sessions and revenue from paid outcomes only", () => {
      const summary = buildSettlementSummary(sampleRows, FIXED_NOW);

      expect(summary).toEqual({
        generatedAt: FIXED_NOW.toISOString(),
        paidSessionCount: 2,
        complimentarySessionCount: 2,
        totalSettledSessions: 4,
        paidRevenue: "60.00",
        complimentaryTotalAmount: "35.00",
      });
    });

    it("returns zeros for empty input", () => {
      const summary = buildSettlementSummary([], FIXED_NOW);

      expect(summary.paidSessionCount).toBe(0);
      expect(summary.complimentarySessionCount).toBe(0);
      expect(summary.paidRevenue).toBe("0.00");
      expect(summary.complimentaryTotalAmount).toBe("0.00");
    });

    it("treats null totalAmount as zero", () => {
      const summary = buildSettlementSummary(
        [{ settlementOutcome: "paid", settledAt: "2026-06-01 10:00:00", totalAmount: null }],
        FIXED_NOW
      );

      expect(summary.paidRevenue).toBe("0.00");
      expect(summary.paidSessionCount).toBe(1);
    });

    it("rounds revenue to two decimal places", () => {
      const summary = buildSettlementSummary(
        [
          {
            settlementOutcome: "paid",
            settledAt: "2026-06-01 10:00:00",
            totalAmount: "10.005",
          },
          {
            settlementOutcome: "paid",
            settledAt: "2026-06-01 11:00:00",
            totalAmount: "10.004",
          },
        ],
        FIXED_NOW
      );

      expect(summary.paidRevenue).toBe("20.01");
    });
  });

  describe("buildSettlementBreakdown", () => {
    it("returns paid and complimentary buckets with revenue on paid only", () => {
      const breakdown = buildSettlementBreakdown(sampleRows, FIXED_NOW);

      expect(breakdown.paidRevenue).toBe("60.00");
      expect(breakdown.items).toHaveLength(2);

      const paid = breakdown.items.find((item) => item.outcome === "paid");
      const complimentary = breakdown.items.find((item) => item.outcome === "complimentary");

      expect(paid).toEqual({
        outcome: "paid",
        sessionCount: 2,
        totalAmount: "60.00",
        revenueContribution: "60.00",
      });
      expect(complimentary).toEqual({
        outcome: "complimentary",
        sessionCount: 2,
        totalAmount: "35.00",
        revenueContribution: "0.00",
      });
    });

    it("includes zero-count buckets when no rows", () => {
      const breakdown = buildSettlementBreakdown([], FIXED_NOW);

      expect(breakdown.items.map((item) => item.outcome)).toEqual(["paid", "complimentary"]);
      expect(breakdown.paidRevenue).toBe("0.00");
      for (const item of breakdown.items) {
        expect(item.sessionCount).toBe(0);
        expect(item.revenueContribution).toBe("0.00");
      }
    });
  });

  describe("buildSettlementTrend", () => {
    it("groups by day with paid revenue excluding complimentary", () => {
      const trend = buildSettlementTrend(sampleRows, "day", FIXED_NOW);

      expect(trend.grouping).toBe("day");
      expect(trend.points).toEqual([
        {
          periodKey: "2026-06-01",
          periodStart: "2026-06-01T00:00:00.000Z",
          paidSessionCount: 1,
          complimentarySessionCount: 0,
          paidRevenue: "42.50",
          complimentaryTotalAmount: "0.00",
        },
        {
          periodKey: "2026-06-02",
          periodStart: "2026-06-02T00:00:00.000Z",
          paidSessionCount: 1,
          complimentarySessionCount: 1,
          paidRevenue: "17.50",
          complimentaryTotalAmount: "25.00",
        },
        {
          periodKey: "2026-06-03",
          periodStart: "2026-06-03T00:00:00.000Z",
          paidSessionCount: 0,
          complimentarySessionCount: 1,
          paidRevenue: "0.00",
          complimentaryTotalAmount: "10.00",
        },
      ]);
    });

    it("groups by month", () => {
      const trend = buildSettlementTrend(sampleRows, "month", FIXED_NOW);

      expect(trend.points).toHaveLength(1);
      expect(trend.points[0]).toMatchObject({
        periodKey: "2026-06",
        paidSessionCount: 2,
        complimentarySessionCount: 2,
        paidRevenue: "60.00",
        complimentaryTotalAmount: "35.00",
      });
    });

    it("groups by week", () => {
      const trend = buildSettlementTrend(sampleRows, "week", FIXED_NOW);

      expect(trend.points.length).toBeGreaterThan(0);
      const totals = trend.points.reduce(
        (acc, point) => ({
          paid: acc.paid + point.paidSessionCount,
          complimentary: acc.complimentary + point.complimentarySessionCount,
          paidRevenue: acc.paidRevenue + Number.parseFloat(point.paidRevenue),
        }),
        { paid: 0, complimentary: 0, paidRevenue: 0 }
      );

      expect(totals.paid).toBe(2);
      expect(totals.complimentary).toBe(2);
      expect(totals.paidRevenue).toBeCloseTo(60, 2);
    });

    it("sorts points chronologically by periodKey", () => {
      const rows: SettledSessionMetricRow[] = [
        {
          settlementOutcome: "paid",
          settledAt: "2026-06-03 10:00:00",
          totalAmount: "5.00",
        },
        {
          settlementOutcome: "paid",
          settledAt: "2026-06-01 10:00:00",
          totalAmount: "1.00",
        },
      ];

      const trend = buildSettlementTrend(rows, "day", FIXED_NOW);
      expect(trend.points.map((point) => point.periodKey)).toEqual([
        "2026-06-01",
        "2026-06-03",
      ]);
    });

    it("skips rows with unparseable settledAt", () => {
      const trend = buildSettlementTrend(
        [
          {
            settlementOutcome: "paid",
            settledAt: "invalid",
            totalAmount: "99.00",
          },
          {
            settlementOutcome: "paid",
            settledAt: "2026-06-01 10:00:00",
            totalAmount: "1.00",
          },
        ],
        "day",
        FIXED_NOW
      );

      expect(trend.points).toHaveLength(1);
      expect(trend.points[0].paidRevenue).toBe("1.00");
    });
  });

  describe("getSettlementSummary (DB)", () => {
    it("fetches settled rows and aggregates summary", async () => {
      dbMocks.where.mockResolvedValue([
        {
          settlementOutcome: "paid",
          settledAt: "2026-06-01 10:00:00",
          totalAmount: "30.00",
        },
        {
          settlementOutcome: "complimentary",
          settledAt: "2026-06-01 11:00:00",
          totalAmount: "15.00",
        },
      ]);

      const summary = await getSettlementSummary(
        { restaurantId: 10, from: "2026-06-01", to: "2026-06-30" },
        FIXED_NOW
      );

      expect(dbMocks.getDb).toHaveBeenCalled();
      expect(summary.paidRevenue).toBe("30.00");
      expect(summary.complimentaryTotalAmount).toBe("15.00");
      expect(summary.totalSettledSessions).toBe(2);
    });

    it("returns empty summary when database is unavailable", async () => {
      dbMocks.getDb.mockResolvedValue(null);

      const summary = await getSettlementSummary({ restaurantId: 10 }, FIXED_NOW);

      expect(summary.paidRevenue).toBe("0.00");
      expect(summary.totalSettledSessions).toBe(0);
    });

    it("returns empty summary for invalid restaurantId", async () => {
      const summary = await getSettlementSummary({ restaurantId: 0 }, FIXED_NOW);

      expect(summary.totalSettledSessions).toBe(0);
      expect(dbMocks.getDb).not.toHaveBeenCalled();
    });
  });

  describe("getSettlementBreakdown (DB)", () => {
    it("returns breakdown from database rows", async () => {
      dbMocks.where.mockResolvedValue([
        {
          settlementOutcome: "paid",
          settledAt: "2026-06-01 10:00:00",
          totalAmount: "12.00",
        },
      ]);

      const breakdown = await getSettlementBreakdown({ restaurantId: 5 }, FIXED_NOW);

      expect(breakdown.paidRevenue).toBe("12.00");
      expect(breakdown.items.find((item) => item.outcome === "paid")?.sessionCount).toBe(1);
      expect(
        breakdown.items.find((item) => item.outcome === "complimentary")?.sessionCount
      ).toBe(0);
    });

    it("returns empty breakdown when database is unavailable", async () => {
      dbMocks.getDb.mockResolvedValue(null);

      const breakdown = await getSettlementBreakdown({ restaurantId: 5 }, FIXED_NOW);

      expect(breakdown.paidRevenue).toBe("0.00");
      expect(breakdown.items).toHaveLength(2);
    });
  });

  describe("getSettlementTrend (DB)", () => {
    it("returns trend grouped by requested interval", async () => {
      dbMocks.where.mockResolvedValue([
        {
          settlementOutcome: "paid",
          settledAt: "2026-06-01 10:00:00",
          totalAmount: "8.00",
        },
        {
          settlementOutcome: "paid",
          settledAt: "2026-06-02 10:00:00",
          totalAmount: "4.00",
        },
      ]);

      const trend = await getSettlementTrend(
        { restaurantId: 3, grouping: "day" },
        FIXED_NOW
      );

      expect(trend.grouping).toBe("day");
      expect(trend.points).toHaveLength(2);
      expect(trend.points[0].paidRevenue).toBe("8.00");
      expect(trend.points[1].paidRevenue).toBe("4.00");
    });

    it("returns empty trend for invalid restaurantId", async () => {
      const trend = await getSettlementTrend(
        { restaurantId: -1, grouping: "month" },
        FIXED_NOW
      );

      expect(trend.points).toEqual([]);
      expect(trend.grouping).toBe("month");
    });
  });
});
