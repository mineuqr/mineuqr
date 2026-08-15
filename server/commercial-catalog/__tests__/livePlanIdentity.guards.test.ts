/**
 * COMMERCIAL-LIVE-PLAN-IDENTITY-CONSOLIDATION-1
 * Authority guards. Integer compatibility may remain; it must not be commercial law.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("GUARD-IDENTITY Live Plan canonical identity", () => {
  it("GUARD-IDENTITY-01 Live Plan table uses UUID PK + unique code", () => {
    const schema = read("server/db/schema/commercial/tables.ts");
    expect(schema).toContain('export const commercialPlans = mysqlTable(');
    expect(schema).toContain("id: varchar({ length: 36 }).primaryKey()");
    expect(schema).toContain('uniqueIndex("commercial_plans_code_uq")');
    const subs = read("drizzle/schema.ts");
    expect(subs).toMatch(/export const userSubscriptions = mysqlTable\("user_subscriptions"/);
    expect(subs).toContain("planId: varchar({ length: 36 }).notNull()");
  });

  it("GUARD-IDENTITY-02 subscription_plans.id cannot determine checkout or MRR", () => {
    const checkout = read("server/services/commercial-catalog/adoptionService.ts");
    const offerFn = checkout.slice(
      checkout.indexOf("export async function resolveCheckoutOfferFromLivePlan")
    );
    expect(offerFn).toContain("currentPriceForPlan");
    expect(offerFn).not.toContain("getSubscriptionPlanById");
    const cms = read("server/commercial/metrics/CanonicalMetricsService.ts");
    expect(cms).not.toContain("getSubscriptionPlanById");
    expect(cms).toContain("computeMrrFromChargedTerms");
  });

  it("GUARD-IDENTITY-03 legacyPlanId cannot determine checkout price", () => {
    const offer = read("server/services/commercial-catalog/adoptionService.ts");
    const fn = offer.slice(
      offer.indexOf("export async function resolveCheckoutOfferFromLivePlan")
    );
    expect(fn).toContain("currentPriceForPlan");
    expect(fn).not.toContain("getSubscriptionPlanById");
    expect(fn).not.toContain("legacyPlanId");
    expect(fn).not.toContain("priceMonthly");
  });

  it("GUARD-IDENTITY-04/05 entitlements resolve from Live Plan, not legacy price/limits columns", () => {
    const resolver = read("server/subscription-runtime/entitlementResolver.ts");
    expect(resolver).toContain("resolveEntitlementsFromLivePlan");
    expect(resolver).not.toContain("priceMonthly");
    expect(resolver).not.toContain("maxRestaurants");
    const limits = read("server/subscriptionPlanLimits.ts");
    expect(limits).toContain("resolveOwnerEntitlements");
    expect(limits).not.toContain("SelectSubscriptionPlan");
  });

  it("GUARD-IDENTITY-06 MRR does not use legacyPlanId or subscription_plans", () => {
    const mrr = read("server/commercial/metrics/chargedTermsMrr.ts");
    expect(mrr).toContain("chargedAmount");
    expect(mrr).not.toContain("legacyPlanId");
    expect(mrr).not.toContain("priceMonthly");
  });

  it("GUARD-IDENTITY-07 no third internal plan table", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).not.toMatch(/mysqlTable\(["']subscription_plans_v2/);
    expect(schema).not.toMatch(/mysqlTable\(["']legacyLivePlan/);
    expect(schema).not.toMatch(/mysqlTable\(["']planIdentityBridge/);
  });
});
