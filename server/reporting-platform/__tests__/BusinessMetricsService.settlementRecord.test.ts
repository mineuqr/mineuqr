import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBusinessMetricsSummary } from "../BusinessMetricsService";
import * as srAdapter from "../settlementRecordReportingAdapter";
import * as checkRepo from "../checkReportingRepository";
import * as cfAdapter from "../revenue-union/collectionFactReportingAdapter";
import type { SettlementRecordReportingFact } from "../settlementRecordReportingAdapter";

vi.mock("../settlementRecordReportingAdapter", () => ({
  listSettlementRecordsForReporting: vi.fn(),
  listSettlementRecordPaymentLinesForReporting: vi.fn(),
  listRefundSettlementRecordsForReporting: vi.fn(),
  listRefundSettlementRecordPaymentLinesForReporting: vi.fn(),
}));

vi.mock("../checkReportingRepository", () => ({
  listTerminalChecksForReporting: vi.fn(),
}));

vi.mock("../revenue-union/collectionFactReportingAdapter", () => ({
  listCollectionFactsForRevenueUnion: vi.fn(),
  listCollectionFactsForShadowRevenue: vi.fn(),
}));

function srFact(
  partial: Partial<SettlementRecordReportingFact> &
    Pick<SettlementRecordReportingFact, "id" | "outcome" | "grandTotal">
): SettlementRecordReportingFact {
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
    settlementRecordId: `sr-${partial.id}`,
    recordKind: "settlement",
    businessDay: "2026-07-16",
    paymentSnapshot: [],
    publicationSource: "settlement_record",
    ...partial,
  };
}

describe("BusinessMetricsService — Settlement Record canonical source", () => {
  const prev = process.env.REPORTING_FINANCIAL_SOURCE;
  const prevUnion = process.env.REPORTING_REVENUE_UNION;

  beforeEach(() => {
    process.env.REPORTING_FINANCIAL_SOURCE = "settlement_record";
    delete process.env.REPORTING_REVENUE_UNION;
    vi.mocked(srAdapter.listSettlementRecordsForReporting).mockReset();
    vi.mocked(srAdapter.listRefundSettlementRecordsForReporting).mockReset();
    vi.mocked(srAdapter.listRefundSettlementRecordsForReporting).mockResolvedValue(
      []
    );
    vi.mocked(checkRepo.listTerminalChecksForReporting).mockReset();
    vi.mocked(cfAdapter.listCollectionFactsForRevenueUnion).mockReset();
    vi.mocked(cfAdapter.listCollectionFactsForRevenueUnion).mockResolvedValue([]);
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.REPORTING_FINANCIAL_SOURCE;
    else process.env.REPORTING_FINANCIAL_SOURCE = prev;
    if (prevUnion === undefined) delete process.env.REPORTING_REVENUE_UNION;
    else process.env.REPORTING_REVENUE_UNION = prevUnion;
  });

  it("aggregates revenue/tax from Settlement Record only (default mode)", async () => {
    vi.mocked(srAdapter.listSettlementRecordsForReporting).mockResolvedValue([
      srFact({
        id: 1,
        outcome: "paid",
        grandTotal: "230.00",
        taxAmount: "30.00",
      }),
      srFact({
        id: 2,
        outcome: "complimentary",
        grandTotal: "40.00",
        settledAt: "2026-07-16 13:00:00",
      }),
    ]);

    const summary = await getBusinessMetricsSummary({
      restaurantId: 1,
      from: "2026-07-01 00:00:00",
      to: "2026-07-31 23:59:59",
    });

    expect(summary.revenue).toBe("230.00");
    expect(summary.taxCollected).toBe("30.00");
    expect(summary.paidCheckCount).toBe(1);
    expect(summary.averageCheck).toBe("230.00");
    expect(summary.complimentaryAmount).toBe("40.00");
    expect(summary.netRevenue).toBe("230.00");
    expect(summary.refundPublishedTotal).toBe("0.00");
    expect(checkRepo.listTerminalChecksForReporting).not.toHaveBeenCalled();
  });

  it("derives Net Revenue from refund publications without mutating Gross", async () => {
    vi.mocked(srAdapter.listSettlementRecordsForReporting).mockResolvedValue([
      srFact({
        id: 1,
        outcome: "paid",
        grandTotal: "200.00",
        taxAmount: "26.09",
      }),
    ]);
    vi.mocked(srAdapter.listRefundSettlementRecordsForReporting).mockResolvedValue([
      srFact({
        id: 1,
        outcome: "paid",
        grandTotal: "50.00",
        taxAmount: "6.52",
        recordKind: "refund",
        settlementRecordId: "sr-refund-1",
        settledAt: "2026-07-17 10:00:00",
      }),
    ]);

    const summary = await getBusinessMetricsSummary({
      restaurantId: 1,
      from: "2026-07-01 00:00:00",
      to: "2026-07-31 23:59:59",
    });

    expect(summary.revenue).toBe("200.00");
    expect(summary.taxCollected).toBe("26.09");
    expect(summary.refundPublishedTotal).toBe("50.00");
    expect(summary.refundPublicationCount).toBe(1);
    expect(summary.netRevenue).toBe("150.00");
    expect(summary.refundRate).toBe("25.00");
  });

  it("does not call Check repository in settlement_record mode", async () => {
    vi.mocked(srAdapter.listSettlementRecordsForReporting).mockResolvedValue([]);
    await getBusinessMetricsSummary({ restaurantId: 1 });
    expect(srAdapter.listSettlementRecordsForReporting).toHaveBeenCalledOnce();
    expect(checkRepo.listTerminalChecksForReporting).not.toHaveBeenCalled();
  });
});

