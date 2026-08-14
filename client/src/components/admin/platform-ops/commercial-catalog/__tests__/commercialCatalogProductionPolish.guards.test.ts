/**
 * COMMERCIAL-CATALOG-PRODUCTION-POLISH-1 — quality gates.
 */
import { describe, expect, it } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

function read(rel: string): string {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-CATALOG-PRODUCTION-POLISH-1", () => {
  it("marks production polish on Catalog composition", () => {
    const composition = read(
      "client/src/components/admin/platform-ops/PlatformOpsCommercialCatalogComposition.tsx"
    );
    expect(composition).toContain(
      "COMMERCIAL-CATALOG-PRODUCTION-POLISH-1"
    );
  });

  it("enforces USD-only createPrice for canonical prices", () => {
    const router = read(
      "server/api/commercialCatalog/commercialCatalogRouter.ts"
    );
    expect(router).toContain("COMMERCIAL_CANONICAL_CURRENCY");
    expect(router).toContain(
      "Canonical Catalog prices must be USD. Use regionId for local overrides."
    );
  });

  it("wizard creates monthly and yearly USD prices on one plan", () => {
    const wizard = read(
      "client/src/components/admin/platform-ops/commercial-catalog/experience/PlanCreationWizard.tsx"
    );
    expect(wizard).toContain("monthlyAmountUsd");
    expect(wizard).toContain("yearlyAmountUsd");
    expect(wizard).toContain("COMMERCIAL_CANONICAL_CURRENCY");
    expect(wizard).toContain("billingCycleId: monthlyCycle.id");
    expect(wizard).toContain("billingCycleId: yearlyCycle.id");
    expect(wizard).toContain("regionId: null");
    expect(wizard).not.toMatch(/currency:\s*[\"']SAR[\"']/);
  });

  it("regions default to US / USD with searchable country selector", () => {
    const panels = read(
      "client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx"
    );
    expect(panels).toContain('useState("US")');
    expect(panels).toContain("COMMERCIAL_CANONICAL_CURRENCY");
    expect(panels).toContain("CatalogCountrySelect");
    expect(existsSync(
      resolve(
        root,
        "client/src/components/admin/platform-ops/commercial-catalog/CatalogCountrySelect.tsx"
      )
    )).toBe(true);
  });

  it("localizes feature and limit display names (no raw identifiers in preview)", () => {
    const display = read(
      "client/src/components/admin/platform-ops/commercial-catalog/catalogCommercialDisplay.ts"
    );
    expect(display).toContain("catalogFeatureNameKey");
    expect(display).toContain("catalogLimitNameKey");
    expect(display).toContain("resolveCatalogLabel");

    const experience = read(
      "client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx"
    );
    expect(experience).toContain("catalogFeatureNameKey");
    expect(experience).toContain("catalogLimitNameKey");
    expect(experience).not.toMatch(/✓ \{f\.featureKey\}/);

    const en = JSON.parse(read("client/src/locales/en.json"));
    const ar = JSON.parse(read("client/src/locales/ar.json"));
    const enFeat =
      en.admin.platformOps.commercialCatalog.features.qrMenu.name;
    const arFeat =
      ar.admin.platformOps.commercialCatalog.features.qrMenu.name;
    expect(enFeat).toBeTruthy();
    expect(arFeat).toBeTruthy();
    expect(enFeat).not.toBe("qrMenu");
    const enLim =
      en.admin.platformOps.commercialCatalog.limits.restaurants.name;
    expect(enLim).toMatch(/Restaurant/i);
  });

  it("public pricing supports monthly/yearly toggle and dual price", () => {
    const pricing = read("client/src/pages/Pricing.tsx");
    expect(pricing).toContain("CommercialDualPrice");
    expect(pricing).toContain("yearlySavingsPercent");
    expect(pricing).toContain('useState<"monthly" | "yearly">');
    expect(pricing).toContain("selectedCycle");
  });

  it("admin preview supports cycle toggle, savings, and FX/override source", () => {
    const preview = read(
      "client/src/components/commercial/AdminLocalizedPricePreview.tsx"
    );
    expect(preview).toContain("COMMERCIAL-CATALOG-PRODUCTION-POLISH-1");
    expect(preview).toContain("yearlySavingsPercent");
    expect(preview).toContain("polish.overrideSource");
    expect(preview).toContain("polish.fxSource");
    expect(preview).toContain("monthlyBillingCycleIds");
  });

  it("adoption seed stores canonical USD with SAR as regional override only", () => {
    const seed = read(
      "server/services/commercial-catalog/persistentCatalogBootstrap.ts"
    );
    expect(seed).toContain('currency: "USD"');
    expect(seed).toContain("regionId: saRegion.id");
    expect(seed).toContain("monthlyUsd");
    expect(seed).not.toMatch(
      /pricing\.create\(\{[\s\S]*?currency:\s*"SAR"[\s\S]*?regionId:\s*null/
    );

    const adoption = read(
      "server/services/commercial-catalog/adoptionService.ts"
    );
    expect(adoption).toContain("COMMERCIAL_CANONICAL_CURRENCY");
    expect(adoption).not.toMatch(/\?\? \"SAR\"/);
  });
});
