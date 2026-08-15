/**
 * COMMERCIAL-OD-3-PUBLIC-API-UUID-CUTOVER-1
 * Public/admin/checkout contracts must use Live Plan UUID, not integer planId.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("OD-3 public API UUID cutover guards", () => {
  it("checkout and admin routers accept livePlanUuidInput, not z.number() planId", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("livePlanUuidInput");
    const checkout = routers.slice(
      routers.indexOf("createCheckoutSession:"),
      routers.indexOf("createTapCheckout:")
    );
    expect(checkout).toContain("livePlanUuidInput");
    expect(checkout).not.toContain("planId: z.number()");
    const tap = routers.slice(
      routers.indexOf("createTapCheckout:"),
      routers.indexOf("const invoiceRouter")
    );
    expect(tap).toContain("livePlanUuidInput");
    expect(tap).not.toContain("planId: z.number()");
    expect(routers).toContain("createUserSubscriptionByAdmin");
    const adminCreate = routers.slice(
      routers.indexOf("createUserSubscriptionByAdmin:"),
      routers.indexOf("updateUserSubscriptionByAdmin:")
    );
    expect(adminCreate).toContain("livePlanUuidInput");
    expect(adminCreate).not.toContain("planId: z.number()");
  });

  it("new PayPal checkout writes UUID planId", () => {
    const paypal = read("server/paypal.ts");
    expect(paypal).toContain("planId: string");
    expect(paypal).not.toMatch(/planId:\s*number/);
  });

  it("trial ingress does not fall back to integer 30002", () => {
    const trial = read("server/create-trial-subscription.ts");
    expect(trial).not.toContain("resolveCanonicalLivePlanId(30002)");
    expect(trial).toContain("trial_plan_unresolved");
  });

  it("Pricing checkout uses offering.planId, not legacyPlanId", () => {
    const pricing = read("client/src/pages/Pricing.tsx");
    expect(pricing).toContain("const checkoutPlanId = offering.planId");
    expect(pricing).not.toContain("planId={legacyPlanId}");
    expect(pricing).not.toContain("planId: number");
  });

  it("Customer Success does not parseInt plan identity", () => {
    const cs = read(
      "client/src/components/admin/domains/customer-success/CustomerSuccessAccountsSection.tsx"
    );
    expect(cs).not.toContain("parseInt(subPlanId)");
    expect(cs).toContain("id: o.planId");
  });

  it("does not reintroduce subscription_plans fallback on cutover paths", () => {
    const checkout = read("server/services/commercial-catalog/adoptionService.ts");
    const offer = checkout.slice(
      checkout.indexOf("export async function resolveCheckoutOfferFromLivePlan")
    );
    expect(offer).not.toContain("getSubscriptionPlanById");
    expect(read("server/paypal-webhook.ts")).not.toContain("getSubscriptionPlanById");
    expect(read("server/tap-webhook.ts")).not.toContain("getSubscriptionPlanById");
    expect(read("server/create-trial-subscription.ts")).not.toContain(
      "getSubscriptionPlans"
    );
  });

  it("does not drop leftover bridges or leftover table", () => {
    expect(read("server/services/commercial-catalog/legacyPlanBridge.ts")).toContain(
      "export const LEGACY_PLAN_BRIDGE"
    );
    expect(read("src/lib/commercial/planIdMapping.ts")).toContain(
      "PLAN_ID_TO_CATALOG_PLAN"
    );
    expect(read("server/db/schema/commercial/bindings.ts")).toContain("legacyPlanId");
    expect(read("drizzle/schema.ts")).toContain('mysqlTable("subscription_plans"');
  });
});
