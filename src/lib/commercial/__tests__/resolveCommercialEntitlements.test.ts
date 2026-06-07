import { describe, expect, it } from "vitest";
import { FEATURE_KEYS } from "../featureKeys";
import { PLAN_LIMITS } from "../planFeatureMatrix";
import { resolveCommercialEntitlements } from "../resolveCommercialEntitlements";

const FIXED_NOW = new Date("2026-06-01T12:00:00.000Z");

function isoPlusDays(days: number): string {
  return new Date(FIXED_NOW.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
}

function isoMinusDays(days: number): string {
  return new Date(FIXED_NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
}

describe("resolveCommercialEntitlements", () => {
  describe("ADMIN", () => {
    const entitlements = resolveCommercialEntitlements({
      ownerId: 1,
      role: "admin",
      now: FIXED_NOW,
    });

    it("resolves ADMIN plan and account type", () => {
      expect(entitlements.plan).toBe("ADMIN");
      expect(entitlements.accountType).toBe("ADMIN");
      expect(entitlements.status).toBeNull();
    });

    it("sets admin commercial flags", () => {
      expect(entitlements.commercial).toEqual({
        isTrial: false,
        isPaid: false,
        isEnterprise: false,
        isAdmin: true,
        countsInMrr: false,
        countsInRevenue: false,
        invoiceEligible: false,
      });
    });

    it("uses null unlimited limits", () => {
      expect(entitlements.limits).toEqual({
        restaurants: null,
        categories: null,
        items: null,
      });
    });

    it("enables all features", () => {
      for (const key of FEATURE_KEYS) {
        expect(entitlements.features[key]).toBe(true);
      }
    });

    it("ignores subscription when role is admin", () => {
      const withSub = resolveCommercialEntitlements({
        ownerId: 1,
        role: "admin",
        subscription: {
          catalogPlan: "BASIC",
          status: "active",
          currentPeriodEnd: isoPlusDays(30),
        },
        now: FIXED_NOW,
      });
      expect(withSub.plan).toBe("ADMIN");
      expect(withSub.commercial.isAdmin).toBe(true);
    });
  });

  describe("NONE", () => {
    it("resolves NONE when no subscription", () => {
      const entitlements = resolveCommercialEntitlements({
        ownerId: 2,
        now: FIXED_NOW,
      });
      expect(entitlements.plan).toBe("NONE");
      expect(entitlements.accountType).toBe("NONE");
      expect(entitlements.commercial.isPaid).toBe(false);
      expect(entitlements.commercial.isTrial).toBe(false);
    });

    it("uses zero limits", () => {
      const entitlements = resolveCommercialEntitlements({
        ownerId: 2,
        now: FIXED_NOW,
      });
      expect(entitlements.limits).toEqual(PLAN_LIMITS.NONE);
    });

    it("allows public guest read features only", () => {
      const entitlements = resolveCommercialEntitlements({
        ownerId: 2,
        now: FIXED_NOW,
      });
      expect(entitlements.features.qrMenu).toBe(true);
      expect(entitlements.features.search).toBe(true);
      expect(entitlements.features.ordering).toBe(false);
      expect(entitlements.features.templates).toBe(false);
      expect(entitlements.features.categories).toBe(false);
    });

    it("resolves NONE for canceled subscription", () => {
      const entitlements = resolveCommercialEntitlements({
        ownerId: 2,
        subscription: {
          catalogPlan: "PROFESSIONAL",
          status: "canceled",
          currentPeriodEnd: isoPlusDays(10),
        },
        now: FIXED_NOW,
      });
      expect(entitlements.plan).toBe("NONE");
      expect(entitlements.status).toBe("canceled");
    });

    it("resolves NONE for expired paid period", () => {
      const entitlements = resolveCommercialEntitlements({
        ownerId: 2,
        subscription: {
          catalogPlan: "PROFESSIONAL",
          status: "active",
          currentPeriodEnd: isoMinusDays(1),
        },
        now: FIXED_NOW,
      });
      expect(entitlements.plan).toBe("NONE");
      expect(entitlements.status).toBe("active");
    });
  });

  describe("TRIAL", () => {
    const entitlements = resolveCommercialEntitlements({
      ownerId: 3,
      subscription: {
        catalogPlan: "PROFESSIONAL",
        status: "trial",
        trialEndsAt: isoPlusDays(7),
        currentPeriodEnd: isoPlusDays(7),
      },
      now: FIXED_NOW,
    });

    it("resolves TRIAL plan and account type", () => {
      expect(entitlements.plan).toBe("TRIAL");
      expect(entitlements.accountType).toBe("TRIAL");
      expect(entitlements.status).toBe("trial");
    });

    it("sets trial commercial flags without revenue participation", () => {
      expect(entitlements.commercial.isTrial).toBe(true);
      expect(entitlements.commercial.isPaid).toBe(false);
      expect(entitlements.commercial.isEnterprise).toBe(false);
      expect(entitlements.commercial.isAdmin).toBe(false);
      expect(entitlements.commercial.countsInMrr).toBe(false);
      expect(entitlements.commercial.countsInRevenue).toBe(false);
      expect(entitlements.commercial.invoiceEligible).toBe(false);
    });

    it("mirrors Professional limits", () => {
      expect(entitlements.limits).toEqual(PLAN_LIMITS.PROFESSIONAL);
    });

    it("mirrors Professional features including ordering stack", () => {
      expect(entitlements.features.ordering).toBe(true);
      expect(entitlements.features.cart).toBe(true);
      expect(entitlements.features.checkout).toBe(true);
      expect(entitlements.features.reports).toBe(true);
      expect(entitlements.features.excelExport).toBe(true);
      expect(entitlements.features.customColors).toBe(true);
    });

    it("treats expired trial as NONE for entitlements", () => {
      const expired = resolveCommercialEntitlements({
        ownerId: 3,
        subscription: {
          catalogPlan: "PROFESSIONAL",
          status: "trial",
          trialEndsAt: isoMinusDays(1),
          currentPeriodEnd: isoMinusDays(1),
        },
        now: FIXED_NOW,
      });
      expect(expired.plan).toBe("NONE");
      expect(expired.accountType).toBe("NONE");
      expect(expired.commercial.isTrial).toBe(false);
      expect(expired.status).toBe("trial");
    });
  });

  describe("BASIC", () => {
    const entitlements = resolveCommercialEntitlements({
      ownerId: 4,
      subscription: {
        catalogPlan: "BASIC",
        status: "active",
        currentPeriodEnd: isoPlusDays(30),
      },
      now: FIXED_NOW,
    });

    it("resolves BASIC as PAYING", () => {
      expect(entitlements.plan).toBe("BASIC");
      expect(entitlements.accountType).toBe("PAYING");
      expect(entitlements.status).toBe("active");
    });

    it("sets paid commercial flags with revenue participation", () => {
      expect(entitlements.commercial).toEqual({
        isTrial: false,
        isPaid: true,
        isEnterprise: false,
        isAdmin: false,
        countsInMrr: true,
        countsInRevenue: true,
        invoiceEligible: true,
      });
    });

    it("enforces Basic limits", () => {
      expect(entitlements.limits).toEqual({
        restaurants: 1,
        categories: 10,
        items: 100,
      });
    });

    it("disables ordering stack and customization", () => {
      expect(entitlements.features.ordering).toBe(false);
      expect(entitlements.features.cart).toBe(false);
      expect(entitlements.features.reports).toBe(false);
      expect(entitlements.features.customColors).toBe(false);
      expect(entitlements.features.customFonts).toBe(false);
    });

    it("enables menu foundation features", () => {
      expect(entitlements.features.qrMenu).toBe(true);
      expect(entitlements.features.categories).toBe(true);
      expect(entitlements.features.templates).toBe(true);
    });
  });

  describe("PROFESSIONAL", () => {
    const entitlements = resolveCommercialEntitlements({
      ownerId: 5,
      subscription: {
        catalogPlan: "PROFESSIONAL",
        status: "active",
        currentPeriodEnd: isoPlusDays(30),
      },
      now: FIXED_NOW,
    });

    it("resolves PROFESSIONAL as PAYING", () => {
      expect(entitlements.plan).toBe("PROFESSIONAL");
      expect(entitlements.accountType).toBe("PAYING");
    });

    it("sets paid flags without enterprise", () => {
      expect(entitlements.commercial.isPaid).toBe(true);
      expect(entitlements.commercial.isEnterprise).toBe(false);
      expect(entitlements.commercial.countsInMrr).toBe(true);
    });

    it("enforces Professional limits", () => {
      expect(entitlements.limits).toEqual({
        restaurants: 5,
        categories: 25,
        items: 500,
      });
    });

    it("enables full operational feature set", () => {
      expect(entitlements.features.ordering).toBe(true);
      expect(entitlements.features.hotelMode).toBe(true);
      expect(entitlements.features.roomQr).toBe(true);
      expect(entitlements.features.dynamicServiceCatalog).toBe(true);
    });
  });

  describe("ENTERPRISE", () => {
    const entitlements = resolveCommercialEntitlements({
      ownerId: 6,
      subscription: {
        catalogPlan: "ENTERPRISE",
        status: "active",
        currentPeriodEnd: isoPlusDays(30),
      },
      now: FIXED_NOW,
    });

    it("resolves ENTERPRISE as PAYING", () => {
      expect(entitlements.plan).toBe("ENTERPRISE");
      expect(entitlements.accountType).toBe("PAYING");
    });

    it("sets enterprise flag", () => {
      expect(entitlements.commercial.isPaid).toBe(true);
      expect(entitlements.commercial.isEnterprise).toBe(true);
    });

    it("uses null unlimited limits (not magic numbers)", () => {
      expect(entitlements.limits.restaurants).toBeNull();
      expect(entitlements.limits.categories).toBeNull();
      expect(entitlements.limits.items).toBeNull();
      expect(entitlements.limits.restaurants).not.toBe(Infinity);
    });

    it("enables same features as Professional", () => {
      const professional = resolveCommercialEntitlements({
        ownerId: 5,
        subscription: {
          catalogPlan: "PROFESSIONAL",
          status: "active",
          currentPeriodEnd: isoPlusDays(30),
        },
        now: FIXED_NOW,
      });
      expect(entitlements.features).toEqual(professional.features);
    });
  });

  describe("matrix completeness", () => {
    it("returns every feature key in output", () => {
      const entitlements = resolveCommercialEntitlements({
        ownerId: 99,
        role: "admin",
        now: FIXED_NOW,
      });
      expect(Object.keys(entitlements.features).sort()).toEqual(
        [...FEATURE_KEYS].sort()
      );
    });
  });
});
