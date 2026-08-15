import { describe, expect, it } from "vitest";
import {
  computeChurnRate,
  computeRenewalRate,
  subscriptionContributesToCommercialRevenue,
} from "./adminKpiCalculations";

describe("admin KPI calculations (ADMIN-KPI-FIX-1, LAUNCH-5B)", () => {
  describe("subscriptionContributesToCommercialRevenue", () => {
    it("includes active only", () => {
      expect(subscriptionContributesToCommercialRevenue("active")).toBe(true);
      expect(subscriptionContributesToCommercialRevenue("trial")).toBe(false);
      expect(subscriptionContributesToCommercialRevenue("expired")).toBe(false);
      expect(subscriptionContributesToCommercialRevenue("canceled")).toBe(false);
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
