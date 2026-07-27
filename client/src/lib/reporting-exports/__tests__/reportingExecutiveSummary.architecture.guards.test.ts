/**
 * REPORTING-UX-SIMPLIFICATION-1 — Executive Overview guards.
 * Max 6 cards: 5 KPI ids + Payment Overview presentation card.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  EXECUTIVE_PAYMENT_OVERVIEW_CARD_ID,
  EXECUTIVE_SUMMARY_KPI_IDS,
  SECTION_TERMINOLOGY,
} from "@shared/reporting-platform";
import {
  buildExecutiveSummaryCards,
  buildExecutiveSummaryViewModel,
} from "../executiveSummaryPresentation";
import type { BusinessMetricsSummaryDto } from "@shared/reporting-platform";

/** Forbids period-specific assumptions in Executive / Tax helper copy. */
const PERIOD_SPECIFIC_COPY =
  /\b(daily|weekly|monthly|quarterly|annual|yearly|month|week|quarter|year)\b/i;

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const sampleBusiness = {
  revenue: "100.00",
  taxCollected: "15.00",
  paidCheckCount: 4,
  averageCheck: "25.00",
  complimentaryCount: 2,
  complimentaryAmount: "10.00",
  voidedCount: 1,
  refundPublishedTotal: "10.00",
  refundPublicationCount: 1,
  netRevenue: "90.00",
  refundRate: "10.00",
} as BusinessMetricsSummaryDto;

const sampleOrders = {
  orderSales: "200.00",
  orderCount: 10,
  completedOrders: 8,
  averageOrder: "25.00",
};

describe("REPORTING-UX-SIMPLIFICATION-1 Executive Overview guards", () => {
  it("Executive Overview exposes simplified primary KPI set", () => {
    expect([...EXECUTIVE_SUMMARY_KPI_IDS]).toEqual([
      "revenue",
      "orderSales",
      "orderCount",
      "refundPublishedTotal",
      "taxCollected",
    ]);
  });

  it("view model is six cards including Payment Overview", () => {
    const vm = buildExecutiveSummaryViewModel({
      language: "en",
      business: sampleBusiness,
      orderPeriod: sampleOrders,
      formatMoney: (a) => a,
      paymentMonetaryTenderTotal: "95.00",
    });
    expect(vm.primaryQuestion).toMatch(/performing/i);
    expect(vm.groups).toHaveLength(1);
    expect(vm.groups[0]?.id).toBe("executive");
    expect(vm.groups[0]?.cards.map((c) => c.kpiId)).toEqual([
      ...EXECUTIVE_SUMMARY_KPI_IDS,
      EXECUTIVE_PAYMENT_OVERVIEW_CARD_ID,
    ]);
    expect(vm.groups[0]?.cards[0]?.label).toBe("Total Sales");
    expect(vm.groups[0]?.cards[1]?.label).toBe("Sales Orders");
    expect(vm.groups[0]?.cards[5]?.label).toBe("Payment Overview");
    expect(vm.groups[0]?.cards[5]?.value).toBe("95.00");
  });

  it("flat card builder returns six Executive Overview cards", () => {
    const cards = buildExecutiveSummaryCards({
      language: "en",
      business: sampleBusiness,
      orderPeriod: sampleOrders,
      formatMoney: (a) => a,
      paymentMonetaryTenderTotal: "95.00",
    });
    expect(cards).toHaveLength(6);
    expect(cards.map((c) => c.kpiId)).toEqual([
      ...EXECUTIVE_SUMMARY_KPI_IDS,
      EXECUTIVE_PAYMENT_OVERVIEW_CARD_ID,
    ]);
  });

  it("Excel and PDF consume the shared view model with footerNote", () => {
    const presentation = read(
      "client/src/lib/reporting-exports/executiveSummaryPresentation.ts"
    );
    const excel = read(
      "client/src/lib/reporting-exports/excel/buildReportingExportWorkbook.ts"
    );
    const pdf = read(
      "client/src/lib/reporting-exports/pdf/buildReportingExportPdf.ts"
    );
    expect(presentation).toContain("REPORTING-UX-SIMPLIFICATION-1");
    expect(presentation).toContain("footerNote");
    expect(excel).toContain("buildExecutiveSummaryViewModel");
    expect(excel).toContain("paymentMonetaryTenderTotal");
    expect(pdf).toContain("buildExecutiveSummaryViewModel");
  });

  it("section terminology exposes executive overview", () => {
    expect(SECTION_TERMINOLOGY.en.executiveSnapshot).toBe("Executive Overview");
    expect(SECTION_TERMINOLOGY.en.executiveSnapshotHint).not.toMatch(
      PERIOD_SPECIFIC_COPY
    );
    expect(SECTION_TERMINOLOGY.en.taxAnalysisPeriodNote).not.toMatch(
      /\b(daily|weekly|monthly|quarterly|annual|yearly)\b/i
    );
  });

  it("secondary averages are not on Executive Overview", () => {
    expect(EXECUTIVE_SUMMARY_KPI_IDS).not.toContain("averageOrder");
    expect(EXECUTIVE_SUMMARY_KPI_IDS).not.toContain("averageCheck");
    expect(EXECUTIVE_SUMMARY_KPI_IDS).not.toContain("refundRate");
    expect(EXECUTIVE_SUMMARY_KPI_IDS).not.toContain("netRevenue");
  });
});