describe("BusinessMetricsService — Revenue Union published pipeline", () => {
  const prevSource = process.env.REPORTING_FINANCIAL_SOURCE;
  const prevUnion = process.env.REPORTING_REVENUE_UNION;

  beforeEach(() => {
    process.env.REPORTING_FINANCIAL_SOURCE = "settlement_record";
    delete process.env.REPORTING_REVENUE_UNION;
    vi.mocked(srAdapter.listSettlementRecordsForReporting).mockReset();
    vi.mocked(srAdapter.listRefundSettlementRecordsForReporting).mockReset();
    vi.mocked(srAdapter.listRefundSettlementRecordsForReporting).mockResolvedValue(
      []
    );
    vi.mocked(cfAdapter.listCollectionFactsForRevenueUnion).mockReset();
    vi.mocked(cfAdapter.listCollectionFactsForRevenueUnion).mockResolvedValue([]);
  });

  afterEach(() => {
    if (prevSource === undefined) delete process.env.REPORTING_FINANCIAL_SOURCE;
    else process.env.REPORTING_FINANCIAL_SOURCE = prevSource;
    if (prevUnion === undefined) delete process.env.REPORTING_REVENUE_UNION;
    else process.env.REPORTING_REVENUE_UNION = prevUnion;
  });

  it("equals legacy SR Gross when Collection Facts are empty", async () => {
    vi.mocked(srAdapter.listSettlementRecordsForReporting).mockResolvedValue([
      srFact({
        id: 1,
        outcome: "paid",
        grandTotal: "230.00",
        taxAmount: "30.00",
      }),
    ]);
    const summary = await getBusinessMetricsSummary({
      restaurantId: 1,
      from: "2026-07-01 00:00:00",
      to: "2026-07-31 23:59:59",
    });
    expect(summary.revenue).toBe("230.00");
    expect(summary.taxCollected).toBe("30.00");
    expect(summary.paidCheckCount).toBe(1);
    expect(cfAdapter.listCollectionFactsForRevenueUnion).toHaveBeenCalledWith({
      restaurantId: 1,
    });
  });

  it("does not publish isolated Collection Facts or change Check Gross", async () => {
    vi.mocked(srAdapter.listSettlementRecordsForReporting).mockResolvedValue([
      srFact({
        id: 10,
        outcome: "paid",
        grandTotal: "115.00",
        taxAmount: "15.00",
      }),
    ]);
    vi.mocked(cfAdapter.listCollectionFactsForRevenueUnion).mockResolvedValue([
      {
        collectionFactId: "pcf-isolated",
        restaurantId: 1,
        orderId: 44,
        paymentIntentId: "int-isolated",
        orderingChannel: "cashier_pos",
        purpose: "validation",
        amount: "999.00",
        taxAmount: "0.00",
        discountAmount: "0.00",
        currencyCode: "SAR",
        currencySnapshot: { currencyCode: "SAR", currencySymbol: "ر.س" },
        taxPolicySnapshot: {
          version: 1,
          enabled: false,
          mode: "exclusive",
          components: [],
        },
        tenders: [{ paymentMethod: "cash", amount: "999.00" }],
        checkId: 10,
        businessDay: "2026-07-16",
        committedAt: "2026-07-16T12:00:00.000Z",
      },
    ]);
    const summary = await getBusinessMetricsSummary({ restaurantId: 1 });
    expect(summary.revenue).toBe("115.00");
    expect(summary.paidCheckCount).toBe(1);
  });

  it("skips Collection Fact reads on legacy publication rollback", async () => {
    process.env.REPORTING_REVENUE_UNION = "legacy";
    vi.mocked(srAdapter.listSettlementRecordsForReporting).mockResolvedValue([
      srFact({ id: 1, outcome: "paid", grandTotal: "40.00", taxAmount: "5.22" }),
    ]);
    const summary = await getBusinessMetricsSummary({ restaurantId: 1 });
    expect(summary.revenue).toBe("40.00");
    expect(cfAdapter.listCollectionFactsForRevenueUnion).not.toHaveBeenCalled();
  });
});
