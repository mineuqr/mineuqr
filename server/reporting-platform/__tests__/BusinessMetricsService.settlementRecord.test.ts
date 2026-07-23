import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBusinessMetricsSummary } from "../BusinessMetricsService";
import * as srAdapter from "../settlementRecordReportingAdapter";
import * as checkRepo from "../checkReportingRepository";
import type { SettlementRecordReportingFact } from "../settlementRecordReportingAdapter";

vi.mock("../settlementRecordReportingAdapter", () => ({
  listSettlementRecordsForReporting: vi.fn(),
  listSettlementRecordPaymentLinesForReporting: vi.fn(),
}));

vi.mock("../checkReportingRepository", () => ({
  listTerminalChecksForReporting: vi.fn(),
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

  beforeEach(() => {
    process.env.REPORTING_FINANCIAL_SOURCE = "settlement_record";
    vi.mocked(srAdapter.listSettlementRecordsForReporting).mockReset();
    vi.mocked(checkRepo.listTerminalChecksForReporting).mockReset();
  });

  afterEach(() => {
    if (prev === undefined) delete process.env.REPORTING_FINANCIAL_SOURCE;
    else process.env.REPORTING_FINANCIAL_SOURCE = prev;
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
    expect(checkRepo.listTerminalChecksForReporting).not.toHaveBeenCalled();
  });

  it("does not call Check repository in settlement_record mode", async () => {
    vi.mocked(srAdapter.listSettlementRecordsForReporting).mockResolvedValue([]);
    await getBusinessMetricsSummary({ restaurantId: 1 });
    expect(srAdapter.listSettlementRecordsForReporting).toHaveBeenCalledOnce();
    expect(checkRepo.listTerminalChecksForReporting).not.toHaveBeenCalled();
  });
});
