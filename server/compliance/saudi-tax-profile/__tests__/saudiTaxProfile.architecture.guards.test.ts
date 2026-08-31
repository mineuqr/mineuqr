/**
 * SAUDI-TAX-PROFILE-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const GLOBAL_CORE_PATHS = [
  "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts",
  "server/operational-session/payment/PaymentConfirmService.ts",
  "server/operational-session/payment/collection-fact/CollectionFactService.ts",
  "server/pos/services/PosSaleService.ts",
  "server/pos/services/PosSettlementInitiateService.ts",
  "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx",
  "client/src/lib/cashier-workspace/cashierInvoiceView.ts",
] as const;

const SAUDI_PROFILE_MARKERS = [
  "saudiTaxProfiles",
  "saudiTaxProfile",
  "SaudiTaxProfile",
  "saudi-tax-profile",
] as const;

describe("SAUDI-TAX-PROFILE-1 architecture guards", () => {
  it.each(GLOBAL_CORE_PATHS)(
    "%s does not depend on Saudi Tax Profile",
    (relPath) => {
      const source = read(relPath);
      for (const marker of [
        "saudiTaxProfiles",
        "saudiTaxProfile",
        "SaudiTaxProfile",
        "saudi-tax-profile",
        "upsertSaudiTaxProfile",
        "getSaudiTaxProfileView",
      ]) {
        expect(source, `${relPath} must not reference ${marker}`).not.toContain(
          marker
        );
      }
    }
  );

  it("Cashier does not import Saudi Tax Profile", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(panel).not.toContain("SaudiTaxProfileSection");
    expect(panel).not.toContain("saudiTaxProfile");
  });

  it("Collection Fact does not depend on Saudi Tax Profile", () => {
    const commit = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    expect(commit).not.toContain("saudiTaxProfile");
    expect(commit).not.toContain("saudi_tax_profiles");
  });

  it("Tax Profile service does not create Collection Fact, PAID, Tax Invoice, IRN, QR, or ZATCA calls", () => {
    const service = read(
      "server/compliance/saudi-tax-profile/SaudiTaxProfileService.ts"
    );
    const repo = read(
      "server/compliance/saudi-tax-profile/saudiTaxProfileRepository.ts"
    );
    const combined = service + repo;
    expect(combined).not.toContain("commitCollectionFact");
    expect(combined).not.toContain("commitCashierProductionCollectionFact");
    expect(combined).not.toContain("tax_invoice");
    expect(combined).not.toContain("taxInvoice");
    expect(combined).not.toContain("allocateIrn");
    expect(combined).not.toContain("fatoora");
    expect(combined).not.toContain("Fatoora");
    expect(combined).not.toContain("generateQr");
    expect(combined).not.toContain("requireFeature");
    expect(combined).not.toContain("getCommercialEntitlements");
  });

  it("Saudi Tax Profile lives in Compliance Layer, not Global Core restaurants columns", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain('mysqlTable(\n  "saudi_tax_profiles"');
    expect(schema).toContain("export const saudiTaxProfiles");
    expect(schema).not.toContain("saudiVatNumber");
    expect(schema).not.toContain("saudiTaxAddress");
    expect(schema).not.toContain("saudiZatcaEnabled");
    const restaurantsStart = schema.indexOf("export const restaurants = mysqlTable");
    const restaurantsEnd = schema.indexOf("export const", restaurantsStart + 1);
    const restaurantsBlock = schema.slice(restaurantsStart, restaurantsEnd);
    expect(restaurantsBlock).toContain("countryCode");
    expect(restaurantsBlock).not.toContain("vatNumber");
    expect(restaurantsBlock).not.toContain("saudi");
  });

  it("countryCode remains jurisdiction authority; profile is SA-scoped", () => {
    const service = read(
      "server/compliance/saudi-tax-profile/SaudiTaxProfileService.ts"
    );
    expect(service).toContain('normalizeCountryCode(countryCode) !== "SA"');
    expect(service).toContain("applicable = countryCode === \"SA\"");
    expect(service).not.toContain("requireFeature");
  });

  it("Admin Settings hosts Tax Profile UI; Cashier does not", () => {
    const settings = read("client/src/components/RestaurantSettingsSections.tsx");
    const dashboard = read("client/src/pages/Dashboard.tsx");
    const cashier = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(settings).toContain("SaudiTaxProfileSection");
    expect(settings).toContain("trpc.saudiTaxProfile");
    expect(dashboard).toContain("SaudiTaxProfileSection");
    expect(cashier).not.toContain("SaudiTaxProfileSection");
    expect(cashier).not.toContain("saudiTaxProfile");
  });

  it("Saudi module requires a Tax Profile for SA applicability boundary", () => {
    const module = read(
      "shared/compliance/modules/saudiZatcaComplianceModule.ts"
    );
    expect(module).toContain("profileRequired");
    expect(module).toContain('ctx.countryCode === "SA"');
  });
});
