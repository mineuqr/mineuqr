/**
 * SAUDI-TAX-INVOICE-PHASE-1-QR-UNIFICATION-1 — architecture guards.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SAUDI-TAX-INVOICE-PHASE-1-QR-UNIFICATION-1 guards", () => {
  it("requires Phase 1 QR for Simplified and Standard via one policy helper", () => {
    const doc = read(
      "shared/compliance/saudi-tax-invoice/saudiPhase1Document.ts"
    );
    const gen = read(
      "server/compliance/saudi-tax-invoice/saudiPhase1GenerationService.ts"
    );
    expect(doc).toContain('SAUDI_PHASE_1_QR_POLICY = "ALWAYS_FOR_TAX_INVOICES"');
    expect(doc).toContain("saudiPhase1QrRequired");
    expect(doc).toContain("isStandardTaxInvoiceForm");
    expect(doc).not.toMatch(
      /qrRequired\s*=\s*isSimplifiedTaxInvoiceForm\(/
    );
    expect(gen).toContain("saudiPhase1QrRequired");
    expect(gen).toContain("buildSaudiPhase1QrPayloadBase64");
    expect(gen).not.toContain("isSimplifiedTaxInvoiceForm");
    expect(gen).not.toMatch(/if \(qrRequired\) \{[\s\S]*buildSaudiPhase1Qr/);
  });

  it("Cashier only renders persisted QR and does not encode TLV", () => {
    const dialog = read(
      "client/src/components/cashier-workspace/CashierSaudiTaxInvoiceDialog.tsx"
    );
    const mapper = read(
      "client/src/lib/cashier-workspace/saudiTaxInvoiceCashierView.ts"
    );
    const combined = dialog + mapper;
    expect(combined).toContain("qrPayloadBase64");
    expect(combined).not.toContain("buildSaudiPhase1QrPayloadBase64");
    expect(combined).not.toContain("SAUDI_PHASE1_QR_TAGS");
    expect(combined).not.toMatch(/\bfatoora\b/i);
    expect(combined).not.toContain("previousInvoiceHash");
    expect(combined).not.toContain("CSID");
  });

  it("keeps Saudi QR out of Customer Core, Collection Fact, and PaymentConfirm", () => {
    expect(read("server/customer/CustomerService.ts")).not.toContain(
      "buildSaudiPhase1QrPayloadBase64"
    );
    expect(
      read(
        "server/operational-session/payment/collection-fact/collectionFactRepository.ts"
      )
    ).not.toContain("buildSaudiPhase1QrPayloadBase64");
    expect(
      read("server/operational-session/payment/PaymentConfirmService.ts")
    ).not.toContain("buildSaudiPhase1QrPayloadBase64");
  });

  it("does not add a QR-unification migration", () => {
    const migrations = readdirSync(join(repoRoot, "drizzle")).filter((f) =>
      f.endsWith(".sql")
    );
    expect(
      migrations.some((f) => /qr.?unification|phase.?1.?qr/i.test(f))
    ).toBe(false);
  });

  it("does not introduce Phase 2 QR tags or Fatoora", () => {
    const qr = read("shared/compliance/saudi-tax-invoice/saudiPhase1QrTlv.ts");
    const gen = read(
      "server/compliance/saudi-tax-invoice/saudiPhase1GenerationService.ts"
    );
    expect(qr).toContain("tag >= 6");
    expect(gen + qr).not.toMatch(/\bfatoora\b/i);
    expect(gen).not.toContain("clearanceAPI");
    expect(gen).not.toContain("previousInvoiceHash");
  });
});
