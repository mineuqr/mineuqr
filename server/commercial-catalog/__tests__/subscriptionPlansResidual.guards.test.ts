/**
 * COMMERCIAL-SUBSCRIPTION-PLANS-LEGACY-RESIDUAL-CLEANUP-1
 * Runtime commercial paths must not read the legacy plan table for
 * catalog price, MRR, capabilities, or limits.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("subscription_plans residual cleanup guards", () => {
  it("Checkout does not read legacy plan price", () => {
    const routers = read("server/routers.ts");
    const checkoutStart = routers.indexOf("createCheckoutSession:");
    const tapStart = routers.indexOf("createTapCheckout:");
    const checkoutBlock = routers.slice(checkoutStart, tapStart);
    expect(checkoutBlock).toContain("resolveCheckoutOfferFromLivePlan");
    expect(checkoutBlock).not.toContain("getSubscriptionPlanById");
  });

  it("canonical MRR does not read the legacy plan table", () => {
    const cms = read("server/commercial/metrics/CanonicalMetricsService.ts");
    expect(cms).not.toContain("getSubscriptionPlans");
    expect(cms).not.toContain("getSubscriptionPlanById");
    expect(cms).toContain("computeMrrFromChargedTerms");
  });

  it("CRS unbound display does not read the legacy plan table", () => {
    const crs = read("server/commercial/CommercialReadService.ts");
    expect(crs).not.toContain("getSubscriptionPlanById");
    expect(crs).toContain("resolveLivePlanDisplayByPlanRef");
  });

  it("trial identity fallback does not read the legacy plan table", () => {
    const trial = read("server/create-trial-subscription.ts");
    expect(trial).not.toContain("getSubscriptionPlans");
    expect(trial).toContain("resolveCanonicalLivePlanId");
  });

  it("payment webhooks do not read the legacy plan table", () => {
    expect(read("server/paypal-webhook.ts")).not.toContain("getSubscriptionPlanById");
    expect(read("server/tap-webhook.ts")).not.toContain("getSubscriptionPlanById");
  });

  it("admin invoice amount comes from Charged Terms", () => {
    const routers = read("server/routers.ts");
    const start = routers.indexOf("generateInvoicePDF:");
    const block = routers.slice(start, start + 3500);
    expect(block).toContain("getSubscriptionCommercialBinding");
    expect(block).toContain("chargedAmount");
    expect(block).not.toContain("getSubscriptionPlanById");
    expect(block).not.toContain("priceMonthly");
    expect(block).not.toContain("priceYearly");
  });

  it("deprecated admin statistics do not select the legacy plan table", () => {
    const db = read("server/db.ts");
    const start = db.indexOf("export async function getAdminStatistics");
    const end = db.indexOf("export async function getRevenueByMonth");
    const block = db.slice(start, end);
    expect(block).not.toContain("subscriptionPlans");
    expect(block).not.toContain("computeAdminMrr");
  });

  it("limits adapter does not type-depend on the legacy plan table", () => {
    const limits = read("server/subscriptionPlanLimits.ts");
    expect(limits).not.toContain("SelectSubscriptionPlan");
    expect(limits).toContain("resolveOwnerEntitlements");
  });

  it("does not introduce a third commercial plan table", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).not.toMatch(/mysqlTable\(["']subscription_plans_v2/);
    expect(schema).not.toMatch(/mysqlTable\(["']commercial_plans_legacy/);
  });
});
