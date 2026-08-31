/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1 — global core leakage guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

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

const SAUDI_IMPORT_MARKERS = [
  "saudiZatcaComplianceModule",
  "@shared/compliance/modules/saudiZatca",
  "ZATCA",
  "zatca",
  "resolveComplianceModule",
] as const;

const COUNTRY_BRANCH_MARKERS = [
  'countryCode === "SA"',
  "countryCode === 'SA'",
  'countryCode === "sa"',
] as const;

describe("MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1 architecture guards", () => {
  it.each(GLOBAL_CORE_PATHS)(
    "%s does not import Saudi/ZATCA compliance modules or country routing",
    (relPath) => {
      const source = read(relPath);
      for (const marker of SAUDI_IMPORT_MARKERS) {
        expect(source, `${relPath} must not reference ${marker}`).not.toContain(
          marker
        );
      }
      for (const marker of COUNTRY_BRANCH_MARKERS) {
        expect(source, `${relPath} must not branch on SA country`).not.toContain(
          marker
        );
      }
    }
  );

  it("Collection Fact commit does not depend on compliance orchestration", () => {
    const commit = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    expect(commit).not.toContain("dispatchComplianceAfterProductionCollectionFact");
    expect(commit).not.toContain("ComplianceOrchestrator");
  });

  it("Cashier Confirm resolves compliance only through post-commit dispatch", () => {
    const check = read("server/operational-session/check/CheckService.ts");
    const finalize = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    expect(check).toContain("dispatchComplianceAfterProductionCollectionFact");
    expect(check).not.toContain("resolveComplianceModule");
    expect(check).not.toContain("saudiZatcaComplianceModule");
    expect(finalize).toContain("dispatchComplianceAfterProductionCollectionFact");
    expect(finalize).not.toContain("resolveComplianceModule");
  });

  it("registry is the sole country routing location", () => {
    const registry = read("shared/compliance/resolveComplianceModule.ts");
    expect(registry).toContain("saudiZatcaComplianceModule");
    expect(registry).toContain("noOpComplianceModule");
    expect(registry).toContain("resolveComplianceModule");
  });

  it("Payment Confirm does not resolve country modules directly", () => {
    const confirm = read("server/operational-session/payment/PaymentConfirmService.ts");
    expect(confirm).not.toContain("resolveComplianceModule");
    expect(confirm).not.toContain("saudiZatcaComplianceModule");
    expect(confirm).not.toContain("dispatchComplianceAfterProductionCollectionFact");
  });

  it("compliance module contract is observer-only", () => {
    const contract = read("shared/compliance/complianceModuleContract.ts");
    expect(contract).toContain("MUST NOT create or mutate Collection Facts");
    expect(contract).not.toContain("commitCollectionFact");
  });
});
