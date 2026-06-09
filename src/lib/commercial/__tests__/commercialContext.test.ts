import { describe, expect, it } from "vitest";
import {
  buildCommercialContext,
  commercialContextToResolverInput,
} from "../commercialContext";
import { getCommercialEntitlementsFromContext } from "../getCommercialEntitlements";

const FIXED_NOW = new Date("2026-06-01T12:00:00.000Z");

function isoPlusDays(days: number): string {
  return new Date(FIXED_NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function isoMinusDays(days: number): string {
  return new Date(FIXED_NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("buildCommercialContext", () => {
  it("builds admin context from subscription row when present", () => {
    const context = buildCommercialContext({
      ownerId: 1,
      role: "admin",
      subscriptionRow: {
        planId: 30001,
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: isoPlusDays(30),
      },
      now: FIXED_NOW,
    });

    expect(context.ownerId).toBe(1);
    expect(context.role).toBe("admin");
    expect(context.subscription?.catalogPlan).toBe("BASIC");
  });

  it("builds NONE context when subscription row is absent", () => {
    const context = buildCommercialContext({
      ownerId: 2,
      role: "user",
      subscriptionRow: null,
      now: FIXED_NOW,
    });

    expect(context.subscription).toBeNull();
    expect(context.role).toBe("user");
  });

  it("builds NONE context for unknown planId", () => {
    const context = buildCommercialContext({
      ownerId: 3,
      role: "user",
      subscriptionRow: {
        planId: 99999,
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: isoPlusDays(30),
      },
      now: FIXED_NOW,
    });

    expect(context.subscription).toBeNull();
  });
});

describe("getCommercialEntitlementsFromContext", () => {
  it("resolves active BASIC subscription", () => {
    const context = buildCommercialContext({
      ownerId: 10,
      role: "user",
      subscriptionRow: {
        planId: 30001,
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: isoPlusDays(30),
      },
      now: FIXED_NOW,
    });

    const { entitlements } = getCommercialEntitlementsFromContext(context);

    expect(entitlements.plan).toBe("BASIC");
    expect(entitlements.accountType).toBe("PAYING");
    expect(entitlements.features.ordering).toBe(false);
    expect(entitlements.features.templates).toBe(true);
    expect(entitlements.limits).toEqual({
      restaurants: 1,
      categories: 10,
      items: 100,
    });
  });

  it("resolves trial account as TRIAL with Professional features", () => {
    const context = buildCommercialContext({
      ownerId: 11,
      role: "user",
      subscriptionRow: {
        planId: 30002,
        status: "trial",
        trialEndsAt: isoPlusDays(7),
        currentPeriodEnd: isoPlusDays(7),
      },
      now: FIXED_NOW,
    });

    const { entitlements } = getCommercialEntitlementsFromContext(context);

    expect(entitlements.plan).toBe("TRIAL");
    expect(entitlements.accountType).toBe("TRIAL");
    expect(entitlements.commercial.isTrial).toBe(true);
    expect(entitlements.commercial.countsInRevenue).toBe(false);
    expect(entitlements.features.ordering).toBe(true);
  });

  it("resolves enterprise account with null unlimited limits", () => {
    const context = buildCommercialContext({
      ownerId: 12,
      role: "user",
      subscriptionRow: {
        planId: 30003,
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: isoPlusDays(30),
      },
      now: FIXED_NOW,
    });

    const { entitlements } = getCommercialEntitlementsFromContext(context);

    expect(entitlements.plan).toBe("ENTERPRISE");
    expect(entitlements.commercial.isEnterprise).toBe(true);
    expect(entitlements.limits.restaurants).toBeNull();
    expect(entitlements.limits.categories).toBeNull();
    expect(entitlements.limits.items).toBeNull();
  });

  it("resolves admin without subscription as NONE (ADMIN-AUTH-1C)", () => {
    const context = buildCommercialContext({
      ownerId: 13,
      role: "admin",
      subscriptionRow: null,
      now: FIXED_NOW,
    });

    const { entitlements } = getCommercialEntitlementsFromContext(context);

    expect(entitlements.plan).toBe("NONE");
    expect(entitlements.commercial.isAdmin).toBe(false);
    expect(entitlements.commercial.countsInMrr).toBe(false);
    expect(entitlements.commercial.isPaid).toBe(false);
  });

  it("resolves expired active subscription as NONE", () => {
    const context = buildCommercialContext({
      ownerId: 14,
      role: "user",
      subscriptionRow: {
        planId: 30002,
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: isoMinusDays(1),
      },
      now: FIXED_NOW,
    });

    const { entitlements } = getCommercialEntitlementsFromContext(context);

    expect(entitlements.plan).toBe("NONE");
    expect(entitlements.accountType).toBe("NONE");
    expect(entitlements.status).toBe("active");
    expect(entitlements.limits.restaurants).toBe(0);
  });

  it("resolves expired trial as NONE", () => {
    const context = buildCommercialContext({
      ownerId: 15,
      role: "user",
      subscriptionRow: {
        planId: 30002,
        status: "trial",
        trialEndsAt: isoMinusDays(1),
        currentPeriodEnd: isoMinusDays(1),
      },
      now: FIXED_NOW,
    });

    const { entitlements } = getCommercialEntitlementsFromContext(context);

    expect(entitlements.plan).toBe("NONE");
    expect(entitlements.status).toBe("trial");
  });

  it("resolves canceled subscription as NONE", () => {
    const context = buildCommercialContext({
      ownerId: 16,
      role: "user",
      subscriptionRow: {
        planId: 30002,
        status: "canceled",
        trialEndsAt: null,
        currentPeriodEnd: isoPlusDays(30),
      },
      now: FIXED_NOW,
    });

    const { entitlements } = getCommercialEntitlementsFromContext(context);

    expect(entitlements.plan).toBe("NONE");
    expect(entitlements.status).toBe("canceled");
  });
});

describe("commercialContextToResolverInput", () => {
  it("maps context fields to resolver input", () => {
    const context = buildCommercialContext({
      ownerId: 20,
      role: "user",
      subscriptionRow: {
        planId: 30002,
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: isoPlusDays(30),
      },
      now: FIXED_NOW,
    });

    expect(commercialContextToResolverInput(context)).toEqual({
      ownerId: 20,
      role: "user",
      subscription: {
        catalogPlan: "PROFESSIONAL",
        status: "active",
        trialEndsAt: null,
        currentPeriodEnd: isoPlusDays(30),
      },
      now: FIXED_NOW,
    });
  });
});
