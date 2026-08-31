/**
 * SAUDI-TAX-INVOICE-PHASE-1 — architecture guards.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SAUDI-TAX-INVOICE-PHASE-1 guards", () => {
  it("migration 0108 adds Phase 1 fields without financial rewrite", () => {
    expect(
      existsSync(join(repoRoot, "drizzle/0108_saudi_tax_invoice_phase1.sql"))
    ).toBe(true);
    const sql = read("drizzle/0108_saudi_tax_invoice_phase1.sql");
    expect(sql).toContain("saudi_tax_invoice_sequences");
    expect(sql).toContain("invoiceNumber");
    expect(sql).toContain("qrPayloadBase64");
    expect(sql).toContain("phase1DocumentJson");
    expect(sql).not.toMatch(/ALTER TABLE `payment_collection_facts`/);
    expect(sql).not.toMatch(/ALTER TABLE `orders`/);
    expect(sql).not.toMatch(/DROP\s+TABLE/i);
  });

  it("Phase 1 QR uses official TLV tags 1–5 only", () => {
    const qr = read(
      "shared/compliance/saudi-tax-invoice/saudiPhase1QrTlv.ts"
    );
    expect(qr).toContain("QRCodeCreation.pdf");
    expect(qr).toContain("SELLER_NAME: 1");
    expect(qr).toContain("VAT_TOTAL: 5");
    expect(qr).toContain("Phase 2");
    expect(qr).toContain("tag >= 6");
  });

  it("Phase 1 stays in Saudi Compliance and avoids Phase 2 markers", () => {
    const gen = read(
      "server/compliance/saudi-tax-invoice/saudiPhase1GenerationService.ts"
    );
    const combined =
      gen +
      read("server/compliance/saudi-tax-invoice/saudiTaxInvoiceService.ts") +
      read("server/compliance/saudi-tax-invoice/saudiTaxInvoiceRouter.ts");
    expect(combined).not.toMatch(/\bfatoora\b/i);
    expect(combined).not.toContain("clearanceAPI");
    expect(combined).not.toContain("CSID");
    expect(combined).not.toContain("previousInvoiceHash");
    expect(gen).not.toContain("insertCollectionFact");
    expect(gen).not.toContain("updateCollectionFact");
  });

  it("Customer Core and PaymentConfirm remain free of Phase 1 generation", () => {
    const customer = read("server/customer/CustomerService.ts");
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    expect(customer).not.toContain("applySaudiPhase1Generation");
    expect(confirm).not.toContain("applySaudiPhase1Generation");
    expect(confirm).not.toContain("buildSaudiPhase1QrPayloadBase64");
  });

  it("classification still forbids taxNumber-only B2B/B2C", () => {
    const classification = read(
      "shared/compliance/saudi-tax-invoice/saudiTaxInvoiceClassification.ts"
    );
    expect(classification).toContain("Forbidden sole rule");
    expect(classification).not.toMatch(
      /taxNumberPresent\s*\?\s*["']b2b["']\s*:\s*["']b2c["']/
    );
    expect(classification).toContain("customerType === \"business\"");
  });
});
