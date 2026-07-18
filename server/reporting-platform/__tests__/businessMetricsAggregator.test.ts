import { describe, expect, it } from "vitest";
import {
  buildBusinessMetricsSummary,
  buildBusinessMetricsTrend,
} from "../businessMetricsAggregator";
import type { CheckReportingRow } from "../checkReportingRepository";

function check(
  partial: Partial<CheckReportingRow> &
    Pick<CheckReportingRow, "id" | "outcome" | "grandTotal">
): CheckReportingRow {
  return {
    restaurantId: 1,
    sessionId: 10,
    taxAmount: "0.00",
    settledAt: "2026-07-16 12:00:00",
    voidedAt: null,
    currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
    taxPolicySnapshot: {
      version: 1,
      enabled: true,
      mode: "exclusive",
      components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
    },
    ...partial,
  };
}

describe("businessMetricsAggregator — Revenue = Paid Check grandTotal", () => {
  it("counts only paid checks as revenue", () => {
    const summary = buildBusinessMetricsSummary(
      1,
      [
        check({ id: 1, outcome: "paid", grandTotal: "115.00", taxAmount: "15.00" }),
        check({
          id: 2,
          outcome: "complimentary",
          grandTotal: "50.00",
          settledAt: "2026-07-16 13:00:00",
        }),
        check({
          id: 3,
          outcome: "voided",
          grandTotal: "20.00",
          settledAt: null,
          voidedAt: "2026-07-16 14:00:00",
        }),
      ],
      null,
      null,
      new Date("2026-07-16T15:00:00.000Z")
    );

    expect(summary.revenue).toBe("115.00");
    expect(summary.paidCheckCount).toBe(1);
    expect(summary.averageCheck).toBe("115.00");
    expect(summary.taxCollected).toBe("15.00");
    expect(summary.complimentaryCount).toBe(1);
    expect(summary.complimentaryAmount).toBe("50.00");
    expect(summary.voidedCount).toBe(1);
    expect(summary.sampleTaxPolicySnapshot?.enabled).toBe(true);
    expect(summary.currency.currencySnapshot?.currencyCode).toBe("SAR");
  });

  it("does not treat complimentary as revenue", () => {
    const summary = buildBusinessMetricsSummary(
      1,
      [check({ id: 1, outcome: "complimentary", grandTotal: "999.00" })],
      null,
      null
    );
    expect(summary.revenue).toBe("0.00");
    expect(summary.paidCheckCount).toBe(0);
  });

  it("builds daily revenue trend from paid checks", () => {
    const trend = buildBusinessMetricsTrend(
      1,
      [
        check({
          id: 1,
          outcome: "paid",
          grandTotal: "10.00",
          settledAt: "2026-07-15 10:00:00",
        }),
        check({
          id: 2,
          outcome: "paid",
          grandTotal: "20.00",
          settledAt: "2026-07-16 10:00:00",
        }),
      ],
      "day",
      null,
      null
    );
    expect(trend.points).toHaveLength(2);
    expect(trend.points[0]?.revenue).toBe("10.00");
    expect(trend.points[1]?.revenue).toBe("20.00");
  });

  it("buckets pre-opening wall time onto previous Business Day (default 09:00)", () => {
    // 22:00 UTC 15th = 01:00 Riyadh 16th → before 09:00 → BD 2026-07-15
    const trend = buildBusinessMetricsTrend(
      1,
      [
        check({
          id: 1,
          outcome: "paid",
          grandTotal: "30.00",
          settledAt: "2026-07-15 22:00:00",
        }),
      ],
      "day",
      null,
      null
    );
    expect(trend.points).toHaveLength(1);
    expect(trend.points[0]?.periodKey).toBe("2026-07-15");
    expect(trend.points[0]?.revenue).toBe("30.00");
  });
});
