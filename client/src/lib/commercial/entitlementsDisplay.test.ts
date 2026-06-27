import { describe, expect, it } from "vitest";
import {
  commercialEntitlementsQueryEnabled,
  formatCommercialLimit,
  getLimitRows,
  getPlanDisplayName,
  splitFeaturesByAccess,
} from "./entitlementsDisplay";
import type { CommercialEntitlements } from "@commercial/types";
import { FEATURE_KEYS } from "@commercial/featureKeys";

function sampleEntitlements(
  overrides: Partial<CommercialEntitlements> = {}
): CommercialEntitlements {
  return {
    accountType: "PAYING",
    plan: "PROFESSIONAL",
    status: "active",
    limits: { restaurants: 5, categories: 25, items: 500 },
    features: {
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
    },
    commercial: {
      isTrial: false,
      isPaid: true,
      isEnterprise: false,
      isAdmin: false,
      countsInMrr: true,
      countsInRevenue: true,
      invoiceEligible: true,
    },
    ...overrides,
  };
}

describe("commercialEntitlementsQueryEnabled", () => {
  it("enables when auth resolved and authenticated", () => {
    expect(commercialEntitlementsQueryEnabled(true, true)).toBe(true);
  });

  it("disables when auth pending", () => {
    expect(commercialEntitlementsQueryEnabled(false, true)).toBe(false);
  });

  it("disables when guest", () => {
    expect(commercialEntitlementsQueryEnabled(true, false)).toBe(false);
  });

  it("respects explicit enabled override", () => {
    expect(commercialEntitlementsQueryEnabled(false, false, true)).toBe(true);
    expect(commercialEntitlementsQueryEnabled(true, true, false)).toBe(false);
  });
});

describe("formatCommercialLimit", () => {
  it("formats null as unlimited", () => {
    expect(formatCommercialLimit(null, "en")).toBe("Unlimited");
    expect(formatCommercialLimit(null, "ar")).toBe("غير محدود");
  });

  it("formats numeric limits", () => {
    expect(formatCommercialLimit(5, "en")).toBe("5");
    expect(formatCommercialLimit(0, "en")).toBe("0");
  });
});

describe("getLimitRows", () => {
  it("renders all limit dimensions", () => {
    const rows = getLimitRows(
      { restaurants: 1, categories: 10, items: 100 },
      "en"
    );
    expect(rows).toHaveLength(3);
    expect(rows[0].value).toBe("1");
    expect(rows[1].value).toBe("10");
    expect(rows[2].value).toBe("100");
  });

  it("renders enterprise unlimited limits", () => {
    const rows = getLimitRows(
      { restaurants: null, categories: null, items: null },
      "en"
    );
    expect(rows.every((r) => r.value === "Unlimited")).toBe(true);
  });
});

describe("splitFeaturesByAccess", () => {
  it("splits enabled and disabled features for Basic", () => {
    const basic = sampleEntitlements({
      plan: "BASIC",
      features: {
        ...sampleEntitlements().features,
        ordering: false,
        cart: false,
        checkout: false,
        reports: false,
        excelExport: false,
        customColors: false,
        customFonts: false,
      },
    });

    const { enabled, disabled } = splitFeaturesByAccess(basic.features);
    expect(enabled).toContain("qrMenu");
    expect(enabled).toContain("templates");
    expect(disabled).toContain("ordering");
    expect(disabled).toContain("reports");
    expect(enabled.length + disabled.length).toBe(FEATURE_KEYS.length);
  });
});

describe("getPlanDisplayName", () => {
  it("returns localized plan names", () => {
    expect(getPlanDisplayName("ENTERPRISE", "en")).toBe("Enterprise");
    expect(getPlanDisplayName("TRIAL", "ar")).toBe("تجريبي");
  });
});
