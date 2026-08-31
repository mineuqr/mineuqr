/**
 * SAUDI-TAX-INVOICE-CASHIER-UX-1 — architecture guards.
 * Cashier is presentation only over Phase 1 Tax Invoice read API.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const DIALOG =
  "client/src/components/cashier-workspace/CashierSaudiTaxInvoiceDialog.tsx";
const RECEIPT =
  "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx";
const MAPPER =
  "client/src/lib/cashier-workspace/saudiTaxInvoiceCashierView.ts";
const CSS = "client/src/index.css";

describe("SAUDI-TAX-INVOICE-CASHIER-UX-1 architecture guards", () => {
  it("Cashier reads Phase 1 Tax Invoice and does not generate one", () => {
    const panel = read(PANEL);
    const dialog = read(DIALOG);
    const mapper = read(MAPPER);
    expect(panel).toContain("saudiTaxInvoice.getPhase1ByOrder");
    expect(panel).toContain("mapSaudiPhase1DocumentToCashierView");
    expect(panel).not.toContain("ensureSaudiTaxInvoiceForCollectionFact");
    expect(panel).not.toContain("applySaudiPhase1Generation");
    expect(dialog).not.toContain("ensureSaudiTaxInvoice");
    expect(mapper).not.toContain("ensureSaudiTaxInvoice");
    expect(mapper).toContain("Does not generate");
  });

  it("Cashier does not calculate VAT, classify B2B/B2C, or call Fatoora/ZATCA Phase 2", () => {
    const combined = read(PANEL) + read(DIALOG) + read(MAPPER);
    expect(combined).not.toMatch(/\bfatoora\b/i);
    expect(combined).not.toContain("clearanceAPI");
    expect(combined).not.toContain("CSID");
    expect(combined).not.toContain("previousInvoiceHash");
    expect(combined).not.toContain("classifySaudiTaxInvoice");
    expect(combined).not.toMatch(/\bsubtotal\s*\*|taxAmount\s*\*|VAT\s*\*/);
    expect(combined).not.toContain("insertCollectionFact");
    expect(combined).not.toContain("updateCollectionFact");
    expect(combined).not.toContain("PaymentConfirm");
  });

  it("View/Print reuse the same mapped Phase 1 document; print does not create Tax Invoice", () => {
    const panel = read(PANEL);
    const dialog = read(DIALOG);
    const mapper = read(MAPPER);
    expect(panel).toContain("CashierSaudiTaxInvoiceDialog");
    expect(panel).toContain("printCashierSaudiTaxInvoice");
    expect(dialog).toContain("printCashierSaudiTaxInvoice");
    expect(dialog).toContain("CASHIER_SAUDI_TAX_INVOICE_PRINT_ROOT_ID");
    expect(mapper).toContain("printing-cashier-saudi-tax-invoice");
    expect(mapper).toContain("Does not create Tax Invoice");
  });

  it("Operational receipt remains distinct from Saudi Tax Invoice", () => {
    const receipt = read(RECEIPT);
    expect(receipt).toContain("Operational receipt ≠ Saudi Tax Invoice");
    expect(receipt).toContain("saudiTaxInvoice");
    expect(receipt).toContain("taxInvoiceView");
    expect(receipt).toContain("cashier-paid-receipt-print");
    expect(read(DIALOG)).toContain("CASHIER_SAUDI_TAX_INVOICE_PRINT_ROOT_ID");
    expect(read(MAPPER)).toContain("cashier-saudi-tax-invoice-print");
  });

  it("Print CSS isolates Tax Invoice without 100vh height lock", () => {
    const css = read(CSS);
    expect(css).toContain("body.printing-cashier-saudi-tax-invoice");
    expect(css).toContain("#cashier-saudi-tax-invoice-print");
    expect(css).toContain("max-width: 72.1mm");
    const start = css.indexOf("SAUDI-TAX-INVOICE-CASHIER-UX-1");
    expect(start).toBeGreaterThan(-1);
    const stiBlock = css.slice(start, start + 2500);
    expect(stiBlock).not.toContain("100vh");
    expect(stiBlock).toContain("height: auto !important");
  });

  it("Saudi UX is gated by countryCode SA from Dashboard", () => {
    const panel = read(PANEL);
    const dashboard = read("client/src/pages/Dashboard.tsx");
    expect(panel).toContain("countryCode");
    expect(panel).toContain('=== "SA"');
    expect(dashboard).toContain("countryCode=");
    expect(dashboard).toContain("CashierWorkspacePanel");
  });

  it("does not add a new migration for Cashier UX", () => {
    const drizzleDir = join(repoRoot, "drizzle");
    const migrations = readdirSync(drizzleDir).filter((f) =>
      f.endsWith(".sql")
    );
    expect(
      migrations.some((f) => /cashier.*saudi|saudi.*cashier/i.test(f))
    ).toBe(false);
    expect(
      existsSync(
        join(repoRoot, "docs/engineering/programs/SAUDI-TAX-INVOICE-CASHIER-UX-1")
      )
    ).toBe(true);
  });

  it("Customer Core and Collection Fact services stay free of Cashier Tax Invoice UI", () => {
    expect(read("server/customer/CustomerService.ts")).not.toContain(
      "CashierSaudiTaxInvoice"
    );
    expect(
      read("server/operational-session/payment/PaymentConfirmService.ts")
    ).not.toContain("CashierSaudiTaxInvoice");
  });
});
