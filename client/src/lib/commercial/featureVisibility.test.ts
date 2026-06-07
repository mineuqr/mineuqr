import { describe, expect, it } from "vitest";
import type { CommercialEntitlements } from "@commercial/types";
import {
  hasCommercialFeature,
  isPremiumTemplateLocked,
  isTrialActiveForMessaging,
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
    thermalPrinting: true,
    autoPrint: true,
    reprint: true,
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
    thermalPrinting: false,
    autoPrint: false,
    reprint: false,
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
