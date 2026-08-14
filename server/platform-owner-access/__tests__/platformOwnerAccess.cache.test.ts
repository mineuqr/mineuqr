/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1 — cache isolation.
 */
import { describe, expect, it } from "vitest";
import {
  entitlementCacheKey,
  getCachedEntitlements,
  invalidateEntitlementCache,
  setCachedEntitlements,
} from "../../subscription-runtime/cache";
import type { CommercialEntitlementsResult } from "@commercial/getCommercialEntitlements";

const NOW = new Date("2026-08-15T12:00:00.000Z");

function stub(source: string): CommercialEntitlementsResult {
  return {
    context: { ownerId: 1, role: "admin", subscription: null, now: NOW },
    entitlements: {
      accountType: "NONE",
      plan: "NONE",
      status: null,
      limits: { restaurants: 0, categories: 0, items: 0 },
      features: {} as CommercialEntitlementsResult["entitlements"]["features"],
      commercial: {
        isTrial: false,
        isPaid: false,
        isEnterprise: false,
        isAdmin: false,
        countsInMrr: false,
        countsInRevenue: false,
        invoiceEligible: false,
      },
    },
    meta: { commercialResolutionSource: source },
  };
}

describe("owner entitlement cache isolation", () => {
  it("separates owner modes from customer keys", () => {
    const ownerFull = entitlementCacheKey(1, NOW.getTime(), {
      kind: "platform_owner",
      mode: "FULL_PLATFORM",
      simulatedPlanCode: null,
    });
    const ownerPro = entitlementCacheKey(1, NOW.getTime(), {
      kind: "platform_owner",
      mode: "SIMULATED_PLAN",
      simulatedPlanCode: "professional",
    });
    const customer = entitlementCacheKey(1, NOW.getTime(), { kind: "customer" });
    const customerOther = entitlementCacheKey(9, NOW.getTime(), { kind: "customer" });

    expect(ownerFull).not.toBe(ownerPro);
    expect(ownerFull).not.toBe(customer);
    expect(ownerPro).not.toBe(customer);
    expect(customer).not.toBe(customerOther);
    expect(ownerFull).toContain("platform_owner");
    expect(customer).toContain("customer");
  });

  it("invalidates only the targeted owner", () => {
    setCachedEntitlements(1, stub("owner"), NOW, 60_000, {
      kind: "platform_owner",
      mode: "FULL_PLATFORM",
    });
    setCachedEntitlements(9, stub("customer"), NOW, 60_000, { kind: "customer" });

    expect(
      getCachedEntitlements(1, NOW, { kind: "platform_owner", mode: "FULL_PLATFORM" })
    ).not.toBeNull();
    expect(getCachedEntitlements(9, NOW, { kind: "customer" })).not.toBeNull();

    invalidateEntitlementCache(1);

    expect(
      getCachedEntitlements(1, NOW, { kind: "platform_owner", mode: "FULL_PLATFORM" })
    ).toBeNull();
    expect(getCachedEntitlements(9, NOW, { kind: "customer" })).not.toBeNull();
    invalidateEntitlementCache(9);
  });
});
