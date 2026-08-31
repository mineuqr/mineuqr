/**
 * SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1
 * Architecture guards — evaluation boundaries only.
 * No Tax Invoice implementation is required or permitted by these tests.
 */
import { existsSync, readFileSync } from "node:fs";
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
  "server/customer/CustomerService.ts",
  "server/customer/customerRepository.ts",
  "shared/customer/customerContract.ts",
  "shared/customer/customerValidation.ts",
  "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx",
] as const;

const TAX_INVOICE_IMPL_MARKERS = [
  "TaxInvoiceService",
  "issueTaxInvoice",
  "allocateIrn",
  "fatoora",
  "Fatoora",
  "generateTaxQr",
  "zatcaClearance",
  "saudiTaxInvoice",
] as const;

describe("SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1 guards", () => {
  it("evaluation artifacts exist and claim no implementation", () => {
    const evaluation = read(
      "docs/architecture/evaluations/SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1.md"
    );
    const adr = read(
      "docs/architecture/adrs/ADR-ARCH-041-saudi-tax-invoice-boundary.md"
    );
    const contracts = read(
      "docs/architecture/contracts/saudi-tax-invoice-future-contracts.md"
    );
    expect(evaluation).toContain("NO TAX INVOICE IMPLEMENTATION WAS PERFORMED");
    expect(evaluation).toContain("NO MIGRATION WAS CREATED");
    expect(adr).toContain("Governance / evaluation only");
    expect(contracts).toContain("PROPOSED — NOT IMPLEMENTED");
  });

  it("no Tax Invoice migration 0106 (or later tax_invoice SQL) was introduced by this program", () => {
    expect(existsSync(join(repoRoot, "drizzle/0106_tax_invoices.sql"))).toBe(
      false
    );
    expect(existsSync(join(repoRoot, "drizzle/0106_saudi_tax_invoices.sql"))).toBe(
      false
    );
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0105_customers");
    expect(journal).not.toContain("0106_");
  });

  it.each(GLOBAL_CORE_PATHS)(
    "%s has no Tax Invoice / ZATCA issuance implementation markers",
    (relPath) => {
      const source = read(relPath);
      for (const marker of TAX_INVOICE_IMPL_MARKERS) {
        expect(source, `${relPath} must not contain ${marker}`).not.toContain(
          marker
        );
      }
    }
  );

  it("Customer Core does not branch on SA and does not decide invoice type", () => {
    const contract = read("shared/customer/customerContract.ts");
    const validation = read("shared/customer/customerValidation.ts");
    const service = read("server/customer/CustomerService.ts");
    const combined = contract + validation + service;
    expect(combined).not.toContain('countryCode === "SA"');
    expect(combined).not.toContain("B2B");
    expect(combined).not.toContain("B2C");
    expect(combined).not.toContain("Simplified Tax Invoice");
    expect(combined).not.toContain("STANDARD_TAX_INVOICE");
    expect(contract).toContain("NOT a persisted Customer");
    expect(contract).toContain("CASHIER_ANONYMOUS_CUSTOMER_LABEL");
  });

  it("ADR-041 forbids taxNumber-only B2B/B2C and non-tax invoice on missing taxNumber", () => {
    const adr = read(
      "docs/architecture/adrs/ADR-ARCH-041-saudi-tax-invoice-boundary.md"
    );
    const evaluation = read(
      "docs/architecture/evaluations/SAUDI-TAX-INVOICE-ARCHITECTURE-EVALUATION-1.md"
    );
    expect(adr).toContain("customer.taxNumber ? B2B : B2C");
    expect(adr).toContain("MUST NOT");
    expect(adr).toContain("non-tax invoice");
    expect(evaluation).toContain("taxNumber` absence ≠ non-tax invoice");
    expect(evaluation).toContain("Customer presence ≠ invoice type");
    expect(evaluation).toContain("INV-2");
  });

  it("Collection Fact commit remains free of Tax Invoice issuance", () => {
    const commit = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    expect(commit).not.toContain("dispatchComplianceAfterProductionCollectionFact");
    expect(commit).not.toContain("TaxInvoice");
    expect(commit).not.toContain("InvoiceClassification");
    expect(commit).not.toContain("zatca");
  });

  it("PaymentConfirm remains free of Tax Invoice issuance", () => {
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    expect(confirm).not.toContain("TaxInvoice");
    expect(confirm).not.toContain("InvoiceClassification");
    expect(confirm).not.toContain("saudiZatcaComplianceModule");
    expect(confirm).not.toContain("dispatchComplianceAfterProductionCollectionFact");
  });

  it("Compliance remains country-module driven; Saudi module stays behind boundary", () => {
    const registry = read("shared/compliance/resolveComplianceModule.ts");
    const module = read(
      "shared/compliance/modules/saudiZatcaComplianceModule.ts"
    );
    const orchestrator = read("server/compliance/ComplianceOrchestrator.ts");
    expect(registry).toContain("saudiZatcaComplianceModule");
    expect(registry).toContain('SAUDI_ZATCA_COUNTRY = "SA"');
    expect(registry).toContain("normalizeCountryCode");
    expect(module).toContain('ctx.countryCode === "SA"');
    expect(module).toContain("Boundary hook only");
    expect(orchestrator).toContain("resolveComplianceModule");
    expect(orchestrator).toContain("onProductionCollectionFactCommitted");
  });

  it("compliance event contract keeps cashier invoice distinct from tax invoice", () => {
    const events = read("shared/compliance/complianceEvents.ts");
    expect(events).toContain("collectionFactId");
    expect(events).toContain("not a tax invoice");
    expect(events).toContain("cashierInvoiceNumber");
  });
});
