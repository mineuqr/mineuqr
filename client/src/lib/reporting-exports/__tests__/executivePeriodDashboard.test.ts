/**
 * REPORTING-PRODUCT-UX-RESTRUCTURE-1 — Today / Month executive VM presentation.
 */
import { describe, expect, it } from "vitest";
import { buildExecutivePeriodDashboardVm } from "../executivePeriodDashboard";
import type {
  BusinessMetricsSummaryDto,
  PaymentMethodAnalyticsDto,
} from "@shared/reporting-platform";

const business = {
  revenue: "100.00",
  taxCollected: "15.00",
  refundPublishedTotal: "10.00",
  netRevenue: "90.00",
} as BusinessMetricsSummaryDto;

const payment = {
  buckets: [
    {
      paymentMethod: "cash",
      category: "cash",
      tenderAmount: "40.00",
      transactionCount: 2,
      checkCount: 2,
      averageCheck: "20.00",
      mixPercent: "40.00",
    },
    {
      paymentMethod: "mada",
      category: "card",
      tenderAmount: "30.00",
      transactionCount: 1,
      checkCount: 1,
      averageCheck: "30.00",
      mixPercent: "30.00",
    },
    {
      paymentMethod: "visa",
      category: "card",
      tenderAmount: "20.00",
      transactionCount: 1,
      checkCount: 1,
      averageCheck: "20.00",
      mixPercent: "20.00",
    },
  ],
} as unknown as PaymentMethodAnalyticsDto;

describe("buildExecutivePeriodDashboardVm", () => {
  it("exposes six operational cards for Today in fixed order", () => {
    const vm = buildExecutivePeriodDashboardVm({
      scope: "today",
      language: "en",
      business,
      payment,
      orderCount: 12,
      formatMoney: (a) => a,
    });
    expect(vm.primaryQuestion).toMatch(/today/i);
    expect(vm.cards.map((c) => c.id)).toEqual([
      "cashSales",
      "cardSales",
      "refundPublishedTotal",
      "taxCollected",
      "orderCount",
      "netRevenue",
    ]);
    expect(vm.cards[0]?.value).toBe("40.00");
    expect(vm.cards[1]?.value).toBe("50.00");
    expect(vm.cards[5]?.value).toBe("90.00");
    expect(vm.cards.find((c) => c.id === "orderCount")?.value).toBe("12");
  });

  it("This Month reuses the same card ids as Today", () => {
    const today = buildExecutivePeriodDashboardVm({
      scope: "today",
      language: "ar",
      business,
      payment,
      orderCount: 3,
      formatMoney: (a) => a,
    });
    const month = buildExecutivePeriodDashboardVm({
      scope: "month",
      language: "ar",
      business,
      payment,
      orderCount: 3,
      formatMoney: (a) => a,
    });
    expect(month.cards.map((c) => c.id)).toEqual(today.cards.map((c) => c.id));
    expect(month.title).toBe("هذا الشهر");
  });

  it("does not invent average or ratio cards", () => {
    const vm = buildExecutivePeriodDashboardVm({
      scope: "today",
      language: "en",
      business,
      payment,
      orderCount: 1,
      formatMoney: (a) => a,
    });
    expect(vm.cards.map((c) => c.id)).not.toContain("averageOrder");
    expect(vm.cards.map((c) => c.id)).not.toContain("averageCheck");
    expect(vm.cards.map((c) => c.id)).not.toContain("refundRate");
  });
});
