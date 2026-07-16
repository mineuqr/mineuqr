import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("BUSINESS-TAX-POLICY-SETTINGS-1 architecture guards", () => {
  it("exposes Financial Policy in Restaurant Settings via existing restaurant.update", () => {
    const sections = read("client/src/components/RestaurantSettingsSections.tsx");
    const dashboard = read("client/src/pages/Dashboard.tsx");
    expect(sections).toContain("RestaurantFinancialPolicySection");
    expect(sections).toContain("Apply Tax");
    expect(sections).toContain("Prices Include Tax");
    expect(sections).toContain("Prices Exclude Tax");
    expect(dashboard).toContain("RestaurantFinancialPolicySection");
    expect(dashboard).toContain("taxEnabled");
    expect(dashboard).toContain("taxMode");
    expect(dashboard).toContain("taxPolicy");
    expect(dashboard).toContain("getCountryFinancialPolicySuggestion");
  });

  it("country tax defaults are suggestions only (never auto-applied on change)", () => {
    const helpers = read("client/src/lib/businessTaxPolicySettings.ts");
    const dashboard = read("client/src/pages/Dashboard.tsx");
    expect(helpers).toContain("Never auto-applied");
    expect(helpers).toContain("getCountryFinancialPolicySuggestion");
    expect(dashboard).toContain("suggest only; never auto-overwrite tax config");
    expect(dashboard).toContain("setTaxSuggestion(getCountryFinancialPolicySuggestion");
    // Settings country handler only queues a suggestion; apply is explicit.
    const marker = "suggest only; never auto-overwrite tax config";
    const markerIdx = dashboard.indexOf(marker);
    expect(markerIdx).toBeGreaterThan(-1);
    const applyIdx = dashboard.indexOf("const applyTaxSuggestion", markerIdx);
    expect(applyIdx).toBeGreaterThan(markerIdx);
    const countryTaxTail = dashboard.slice(markerIdx, applyIdx);
    expect(countryTaxTail).toContain("setTaxSuggestion(getCountryFinancialPolicySuggestion");
    expect(countryTaxTail).not.toContain("setTaxEnabled(");
    expect(countryTaxTail).not.toContain("setTaxMode(");
    expect(countryTaxTail).not.toContain("setTaxRatePercent(");
  });

  it("persists rate inside taxPolicyJson — no new schema columns", () => {
    const helpers = read("client/src/lib/businessTaxPolicySettings.ts");
    const schema = read("drizzle/schema.ts");
    expect(helpers).toContain("buildBusinessTaxPolicyDocument");
    expect(schema).toContain("taxEnabled");
    expect(schema).toContain("taxMode");
    expect(schema).toContain("taxPolicyJson");
    expect(schema).not.toContain("taxRatePercent");
    expect(schema).not.toContain("tax_rate");
  });

  it("does not redesign Check / Reporting / Order / Runtime in this program", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("taxEnabled");
    expect(routers).toContain("serializeBusinessTaxPolicyJson");
    expect(routers).toContain("reporting: reportingRouter");
    // Presentation helpers must not import Check write services
    const helpers = read("client/src/lib/businessTaxPolicySettings.ts");
    expect(helpers).not.toContain("CheckService");
    expect(helpers).not.toContain("createOpenCheckForSession");
    expect(helpers).not.toContain("settleCheckPaid");
  });
});
