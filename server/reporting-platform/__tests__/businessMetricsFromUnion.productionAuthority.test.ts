/**
 * REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1 — Business Metrics mapping.
 */
import { describe, expect, it } from "vitest";
import { computeRevenueUnion } from "@shared/reporting-platform/revenue-union";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform";
import { publishedTrendRowsFromUnion } from "../revenue-union/businessMetricsFromUnion";
import type { SettlementRecordReportingFact } from "../settlementRecordReportingAdapter";

const CURRENCY = { currencyCode: "SAR", currencySymbol: "ر.س" };
const TAX = {
  version: 1 as const,
  enabled: true,
  mode: "exclusive" as const,
  components: [{ id: "vat", name: "VAT", ratePercent: "15.00" }],
};

function sr(partial: {
  id: number;
  grandTotal: string;
  taxAmount?: string;
  orderId: number;
  recordKind?: "settlement" | "refund";
}): SettlementRecordReportingFact {
  return {
    id: partial.id,
    restaurantId: 1,
    sessionId: 10,
    outcome: "paid",
    grandTotal: partial.grandTotal,
    taxAmount: partial.taxAmount ?? "0.00",
    settledAt: "2026-07-16 12:00:00",
    voidedAt: null,
    currencySnapshot: CURRENCY,
    taxPolicySnapshot: TAX,
    settlementRecordId: `sr-${partial.id}`,
    recordKind: partial.recordKind ?? "settlement",
    businessDay: "2026-07-16",
    paymentSnapshot: [],
    orderRefs: [{ orderId: partial.orderId }],
    publicationSource: "settlement_record",
  };
}

describe("publishedTrendRowsFromUnion — production overlap", () => {
  it("keeps overlapping SR rows and overlapping refunds; does not drop Gross", () => {
    const rows = [sr({ id: 10, grandTotal: "100.00", taxAmount: "13.04", orderId: 44 })];
    const refundRows = [
      sr({
        id: 10,
        grandTotal: "25.00",
        orderId: 44,
        recordKind: "refund",
      }),
    ];
    const facts = [
      {
        collectionFactId: "pcf-1",
        restaurantId: 1,
        orderId: 44,
        paymentIntentId: "int-1",
        orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        purpose: "production" as const,
        amount: "100.00",
        taxAmount: "13.04",
        discountAmount: "0.00",
        currencyCode: "SAR",
        currencySnapshot: CURRENCY,
        taxPolicySnapshot: TAX,
        tenders: [{ paymentMethod: "cash", amount: "100.00" }],
        checkId: 10,
        businessDay: "2026-07-16",
        committedAt: "2026-07-16T12:00:00.000Z",
      },
    ];
    const union = computeRevenueUnion({
      legacy: [
        {
          restaurantId: 1,
          checkId: 10,
          settlementRecordId: "sr-10",
          outcome: "paid",
          grandTotal: "100.00",
          taxAmount: "13.04",
          currencyCode: "SAR",
          currencySnapshot: CURRENCY,
          taxPolicySnapshot: TAX,
          businessDay: "2026-07-16",
          settledAt: "2026-07-16 12:00:00",
          voidedAt: null,
          orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
          orderIds: [44],
        },
      ],
      facts,
      refunds: [
        {
          restaurantId: 1,
          checkId: 10,
          settlementRecordId: "sr-rf",
          grandTotal: "25.00",
          settledAt: "2026-07-16 15:00:00",
          businessDay: "2026-07-16",
        },
      ],
      eligibility: "published",
    });
    const trend = publishedTrendRowsFromUnion({ rows, refundRows, facts, union });
    expect(union.productionOverlapCount).toBe(1);
    expect(trend.grossRows).toHaveLength(1);
    expect(trend.grossRows[0]?.grandTotal).toBe("100.00");
    expect(trend.refundRows).toHaveLength(1);
    expect(trend.refundRows[0]?.grandTotal).toBe("25.00");
  });

  it("appends Collection Fact-only contributions that have no Settlement Record", () => {
    const facts = [
      {
        collectionFactId: "pcf-only",
        restaurantId: 1,
        orderId: 9,
        paymentIntentId: "int-only",
        orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        purpose: "production" as const,
        amount: "40.00",
        taxAmount: "5.22",
        discountAmount: "0.00",
        currencyCode: "SAR",
        currencySnapshot: CURRENCY,
        taxPolicySnapshot: TAX,
        tenders: [{ paymentMethod: "cash", amount: "40.00" }],
        checkId: null,
        businessDay: "2026-07-16",
        committedAt: "2026-07-16T12:00:00.000Z",
      },
    ];
    const union = computeRevenueUnion({
      legacy: [],
      facts,
      eligibility: "published",
    });
    const trend = publishedTrendRowsFromUnion({
      rows: [],
      refundRows: [],
      facts,
      union,
    });
    expect(trend.grossRows).toHaveLength(1);
    expect(trend.grossRows[0]?.grandTotal).toBe("40.00");
  });
});
