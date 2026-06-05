import { describe, expect, it } from "vitest";
import {
  computeAdminMrr,
  computeChurnRate,
  computeRenewalRate,
  subscriptionContributesToCommercialRevenue,
} from "./adminKpiCalculations";

const plans = [
  { id: 1, priceMonthly: "19", priceYearly: "175" },
  { id: 2, priceMonthly: "35", priceYearly: "299" },
];

describe("admin KPI calculations (ADMIN-KPI-FIX-1, LAUNCH-5B)", () => {
  describe("subscriptionContributesToCommercialRevenue", () => {
    it("includes active only", () => {
      expect(subscriptionContributesToCommercialRevenue("active")).toBe(true);
      expect(subscriptionContributesToCommercialRevenue("trial")).toBe(false);
      expect(subscriptionContributesToCommercialRevenue("expired")).toBe(false);
      expect(subscriptionContributesToCommercialRevenue("canceled")).toBe(false);
    });
  });

  describe("computeAdminMrr", () => {
    it("returns 0 when only trial subscriptions exist", () => {
      const mrr = computeAdminMrr(
        [
          { status: "trial", planId: 2, billingCycle: "monthly" },
          { status: "trial", planId: 2, billingCycle: "monthly" },
        ],
        plans
      );
      expect(mrr).toBe(0);
    });

    it("sums monthly plan prices for active subscriptions only", () => {
      const mrr = computeAdminMrr(
        [
          { status: "active", planId: 2, billingCycle: "monthly" },
          { status: "trial", planId: 2, billingCycle: "monthly" },
          { status: "active", planId: 1, billingCycle: "monthly" },
        ],
        plans
      );
      expect(mrr).toBe(54);
    });

    it("normalizes yearly billing to monthly equivalent", () => {
      const mrr = computeAdminMrr(
        [{ status: "active", planId: 2, billingCycle: "yearly" }],
        plans
      );
      expect(mrr).toBe(Math.round((299 / 12) * 100) / 100);
    });
  });

  describe("computeRenewalRate", () => {
    it("does not double-count trials", () => {
      const rate = computeRenewalRate(10, 6);
      expect(rate).toBe(60);
    });

    it("returns 0 when there are no subscriptions", () => {
      expect(computeRenewalRate(0, 0)).toBe(0);
    });
  });

  describe("computeChurnRate", () => {
    it("computes canceled + expired share", () => {
      expect(computeChurnRate(10, 1, 1)).toBe(20);
    });
  });
});
