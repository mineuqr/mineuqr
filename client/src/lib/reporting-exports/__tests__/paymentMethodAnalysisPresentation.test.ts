import { describe, expect, it } from "vitest";
import { MONETARY_PAYMENT_METHODS } from "@shared/operational-session";
import { SECTION_TERMINOLOGY } from "@shared/reporting-platform";
import type { PaymentMethodAnalyticsDto } from "@shared/reporting-platform";
import { buildPaymentMethodAnalysisViewModel } from "../paymentMethodAnalysisPresentation";

const sampleDto = {
  contractVersion: 1,
  contractId: "PaymentMethodAnalytics",
  programId: "REPORTING-PAYMENT-METHOD-ANALYTICS-1",
  generatedAt: "2026-07-16T00:00:00.000Z",
  restaurantId: 1,
  from: null,
  to: null,
  monetaryTenderTotal: "100.00",
  complimentaryAmount: "10.00",
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
      tenderAmount: "60.00",
      transactionCount: 2,
      checkCount: 2,
      averageCheck: "30.00",
      mixPercent: "60.00",
    },
  ],
} as PaymentMethodAnalyticsDto;

const PERIOD_SPECIFIC =
  /\b(daily|weekly|monthly|quarterly|annual|yearly|month|week|quarter|year)\b/i;

describe("REPORTING-PAYMENT-METHOD-PRESENTATION-ADOPTION-1", () => {
  it("expands full monetary catalog with Product Semantics labels", () => {
    const vm = buildPaymentMethodAnalysisViewModel({
      language: "en",
      analytics: sampleDto,
    });
    expect(vm.rows).toHaveLength(MONETARY_PAYMENT_METHODS.length);
    expect(vm.rows.map((r) => r.paymentMethod)).toEqual([
      ...MONETARY_PAYMENT_METHODS,
    ]);
    expect(vm.rows.find((r) => r.paymentMethod === "cash")?.label).toBe("Cash");
    expect(vm.rows.find((r) => r.paymentMethod === "visa")?.tenderAmount).toBe(
      "0.00"
    );
    expect(vm.complimentaryLabel).toBe("Complimentary");
    expect(vm.hasActivity).toBe(true);
  });

  it("does not recompute DTO mix or averages for active methods", () => {
    const vm = buildPaymentMethodAnalysisViewModel({
      language: "en",
      analytics: sampleDto,
    });
    const mada = vm.rows.find((r) => r.paymentMethod === "mada")!;
    expect(mada.mixPercent).toBe("60.00");
    expect(mada.averageCheck).toBe("30.00");
    expect(mada.checkCount).toBe(2);
  });

  it("empty / note copy is period-agnostic", () => {
    for (const lang of ["en", "ar"] as const) {
      expect(SECTION_TERMINOLOGY[lang].paymentAnalyticsEmpty).not.toMatch(
        PERIOD_SPECIFIC
      );
      expect(SECTION_TERMINOLOGY[lang].paymentAnalyticsNote).not.toMatch(
        PERIOD_SPECIFIC
      );
    }
    const empty = buildPaymentMethodAnalysisViewModel({
      language: "en",
      analytics: { ...sampleDto, buckets: [], monetaryTenderTotal: "0.00", complimentaryAmount: "0.00" },
    });
    expect(empty.hasActivity).toBe(false);
    expect(empty.emptyMessage).not.toMatch(PERIOD_SPECIFIC);
    expect(empty.rows).toHaveLength(MONETARY_PAYMENT_METHODS.length);
  });
});
