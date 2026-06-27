import { describe, expect, it } from "vitest";
import type { CommercialEntitlements } from "@commercial/types";
import type { CommercialContext } from "@commercial/commercialContext";
import {
  getSubscriptionExpiryWarning,
  hasCommercialFeature,
  isCanonicalCurrentPlan,
  isFeatureVisible,
  isPremiumTemplateLocked,
  isTrialActiveForMessaging,
  showCustomColorsPanel,
  showExcelUpgradeLabel,
  showReportsUpgradeNotice,
  shouldShowTemplatesUpgradeNotice,
} from "./featureVisibility";

function entitlementsForPlan(
  plan: CommercialEntitlements["plan"],
  overrides: Partial<CommercialEntitlements["features"]> = {}
): CommercialEntitlements {
  const professionalFeatures: CommercialEntitlements["features"] = {
    qrMenu: true,
    categories: true,
    menuImages: true,
    search: true,
    ordering: true,
    cart: true,
    checkout: true,
    requestBill: true,
    callWaiter: true,
    orderTracking: true,
    reports: true,
    excelExport: true,
    hotelMode: true,
    roomQr: true,
    dynamicServiceCatalog: true,
    templates: true,
    customColors: true,
    customFonts: true,
  };

  const basicFeatures: CommercialEntitlements["features"] = {
    ...professionalFeatures,
    ordering: false,
    cart: false,
    checkout: false,
    requestBill: false,
    callWaiter: false,
    orderTracking: false,
    reports: false,
    excelExport: false,
    hotelMode: false,
    roomQr: false,
    dynamicServiceCatalog: false,
    customColors: false,
    customFonts: false,
  };

  const featureMap: Record<string, CommercialEntitlements["features"]> = {
    TRIAL: professionalFeatures,
    BASIC: basicFeatures,
    PROFESSIONAL: professionalFeatures,
    ENTERPRISE: professionalFeatures,
    ADMIN: professionalFeatures,
    NONE: Object.fromEntries(
      Object.keys(professionalFeatures).map((k) => [k, k === "qrMenu" || k === "search"])
    ) as CommercialEntitlements["features"],
  };

  const features = { ...featureMap[plan], ...overrides };

  return {
    accountType:
      plan === "ADMIN"
        ? "ADMIN"
        : plan === "TRIAL"
          ? "TRIAL"
          : plan === "NONE"
            ? "NONE"
            : "PAYING",
    plan,
    status: plan === "TRIAL" ? "trial" : plan === "NONE" ? null : "active",
    limits:
      plan === "ENTERPRISE" || plan === "ADMIN"
        ? { restaurants: null, categories: null, items: null }
        : plan === "BASIC"
          ? { restaurants: 1, categories: 10, items: 100 }
          : plan === "NONE"
            ? { restaurants: 0, categories: 0, items: 0 }
            : { restaurants: 5, categories: 25, items: 500 },
    features,
    commercial: {
      isTrial: plan === "TRIAL",
      isPaid: ["BASIC", "PROFESSIONAL", "ENTERPRISE"].includes(plan),
      isEnterprise: plan === "ENTERPRISE",
      isAdmin: plan === "ADMIN",
      countsInMrr: ["BASIC", "PROFESSIONAL", "ENTERPRISE"].includes(plan),
      countsInRevenue: ["BASIC", "PROFESSIONAL", "ENTERPRISE"].includes(plan),
      invoiceEligible: ["BASIC", "PROFESSIONAL", "ENTERPRISE"].includes(plan),
    },
  };
}

