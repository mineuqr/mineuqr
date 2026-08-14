/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1 — UI wiring guards.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
function read(rel: string) {
  return readFileSync(resolve(root, rel), "utf8");
}

describe("owner access UI guards", () => {
  it("Dashboard and Pricing consume ownerAccess APIs; Plan Editor does not", () => {
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const pricing = read("client/src/pages/Pricing.tsx");
    const editor = read(
      "client/src/components/admin/platform-ops/commercial-catalog/CatalogManagementPanels.tsx"
    );
    const control = read("client/src/components/owner-access/OwnerAccessControl.tsx");

    expect(dashboard).toContain("OwnerAccessControl");
    expect(pricing).toContain("OwnerAccessPricingNote");
    expect(pricing).toContain("simulationNoCharge");
    expect(control).toContain("ownerAccess.setSimulation");
    expect(control).toContain("ownerAccess.returnToFullPlatform");
    expect(control).toContain("simulationNoCharge");
    expect(editor).not.toContain("ownerAccess.setSimulation");
    expect(editor).not.toContain("OwnerAccessControl");
  });

  it("does not grant features from a frontend owner flag", () => {
    const control = read("client/src/components/owner-access/OwnerAccessControl.tsx");
    expect(control).not.toMatch(/localStorage|userId === 1|role === ["']admin["']/);
    const hook = read("client/src/hooks/useOwnerAccessMode.ts");
    expect(hook).toContain("ownerAccess.getMode");
    expect(hook).toContain("FORBIDDEN");
  });
});
