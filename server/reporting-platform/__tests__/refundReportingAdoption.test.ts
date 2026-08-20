/**
 * REFUND-REPORTING-ADOPTION-1 — Net Revenue + refund analytics adoption tests.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  applyRefundPublicationsToBusinessMetrics,
  buildBusinessMetricsSummary,
  buildBusinessMetricsTrend,
} from "../businessMetricsAggregator";
import { getBusinessMetricsSummary } from "../BusinessMetricsService";
import {
  buildPaymentMethodAnalyticsFromCapturedLines,
} from "../PaymentMethodAnalyticsService";
import * as srAdapter from "../settlementRecordReportingAdapter";
import * as cfAdapter from "../revenue-union/collectionFactReportingAdapter";
import type { SettlementRecordReportingFact } from "../settlementRecordReportingAdapter";
import type { CheckReportingRow } from "../checkReportingRepository";

vi.mock("../settlementRecordReportingAdapter", () => ({
  listSettlementRecordsForReporting: vi.fn(),
  listSettlementRecordPaymentLinesForReporting: vi.fn(),
  listRefundSettlementRecordsForReporting: vi.fn(),
  listRefundSettlementRecordPaymentLinesForReporting: vi.fn(),
}));

vi.mock("../revenue-union/collectionFactReportingAdapter", () => ({
  listCollectionFactsForRevenueUnion: vi.fn(),
  listCollectionFactsForShadowRevenue: vi.fn(),
}));

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

function srFact(
  partial: Partial<SettlementRecordReportingFact> &
    Pick<SettlementRecordReportingFact, "id" | "outcome" | "grandTotal">
): SettlementRecordReportingFact {
  return {
    ...check(partial),
    settlementRecordId: `sr-${partial.id}`,
    recordKind: partial.recordKind ?? "settlement",
    businessDay: "2026-07-16",
    paymentSnapshot: partial.paymentSnapshot ?? [],
    orderRefs: partial.orderRefs ?? [],
    publicationSource: "settlement_record",
    ...partial,
  };
}

describe("REFUND-REPORTING-ADOPTION-1 — Net Revenue derivation", () => {
  it("keeps Gross Revenue unchanged when applying refund publications", () => {
    const gross = buildBusinessMetricsSummary(
      1,
      [check({ id: 1, outcome: "paid", grandTotal: "100.00", taxAmount: "13.04" })],
      null,
      null
    );
    const withRefunds = applyRefundPublicationsToBusinessMetrics(gross, [
      check({ id: 1, outcome: "paid", grandTotal: "25.00" }),
    ]);
    expect(withRefunds.revenue).toBe("100.00");
    expect(withRefunds.taxCollected).toBe("13.04");
    expect(withRefunds.paidCheckCount).toBe(1);
    expect(withRefunds.refundPublishedTotal).toBe("25.00");
    expect(withRefunds.netRevenue).toBe("75.00");
    expect(withRefunds.refundRate).toBe("25.00");
  });

  it("supports partial and multiple refunds", () => {
    const gross = buildBusinessMetricsSummary(
      1,
      [check({ id: 1, outcome: "paid", grandTotal: "200.00" })],
      null,
      null
    );
    const withRefunds = applyRefundPublicationsToBusinessMetrics(gross, [
      check({ id: 1, outcome: "paid", grandTotal: "30.00" }),
      check({ id: 1, outcome: "paid", grandTotal: "20.00" }),
    ]);
    expect(withRefunds.revenue).toBe("200.00");
    expect(withRefunds.refundPublicationCount).toBe(2);
    expect(withRefunds.refundPublishedTotal).toBe("50.00");
    expect(withRefunds.netRevenue).toBe("150.00");
  });

  it("replay is idempotent for the same refund publication set", () => {
    const gross = buildBusinessMetricsSummary(
      1,
      [check({ id: 1, outcome: "paid", grandTotal: "80.00" })],
      null,
      null
    );
    const refunds = [check({ id: 1, outcome: "paid", grandTotal: "10.00" })];
    const a = applyRefundPublicationsToBusinessMetrics(gross, refunds);
    const b = applyRefundPublicationsToBusinessMetrics(gross, refunds);
    expect(a).toEqual(b);
  });

  it("backward compatibility: zero refunds ⇒ netRevenue equals revenue", () => {
    const gross = buildBusinessMetricsSummary(
      1,
      [check({ id: 1, outcome: "paid", grandTotal: "55.00" })],
      null,
      null
    );
    expect(gross.netRevenue).toBe(gross.revenue);
    expect(gross.refundPublishedTotal).toBe("0.00");
    expect(gross.refundPublicationCount).toBe(0);
  });
});

describe("REFUND-REPORTING-ADOPTION-1 — Business Day trend replay", () => {
  it("aggregates Gross and Net per Business Day without mutating revenue", () => {
    const trend = buildBusinessMetricsTrend(
      1,
      [
        check({
          id: 1,
          outcome: "paid",
          grandTotal: "100.00",
          settledAt: "2026-07-16 12:00:00",
        }),
        check({
          id: 2,
          outcome: "paid",
          grandTotal: "50.00",
          settledAt: "2026-07-17 12:00:00",
        }),
      ],
      "day",
      "2026-07-16 00:00:00",
      "2026-07-17 23:59:59",
      new Date("2026-07-18T00:00:00.000Z"),
      undefined,
      [
        check({
          id: 1,
          outcome: "paid",
          grandTotal: "40.00",
          settledAt: "2026-07-17 15:00:00",
        }),
      ]
    );

    const d16 = trend.points.find((p) => p.periodKey === "2026-07-16");
    const d17 = trend.points.find((p) => p.periodKey === "2026-07-17");
    expect(d16?.revenue).toBe("100.00");
    expect(d16?.refundPublishedTotal).toBe("0.00");
    expect(d16?.netRevenue).toBe("100.00");
    expect(d17?.revenue).toBe("50.00");
    expect(d17?.refundPublishedTotal).toBe("40.00");
    expect(d17?.netRevenue).toBe("10.00");
  });
});

describe("REFUND-REPORTING-ADOPTION-1 — Payment method refund buckets", () => {
  it("keeps captured mix separate from cash/card refund breakdown", () => {
    const dto = buildPaymentMethodAnalyticsFromCapturedLines(
      { restaurantId: 1 },
      [
        {
          paymentMethod: "cash",
          amount: "60.00",
          status: "captured",
          checkId: 1,
        },
        {
          paymentMethod: "card",
          amount: "40.00",
          status: "captured",
          checkId: 1,
        },
        {
          paymentMethod: "cash",
          amount: "15.00",
          status: "refunded",
          checkId: 1,
        },
        {
          paymentMethod: "card",
          amount: "10.00",
          status: "refunded",
          checkId: 1,
        },
      ]
    );

    expect(dto.monetaryTenderTotal).toBe("100.00");
    expect(dto.buckets.find((b) => b.paymentMethod === "cash")?.tenderAmount).toBe(
      "60.00"
    );
    expect(dto.refundTenderTotal).toBe("25.00");
    expect(
      dto.refundBuckets.find((b) => b.paymentMethod === "cash")?.tenderAmount
    ).toBe("15.00");
    expect(
      dto.refundBuckets.find((b) => b.paymentMethod === "card")?.tenderAmount
    ).toBe("10.00");
  });
});

describe("REFUND-REPORTING-ADOPTION-1 — Service integration + tenant isolation", () => {
  const prev = process.env.REPORTING_FINANCIAL_SOURCE;
  const prevUnion = process.env.REPORTING_REVENUE_UNION;

  beforeEach(() => {
    process.env.REPORTING_FINANCIAL_SOURCE = "settlement_record";
    delete process.env.REPORTING_REVENUE_UNION;
    vi.mocked(srAdapter.listSettlementRecordsForReporting).mockReset();
    vi.mocked(srAdapter.listRefundSettlementRecordsForReporting).mockReset();
    vi.mocked(cfAdapter.listCollectionFactsForRevenueUnion).mockReset();
    vi.mocked(cfAdapter.listCollectionFactsForRevenueUnion).mockResolvedValue([]);
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.REPORTING_FINANCIAL_SOURCE;
    else process.env.REPORTING_FINANCIAL_SOURCE = prev;
    if (prevUnion === undefined) delete process.env.REPORTING_REVENUE_UNION;
    else process.env.REPORTING_REVENUE_UNION = prevUnion;
  });

  it("loads refund publications per restaurant query (tenant-scoped adapter)", async () => {
    vi.mocked(srAdapter.listSettlementRecordsForReporting).mockResolvedValue([
      srFact({ id: 1, outcome: "paid", grandTotal: "90.00", taxAmount: "11.74" }),
    ]);
    vi.mocked(srAdapter.listRefundSettlementRecordsForReporting).mockResolvedValue(
      [
        srFact({
          id: 1,
          outcome: "paid",
          grandTotal: "20.00",
          recordKind: "refund",
          settlementRecordId: "sr-r1",
        }),
      ]
    );

    const summary = await getBusinessMetricsSummary({
      restaurantId: 42,
      from: "2026-07-01 00:00:00",
      to: "2026-07-31 23:59:59",
    });

    expect(srAdapter.listSettlementRecordsForReporting).toHaveBeenCalledWith({
      restaurantId: 42,
      from: "2026-07-01 00:00:00",
      to: "2026-07-31 23:59:59",
    });
    expect(srAdapter.listRefundSettlementRecordsForReporting).toHaveBeenCalledWith({
      restaurantId: 42,
      from: "2026-07-01 00:00:00",
      to: "2026-07-31 23:59:59",
    });
    expect(summary.revenue).toBe("90.00");
    expect(summary.netRevenue).toBe("70.00");
  });
});
