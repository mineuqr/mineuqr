import { describe, expect, it } from "vitest";
import {
  REPORTING_CONTRACT_VERSION,
  type BusinessMetricsSummaryDto,
  type PaymentMethodAnalyticsDto,
} from "@shared/reporting-platform";
import {
  compareBusinessMetricsParity,
  comparePaymentMethodParity,
} from "../financialReportingParity";
import { buildBusinessMetricsSummary } from "../businessMetricsAggregator";
import type { CheckReportingRow } from "../checkReportingRepository";
import { resolveFinancialReportingSourceMode } from "../financialReportingSource";

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

function baseSummary(
  overrides: Partial<BusinessMetricsSummaryDto> = {}
): BusinessMetricsSummaryDto {
  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "BusinessMetricsSummary",
    generatedAt: "2026-07-16T15:00:00.000Z",
    restaurantId: 1,
    from: null,
    to: null,
    revenue: "100.00",
    paidCheckCount: 2,
    averageCheck: "50.00",
    taxCollected: "13.04",
    complimentaryCount: 0,
    complimentaryAmount: "0.00",
    voidedCount: 0,
    currency: { currencySnapshot: null },
    sampleTaxPolicySnapshot: null,
    ...overrides,
  };
}

function basePayment(
  overrides: Partial<PaymentMethodAnalyticsDto> = {}
): PaymentMethodAnalyticsDto {
  return {
    contractVersion: REPORTING_CONTRACT_VERSION,
    contractId: "PaymentMethodAnalytics",
    programId: "REPORTING-PAYMENT-METHOD-ANALYTICS-1",
    generatedAt: "2026-07-16T15:00:00.000Z",
    restaurantId: 1,
    from: null,
    to: null,
    monetaryTenderTotal: "100.00",
    complimentaryAmount: "0.00",
    buckets: [
      {
        paymentMethod: "cash",
        category: "cash",
        tenderAmount: "40.00",
        transactionCount: 1,
        checkCount: 1,
        averageCheck: "40.00",
        mixPercent: "40.00",
      },
      {
        paymentMethod: "mada",
        category: "card",
        tenderAmount: "60.00",
        transactionCount: 1,
        checkCount: 1,
        averageCheck: "60.00",
        mixPercent: "60.00",
      },
    ],
    ...overrides,
  };
}

describe("SETTLEMENT-RECORD-REPORTING-ADOPTION-1 dual-run parity", () => {
  it("defaults financial source to settlement_record", () => {
    expect(resolveFinancialReportingSourceMode({})).toBe("settlement_record");
    expect(
      resolveFinancialReportingSourceMode({
        REPORTING_FINANCIAL_SOURCE: "dual",
      })
    ).toBe("dual");
    expect(
      resolveFinancialReportingSourceMode({
        REPORTING_FINANCIAL_SOURCE: "check",
      })
    ).toBe("check");
  });

  it("matches business metrics when Settlement Record mirrors Check facts", () => {
    const facts = [
      check({ id: 1, outcome: "paid", grandTotal: "115.00", taxAmount: "15.00" }),
      check({
        id: 2,
        outcome: "complimentary",
        grandTotal: "50.00",
        settledAt: "2026-07-16 13:00:00",
      }),
    ];
    const legacy = buildBusinessMetricsSummary(1, facts, null, null);
    const published = buildBusinessMetricsSummary(1, facts, null, null);
    const parity = compareBusinessMetricsParity(legacy, published);
    expect(parity.matched).toBe(true);
    expect(parity.deltas).toEqual([]);
    expect(legacy.revenue).toBe("115.00");
    expect(legacy.taxCollected).toBe("15.00");
    expect(legacy.averageCheck).toBe("115.00");
    expect(legacy.paidCheckCount).toBe(1);
  });

  it("detects business metric mismatches", () => {
    const parity = compareBusinessMetricsParity(
      baseSummary({ revenue: "100.00" }),
      baseSummary({ revenue: "90.00" })
    );
    expect(parity.matched).toBe(false);
    expect(parity.deltas).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ field: "revenue" }),
      ])
    );
  });

  it("matches payment method totals when tender lines are identical", () => {
    const legacy = basePayment();
    const published = basePayment();
    const parity = comparePaymentMethodParity(legacy, published);
    expect(parity.matched).toBe(true);
    expect(parity.deltas).toEqual([]);
  });

  it("detects payment tender mismatches", () => {
    const parity = comparePaymentMethodParity(
      basePayment(),
      basePayment({
        monetaryTenderTotal: "90.00",
        buckets: [
          {
            paymentMethod: "cash",
            category: "cash",
            tenderAmount: "30.00",
            transactionCount: 1,
            checkCount: 1,
            averageCheck: "30.00",
            mixPercent: "33.33",
          },
          {
            paymentMethod: "mada",
            category: "card",
            tenderAmount: "60.00",
            transactionCount: 1,
            checkCount: 1,
            averageCheck: "60.00",
            mixPercent: "66.67",
          },
        ],
      })
    );
    expect(parity.matched).toBe(false);
    expect(parity.deltas.some((d) => d.field.includes("cash"))).toBe(true);
  });
});
