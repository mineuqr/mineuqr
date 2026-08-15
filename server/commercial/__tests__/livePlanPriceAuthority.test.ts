/**
 * COMMERCIAL-CHARGED-TERMS-LIVE-PLAN-SOURCE-OF-TRUTH-1
 * Live Plan / commercial_prices is the only current price authority.
 * Charged Terms snapshots are immutable commitment facts.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { computeMrrFromChargedTerms } from "../metrics/chargedTermsMrr";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("Live Plan is the sole current commercial price authority", () => {
  it("Admin create/update resolve price from currentPriceForPlan, not Binding leftover", () => {
    const src = read("server/commercial/adminChargedTermsCompletion.ts");
    const resolveFn = src.slice(
      src.indexOf("export async function resolveChargedTermsForAdminCreate"),
      src.indexOf("export async function persistAdminCreateChargedTerms")
    );
    expect(resolveFn).toContain("pricingService.currentPriceForPlan(planId, input.billingCycleCode)");
    expect(resolveFn).not.toContain("getSubscriptionPlanById");
    expect(resolveFn).not.toContain("priceMonthly");
    expect(resolveFn).not.toContain("legacyPlanId");
    expect(resolveFn).not.toContain("chargedAmount: existing");
    expect(resolveFn).not.toContain("row.chargedAmount");
  });

  it("snapshot persist does not read Binding chargedAmount as the offer", () => {
    const src = read("server/commercial/chargedTermsSnapshots.ts");
    expect(src).not.toContain("commercialSubscriptionBindings.chargedAmount");
    expect(src).not.toContain("enrollment.chargedAmount");
    expect(src).toContain("input.offer.chargedAmount");
    expect(src).not.toContain("migration_0089");
  });

  it("catalog price writers do not insert Charged Terms snapshots", () => {
    const src = read("server/services/commercial-catalog/index.ts");
    const pricing = src.slice(src.indexOf("export class PricingService"));
    expect(pricing).not.toContain("insertImmutableChargedTermsSnapshot");
    expect(pricing).not.toContain("commercialSubscriptionChargedTerms");
  });

  it("webhook bind resolves current Live Plan price and does not overwrite snapshot on duplicate", () => {
    const bind = read("server/services/commercial-catalog/adoptionService.ts");
    const fn = bind.slice(
      bind.indexOf("function chargedTermsForPlan"),
      bind.indexOf("function auditEventForBind")
    );
    expect(fn).toContain("pricingService.currentPriceForPlan");
    expect(fn).not.toContain("priceMonthly");
    expect(fn).not.toContain("getSubscriptionPlanById");
  });

  it("0089 does not copy Binding or invent 780001", () => {
    const sql = read("drizzle/0089_commercial_charged_terms_snapshots.sql");
    expect(sql).toContain("CREATE TABLE `commercial_subscription_charged_terms`");
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toContain("780001");
    expect(sql).not.toMatch(/FROM\s+`commercial_subscription_bindings`/);
  });

  it("two commitments on the same plan keep independent snapshot MRR", () => {
    const mrr = computeMrrFromChargedTerms(
      [
        { subscriptionId: 1, billingCycle: "monthly", commercialStatus: { countsInMrr: true } },
        { subscriptionId: 2, billingCycle: "monthly", commercialStatus: { countsInMrr: true } },
      ],
      new Map([
        [1, { subscriptionId: 1, chargedAmount: "10.00", chargedCurrency: "USD", billingCycleCode: "monthly" }],
        [2, { subscriptionId: 2, chargedAmount: "9.00", chargedCurrency: "USD", billingCycleCode: "monthly" }],
      ])
    );
    expect(mrr).toBe(19);
    expect(Math.round(mrr * 12 * 100) / 100).toBe(228);
  });

  it("complimentary is not represented as chargedAmount = 0 in snapshot writers", () => {
    const src = read("server/commercial/chargedTermsSnapshots.ts");
    expect(src).not.toContain('chargedAmount: "0"');
    expect(src).not.toContain("chargedAmount: 0");
  });

  it("entitlements remain Live Plan based", () => {
    const hub = read("server/commercial/getCommercialEntitlements.ts");
    expect(hub).not.toContain("chargedAmount");
    expect(hub).not.toContain("commercialSubscriptionChargedTerms");
  });
});
