/**
 * COMMERCIAL-MRR-CHARGED-TERMS-MIGRATION-1
 * Canonical MRR must not reintroduce subscription_plans.price or Live Plan catalog price.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("canonical MRR Charged Terms architecture guards", () => {
  it("CanonicalMetricsService does not read subscription_plans or catalog prices", () => {
    const cms = read("server/commercial/metrics/CanonicalMetricsService.ts");
    expect(cms).not.toContain("getSubscriptionPlans");
    expect(cms).not.toContain("getSubscriptionPlanById");
    expect(cms).not.toContain("monthlyEquivalentPlanPrice");
    expect(cms).not.toContain("priceMonthly");
    expect(cms).not.toContain("priceYearly");
    expect(cms).not.toContain("subscription_plans");
    expect(cms).not.toContain("planService");
    expect(cms).not.toContain("resolveLivePlanCapabilities");
    expect(cms).not.toContain("currentPriceForPlan");
    expect(cms).toContain("loadChargedTerms");
    expect(cms).toContain("computeMrrFromChargedTerms");
  });

  it("Charged Terms MRR source does not fall back to catalog or legacy prices", () => {
    const source = read("server/commercial/metrics/chargedTermsMrr.ts");
    expect(source).not.toContain("getSubscriptionPlan");
    expect(source).not.toContain("priceMonthly");
    expect(source).not.toContain("priceYearly");
    expect(source).not.toContain("subscription_plans");
    expect(source).not.toContain("planService");
    expect(source).not.toContain("resolveLivePlan");
    expect(source).not.toContain("currentPriceForPlan");
    expect(source).not.toContain("commercial_plans");
    expect(source).not.toContain("grandTotal");
    expect(source).toContain("chargedAmount");
    expect(source).toContain("commercialSubscriptionBindings");
  });
});
