import { describe, expect, it } from "vitest";
import {
  computeMrrFromChargedTerms,
  monthlyEquivalentFromChargedTerms,
  normalizeMrrBillingCycle,
} from "./chargedTermsMrr";

describe("chargedTermsMrr pure rules", () => {
  it("normalizes only monthly and yearly cycles", () => {
    expect(normalizeMrrBillingCycle("monthly")).toBe("monthly");
    expect(normalizeMrrBillingCycle("month")).toBe("monthly");
    expect(normalizeMrrBillingCycle("yearly")).toBe("yearly");
    expect(normalizeMrrBillingCycle("year")).toBe("yearly");
    expect(normalizeMrrBillingCycle("weekly")).toBeNull();
    expect(normalizeMrrBillingCycle(null)).toBeNull();
  });

  it("monthly Charged Terms equal MRR", () => {
    expect(
      monthlyEquivalentFromChargedTerms("35.00", "USD", "monthly", null)
    ).toEqual({ value: 35, classification: "INCLUDED" });
  });

  it("yearly Charged Terms divide by 12", () => {
    expect(
      monthlyEquivalentFromChargedTerms("120.00", "USD", "yearly", null)
    ).toEqual({ value: 10, classification: "INCLUDED" });
  });

  it("uses subscription billing cycle only when Charged Terms cycle is absent", () => {
    expect(
      monthlyEquivalentFromChargedTerms("120.00", "USD", null, "yearly")
    ).toEqual({ value: 10, classification: "INCLUDED" });
  });

  it("does not invent a cycle when both sources are missing", () => {
    expect(
      monthlyEquivalentFromChargedTerms("35.00", "USD", null, null)
    ).toEqual({ value: 0, classification: "UNSUPPORTED_BILLING_CYCLE" });
  });

  it("does not convert non-USD Charged Terms", () => {
    expect(
      monthlyEquivalentFromChargedTerms("35.00", "SAR", "monthly", null)
    ).toEqual({ value: 0, classification: "UNSUPPORTED_CURRENCY" });
  });

  it("classifies missing amount as incomplete — no catalog substitute", () => {
    expect(
      monthlyEquivalentFromChargedTerms(null, "USD", "monthly", null)
    ).toEqual({ value: 0, classification: "INCOMPLETE_CHARGED_TERMS" });
  });

  it("classifies zero amount as zero-value", () => {
    expect(
      monthlyEquivalentFromChargedTerms("0.00", "USD", "monthly", null)
    ).toEqual({ value: 0, classification: "ZERO_VALUE" });
  });

  it("sums only countsInMrr owners with Charged Terms", () => {
    const mrr = computeMrrFromChargedTerms(
      [
        { subscriptionId: 1, billingCycle: "monthly", commercialStatus: { countsInMrr: true } },
        { subscriptionId: 2, billingCycle: "yearly", commercialStatus: { countsInMrr: true } },
        { subscriptionId: 3, billingCycle: "monthly", commercialStatus: { countsInMrr: false } },
        { subscriptionId: 4, billingCycle: "monthly", commercialStatus: { countsInMrr: true } },
      ],
      new Map([
        [1, { subscriptionId: 1, chargedAmount: "35.00", chargedCurrency: "USD", billingCycleCode: "monthly" }],
        [2, { subscriptionId: 2, chargedAmount: "120.00", chargedCurrency: "USD", billingCycleCode: "yearly" }],
        [3, { subscriptionId: 3, chargedAmount: "99.00", chargedCurrency: "USD", billingCycleCode: "monthly" }],
      ])
    );
    expect(mrr).toBe(45);
  });

  it("sums distinct Charged Terms for the same Live Plan (A=$10, B=$9) and ARR is MRR×12", () => {
    const mrr = computeMrrFromChargedTerms(
      [
        { subscriptionId: 1, billingCycle: "monthly", commercialStatus: { countsInMrr: true } },
        { subscriptionId: 2, billingCycle: "monthly", commercialStatus: { countsInMrr: true } },
        { subscriptionId: 3, billingCycle: "yearly", commercialStatus: { countsInMrr: true } },
      ],
      new Map([
        [1, { subscriptionId: 1, chargedAmount: "10.00", chargedCurrency: "USD", billingCycleCode: "monthly" }],
        [2, { subscriptionId: 2, chargedAmount: "9.00", chargedCurrency: "USD", billingCycleCode: "monthly" }],
        [3, { subscriptionId: 3, chargedAmount: "120.00", chargedCurrency: "USD", billingCycleCode: "yearly" }],
      ])
    );
    expect(mrr).toBe(29);
    expect(Math.round(mrr * 12 * 100) / 100).toBe(348);
  });
});
