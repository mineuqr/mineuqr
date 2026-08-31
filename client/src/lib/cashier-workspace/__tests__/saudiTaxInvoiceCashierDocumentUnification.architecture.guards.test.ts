/**
 * SAUDI-TAX-INVOICE-CASHIER-DOCUMENT-UNIFICATION-1 — architecture guards.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { isSaudiEInvoiceCustomerFacingDocument } from "../saudiCashierDocumentPolicy";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const RECEIPT =
  "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx";
const TAX =
  "client/src/components/cashier-workspace/CashierSaudiTaxInvoiceDialog.tsx";
const POLICY =
  "client/src/lib/cashier-workspace/saudiCashierDocumentPolicy.ts";

describe("SAUDI-TAX-INVOICE-CASHIER-DOCUMENT-UNIFICATION-1", () => {
  it("centralizes Saudi customer-facing document policy", () => {
    expect(isSaudiEInvoiceCustomerFacingDocument("SA")).toBe(true);
    expect(isSaudiEInvoiceCustomerFacingDocument("sa")).toBe(true);
    expect(isSaudiEInvoiceCustomerFacingDocument("AE")).toBe(false);
    expect(isSaudiEInvoiceCustomerFacingDocument(null)).toBe(false);
    expect(read(PANEL)).toContain("isSaudiEInvoiceCustomerFacingDocument");
    expect(read(PANEL)).not.toMatch(
      /String\(countryCode[^)]*\)\.trim\(\)\.toUpperCase\(\)\s*===\s*"SA"/
    );
  });

  it("Saudi post-payment opens Tax Invoice, not competing Paid Receipt", () => {
    const panel = read(PANEL);
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("setTaxInvoiceOpen(true)");
    expect(completeFn).toContain("SAUDI-TAX-INVOICE-CASHIER-DOCUMENT-UNIFICATION-1");
    expect(completeFn).toContain("setPrintOpen(true)");
    expect(completeFn).toContain("isSaudiCashier && result.orderId");
    expect(completeFn.indexOf("setTaxInvoiceOpen(true)")).toBeLessThan(
      completeFn.indexOf("} else if (receipt)")
    );
    expect(read(RECEIPT)).not.toContain("saudiTaxInvoice");
    expect(read(RECEIPT)).not.toContain("taxInvoiceView");
    expect(read(TAX)).toContain("paymentSuccess");
    expect(read(TAX)).toContain("availability");
  });

  it("Cashier still does not generate Tax Invoice or QR / VAT / classification", () => {
    const combined = read(PANEL) + read(TAX) + read(POLICY);
    expect(combined).not.toContain("ensureSaudiTaxInvoiceForCollectionFact");
    expect(combined).not.toContain("buildSaudiPhase1QrPayloadBase64");
    expect(combined).not.toContain("classifySaudiTaxInvoice");
    expect(combined).not.toMatch(/\bfatoora\b/i);
    expect(combined).not.toContain("previousInvoiceHash");
    expect(combined).not.toContain("insertCollectionFact");
    expect(combined).not.toContain("updateCollectionFact");
  });

  it("Paid Receipt dialog remains available for non-Saudi and is not deleted", () => {
    expect(read(PANEL)).toContain("CashierPaidReceiptDialog");
    expect(existsSync(join(repoRoot, RECEIPT))).toBe(true);
    expect(read(RECEIPT)).toContain("cashier-paid-receipt-print");
    expect(
      existsSync(
        join(
          repoRoot,
          "docs/engineering/programs/SAUDI-TAX-INVOICE-CASHIER-DOCUMENT-UNIFICATION-1"
        )
      )
    ).toBe(true);
  });

  it("keeps Saudi document policy out of Customer Core and PaymentConfirm", () => {
    expect(read("server/customer/CustomerService.ts")).not.toContain(
      "isSaudiEInvoiceCustomerFacingDocument"
    );
    expect(
      read("server/operational-session/payment/PaymentConfirmService.ts")
    ).not.toContain("isSaudiEInvoiceCustomerFacingDocument");
    expect(
      read(
        "server/operational-session/payment/collection-fact/collectionFactRepository.ts"
      )
    ).not.toContain("isSaudiEInvoiceCustomerFacingDocument");
  });
});