describe("featureVisibility by plan", () => {
  it("BASIC: templates yes, custom colors no, reports no", () => {
    const ent = entitlementsForPlan("BASIC");
    expect(hasCommercialFeature(ent, "templates")).toBe(true);
    expect(hasCommercialFeature(ent, "customColors")).toBe(false);
    expect(hasCommercialFeature(ent, "reports")).toBe(false);
    expect(isPremiumTemplateLocked(true, ent)).toBe(false);
    expect(shouldShowTemplatesUpgradeNotice(ent)).toBe(false);
  });

  it("TRIAL: full professional visibility including customization", () => {
    const ent = entitlementsForPlan("TRIAL");
    expect(hasCommercialFeature(ent, "ordering")).toBe(true);
    expect(hasCommercialFeature(ent, "customFonts")).toBe(true);
    expect(isTrialActiveForMessaging(ent)).toBe(true);
    expect(isPremiumTemplateLocked(true, ent)).toBe(false);
  });

  it("PROFESSIONAL: reports and excel visible", () => {
    const ent = entitlementsForPlan("PROFESSIONAL");
    expect(hasCommercialFeature(ent, "reports")).toBe(true);
    expect(hasCommercialFeature(ent, "excelExport")).toBe(true);
    expect(hasCommercialFeature(ent, "customColors")).toBe(true);
  });

  it("ENTERPRISE: same feature visibility as professional", () => {
    const ent = entitlementsForPlan("ENTERPRISE");
    expect(hasCommercialFeature(ent, "reports")).toBe(true);
    expect(hasCommercialFeature(ent, "ordering")).toBe(true);
  });

  it("ADMIN: all features visible via isAdmin", () => {
    const ent = entitlementsForPlan("ADMIN");
    expect(hasCommercialFeature(ent, "customColors")).toBe(true);
    expect(hasCommercialFeature(ent, "reports")).toBe(true);
    expect(shouldShowTemplatesUpgradeNotice(ent)).toBe(false);
  });

  it("NONE: templates locked, upgrade notice shown", () => {
    const ent = entitlementsForPlan("NONE");
    expect(hasCommercialFeature(ent, "templates")).toBe(false);
    expect(isPremiumTemplateLocked(true, ent)).toBe(true);
    expect(shouldShowTemplatesUpgradeNotice(ent)).toBe(true);
  });
});

describe("PG-1C.3C consolidated helpers", () => {
  it("isFeatureVisible mirrors hasCommercialFeature", () => {
    const ent = entitlementsForPlan("BASIC");
    expect(isFeatureVisible(ent, "reports")).toBe(false);
    expect(isFeatureVisible(ent, "templates")).toBe(true);
  });

  it("showCustomColorsPanel includes admin bypass", () => {
    const basic = entitlementsForPlan("BASIC");
    const admin = entitlementsForPlan("ADMIN");
    expect(showCustomColorsPanel(basic)).toBe(false);
    expect(showCustomColorsPanel(admin)).toBe(true);
  });

  it("upgrade notices hidden for admin", () => {
    const admin = entitlementsForPlan("ADMIN", { reports: false });
    expect(showReportsUpgradeNotice(admin)).toBe(false);
    expect(showExcelUpgradeLabel(admin)).toBe(false);
  });

  it("upgrade notices shown for BASIC without reports/excel", () => {
    const basic = entitlementsForPlan("BASIC");
    expect(showReportsUpgradeNotice(basic)).toBe(true);
    expect(showExcelUpgradeLabel(basic)).toBe(true);
  });

  it("isCanonicalCurrentPlan maps trial to professional catalog id", () => {
    const trial = entitlementsForPlan("TRIAL");
    expect(isCanonicalCurrentPlan(trial, 30002)).toBe(true);
    expect(isCanonicalCurrentPlan(trial, 30001)).toBe(false);
  });

  it("isCanonicalCurrentPlan matches paid plan catalog ids", () => {
    const basic = entitlementsForPlan("BASIC");
    const pro = entitlementsForPlan("PROFESSIONAL");
    expect(isCanonicalCurrentPlan(basic, 30001)).toBe(true);
    expect(isCanonicalCurrentPlan(pro, 30002)).toBe(true);
    expect(isCanonicalCurrentPlan(basic, 30002)).toBe(false);
  });

  it("getSubscriptionExpiryWarning returns warning within 7 days", () => {
    const end = new Date();
    end.setDate(end.getDate() + 3);
    const context: CommercialContext = {
      ownerId: 1,
      role: "user",
      now: new Date(),
      subscription: {
        catalogPlan: "PROFESSIONAL",
        subscriptionStatus: "active",
        currentPeriodEnd: end.toISOString(),
        trialEndsAt: null,
      },
    };
    const warning = getSubscriptionExpiryWarning(context);
    expect(warning?.type).toBe("warning");
    expect(warning?.daysLeft).toBeGreaterThan(0);
    expect(warning?.daysLeft).toBeLessThanOrEqual(7);
  });

  it("getSubscriptionExpiryWarning returns null when period is far away", () => {
    const end = new Date();
    end.setDate(end.getDate() + 30);
    const context: CommercialContext = {
      ownerId: 1,
      role: "user",
      now: new Date(),
      subscription: {
        catalogPlan: "PROFESSIONAL",
        subscriptionStatus: "active",
        currentPeriodEnd: end.toISOString(),
        trialEndsAt: null,
      },
    };
    expect(getSubscriptionExpiryWarning(context)).toBeNull();
  });
});
