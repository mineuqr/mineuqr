import { describe, expect, it } from "vitest";
import { FEATURE_KEYS } from "../featureKeys";
import { COMMERCIAL_PLANS } from "../planTypes";
import {
  getCommercialFlagsForPlan,
  getFeaturesForPlan,
  getLimitsForPlan,
  PLAN_LIMITS,
} from "../planFeatureMatrix";

describe("planFeatureMatrix", () => {
  it("defines limits for every commercial plan", () => {
    for (const plan of COMMERCIAL_PLANS) {
      expect(PLAN_LIMITS[plan]).toBeDefined();
      expect(getLimitsForPlan(plan)).toEqual(PLAN_LIMITS[plan]);
    }
  });

  it("uses null for Enterprise and Admin unlimited caps only", () => {
    for (const plan of ["ENTERPRISE", "ADMIN"] as const) {
      expect(getLimitsForPlan(plan).restaurants).toBeNull();
      expect(getLimitsForPlan(plan).categories).toBeNull();
      expect(getLimitsForPlan(plan).items).toBeNull();
    }
  });

  it("defines features for every commercial plan", () => {
    for (const plan of COMMERCIAL_PLANS) {
      const features = getFeaturesForPlan(plan);
      for (const key of FEATURE_KEYS) {
        expect(typeof features[key]).toBe("boolean");
      }
    }
  });

  it("defines commercial flags for every commercial plan", () => {
    for (const plan of COMMERCIAL_PLANS) {
      const flags = getCommercialFlagsForPlan(plan);
      expect(typeof flags.isTrial).toBe("boolean");
      expect(typeof flags.isPaid).toBe("boolean");
      expect(typeof flags.isEnterprise).toBe("boolean");
      expect(typeof flags.isAdmin).toBe("boolean");
      expect(typeof flags.countsInMrr).toBe("boolean");
      expect(typeof flags.countsInRevenue).toBe("boolean");
      expect(typeof flags.invoiceEligible).toBe("boolean");
    }
  });

  it("Trial limits match Professional limits", () => {
    expect(PLAN_LIMITS.TRIAL).toEqual(PLAN_LIMITS.PROFESSIONAL);
  });
});
