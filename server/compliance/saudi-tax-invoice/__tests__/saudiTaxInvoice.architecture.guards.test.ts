/**
 * SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1 — architecture guards.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const GLOBAL_CORE_PATHS = [
  "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts",
  "server/operational-session/payment/PaymentConfirmService.ts",
  "server/customer/CustomerService.ts",
  "server/customer/customerRepository.ts",
  "shared/customer/customerContract.ts",
  "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx",
] as const;

const FORBIDDEN_MARKERS = [
  "fatoora",
  "Fatoora",
  "allocateIrn",
  "generateTaxQr",
  "zatcaClearance",
  "zatcaClearance",
  "CSID",
] as const;

describe("SAUDI-TAX-INVOICE-DOMAIN-FOUNDATION-1 guards", () => {
  it("migration 0107 exists and is additive", () => {
    expect(existsSync(join(repoRoot, "drizzle/0107_saudi_tax_invoices.sql"))).toBe(
      true
    );
    const sql = read("drizzle/0107_saudi_tax_invoices.sql");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `saudi_tax_invoices`");
    expect(sql).toContain("saudi_tax_invoices_idempotency_unique");
    expect(sql).toContain("ON DELETE SET NULL");
    expect(sql).not.toMatch(/ALTER TABLE `payment_collection_facts`/);
    expect(sql).not.toMatch(/ALTER TABLE `orders`/);
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
  });

  it("schema exports saudiTaxInvoices with independent taxInvoiceId", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("export const saudiTaxInvoices");
    expect(schema).toContain("taxInvoiceId");
    expect(schema).toContain("saudi_tax_invoices_idempotency_unique");
  });

  it.each(GLOBAL_CORE_PATHS)(
    "%s has no ZATCA/Fatoora/IRN/QR issuance and no Tax Invoice ensure",
    (relPath) => {
      const source = read(relPath);
      for (const marker of FORBIDDEN_MARKERS) {
        expect(source, `${relPath} must not contain ${marker}`).not.toContain(
          marker
        );
      }
      expect(source).not.toContain("ensureSaudiTaxInvoiceForCollectionFact");
      expect(source).not.toContain("saudiTaxInvoices");
    }
  );

  it("Customer Core has no SA branching and no invoice classification", () => {
    const combined =
      read("shared/customer/customerContract.ts") +
      read("shared/customer/customerValidation.ts") +
      read("server/customer/CustomerService.ts");
    expect(combined).not.toContain('countryCode === "SA"');
    expect(combined).not.toContain("B2B");
    expect(combined).not.toContain("SIMPLIFIED_TAX_INVOICE");
    expect(combined).not.toContain("classifySaudiTaxInvoiceFoundation");
  });

  it("classification forbids taxNumber-only B2B/B2C rule", () => {
    const classification = read(
      "shared/compliance/saudi-tax-invoice/saudiTaxInvoiceClassification.ts"
    );
    expect(classification).toContain("Forbidden sole rule");
    expect(classification).not.toMatch(
      /taxNumberPresent\s*\?\s*["']b2b["']\s*:\s*["']b2c["']/
    );
    expect(classification).toContain('customerType === "business"');
    expect(classification).toContain("taxNumber alone without business type");
  });

  it("Saudi module owns Tax Invoice domain registration path", () => {
    const module = read(
      "shared/compliance/modules/saudiZatcaComplianceModule.ts"
    );
    const register = read(
      "server/compliance/saudi-tax-invoice/registerSaudiTaxInvoiceDomain.ts"
    );
    const orchestrator = read("server/compliance/ComplianceOrchestrator.ts");
    const service = read(
      "server/compliance/saudi-tax-invoice/saudiTaxInvoiceService.ts"
    );
    expect(module).toContain("registerSaudiTaxInvoiceDomainHandler");
    expect(register).toContain("ensureSaudiTaxInvoiceForCollectionFact");
    expect(orchestrator).toContain("registerSaudiTaxInvoiceDomain");
    expect(service).toContain("findCollectionFactByFactId");
    expect(service).not.toContain("insertCollectionFact");
    expect(service).not.toContain("updateCollectionFact");
    expect(service).not.toContain("deleteCollectionFact");
  });

  it("service does not implement ZATCA/VAT engine/QR/IRN", () => {
    const service = read(
      "server/compliance/saudi-tax-invoice/saudiTaxInvoiceService.ts"
    );
    const shared = read(
      "shared/compliance/saudi-tax-invoice/saudiTaxInvoiceContract.ts"
    );
    expect(service).not.toContain("fatoora");
    expect(service).not.toContain("clearance");
    expect(service).not.toContain("allocateIrn");
    expect(service).not.toContain("computeVat");
    expect(service).not.toContain("generateQr");
    expect(shared).toContain("Not IRN");
    expect(shared).toContain("Not VAT engine");
  });
});
