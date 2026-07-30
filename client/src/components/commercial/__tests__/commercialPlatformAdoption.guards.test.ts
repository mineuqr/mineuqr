/**
 * COMMERCIAL-PLATFORM-ADOPTION-1 — UI adoption guards.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("COMMERCIAL-PLATFORM-ADOPTION-1", () => {
  it("public Pricing uses Public Catalog API only for plan discovery", () => {
    const pricing = read("client/src/pages/Pricing.tsx");
    expect(pricing).toContain("commercialCatalog.public.listOfferings");
    expect(pricing).not.toMatch(/subscription\.listPlans/);
    expect(pricing).toContain("catalogFeatureNameKey");
    expect(pricing).toContain("isCurrentCatalogPlanByCode");
  });

  it("admin publishing UI uses commercialCatalog.publishing via shared hook", () => {
    const hook = read(
      "client/src/components/admin/platform-ops/commercial-catalog/useCatalogPublishingMutations.ts"
    );
    expect(hook).toContain("commercialCatalog.publishing");
    expect(hook).toContain("approveVersion");
    expect(hook).toContain("schedulePublish");
    expect(hook).toContain("archiveVersion");
    expect(hook).not.toMatch(/hasFeature|checkEntitlement/);

    const panels = read(
      "client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx"
    );
    expect(panels).toContain("useCatalogPublishingMutations");
    expect(panels).not.toMatch(
      /commercialCatalog\.publishVersion\.useMutation/
    );
  });

  it("CS admin plan picker uses Catalog published offerings", () => {
    const cs = read(
      "client/src/components/admin/domains/customer-success/CustomerSuccessAccountsSection.tsx"
    );
    expect(cs).toContain("listPublishedOfferings");
    expect(cs).not.toMatch(/subscription\.listPlans/);
  });

  it("client entitlement UI remains Runtime hub (commercial.getEntitlements)", () => {
    const hook = read("client/src/hooks/useCommercialEntitlements.ts");
    expect(hook).toContain("commercial.getEntitlements");
    expect(hook).not.toMatch(/subscription-runtime/);
    expect(hook).not.toMatch(/listPublicCatalog|public\.listOfferings/);
  });

  it("preserves I-CPP-01 — no Published Catalog entitlement evaluation in Pricing", () => {
    const pricing = read("client/src/pages/Pricing.tsx");
    expect(pricing).not.toMatch(/hasFeature\(|checkEntitlement|checkLimit/);
    expect(pricing).toContain("useCommercialFeatureVisibility");
  });
});
