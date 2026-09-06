/**
 * SAUDI-TAX-INVOICE-CASHIER-POST-PAYMENT-PERFORMANCE-1 — architecture guards.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SAUDI-TAX-INVOICE-CASHIER-POST-PAYMENT-PERFORMANCE-1", () => {
  it("payment does not await compliance Tax Invoice generation", () => {
    const dispatch = read(
      "server/compliance/dispatchComplianceAfterProductionCollectionFact.ts"
    );
    const continueAfter = read("server/_core/continueAfterHttp.ts");
    const finalize = read(
      "server/pos/services/finalizeCashierPreparedInvoice.ts"
    );
    expect(dispatch).toContain("continueAfterHttp");
    expect(continueAfter).toContain("waitUntil");
    expect(finalize).toContain("dispatchComplianceAfterProductionCollectionFact");
    expect(finalize).toContain("afterCompliance");
    expect(finalize).not.toMatch(
      /await\s+dispatchComplianceAfterProductionCollectionFact/
    );
  });

  it("Cashier Phase 1 poll skips HTML QR PNG and uses sub-second interval", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const view = read(
      "server/compliance/saudi-tax-invoice/saudiTaxInvoicePhase1ViewService.ts"
    );
    expect(panel).toContain("includeHtml: false");
    expect(panel).toContain("return 300");
    expect(panel).not.toMatch(/return 1_000/);
    expect(view).toContain("includeHtml === true");
    expect(view).toContain("renderSaudiPhase1InvoiceHtml");
    expect(panel).toContain("queueMicrotask");
    expect(panel).toContain("setTaxInvoiceOpen(true)");
    expect(panel.indexOf("setTaxInvoiceOpen(true)")).toBeLessThan(
      panel.indexOf("endCashierPaymentFlow(\"completed\")")
    );
  });

  it("does not reintroduce dual customer-facing Saudi invoices or Phase 2", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const receipt = read(
      "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx"
    );
    expect(panel).toContain("isSaudiEInvoiceCustomerFacingDocument");
    expect(receipt).not.toContain("taxInvoiceView");
    expect(panel).not.toContain("buildSaudiPhase1QrPayloadBase64");
    expect(panel).not.toMatch(/\bfatoora\b/i);
    expect(panel).not.toContain("previousInvoiceHash");
  });

  it("keeps financial services free of Cashier Tax Invoice wait coupling", () => {
    expect(
      read("server/operational-session/payment/PaymentConfirmService.ts")
    ).not.toContain("getPhase1ByOrder");
    expect(
      read(
        "server/operational-session/payment/collection-fact/collectionFactRepository.ts"
      )
    ).not.toContain("getPhase1ByOrder");
    expect(
      existsSync(
        join(
          repoRoot,
          "docs/engineering/programs/SAUDI-TAX-INVOICE-CASHIER-POST-PAYMENT-PERFORMANCE-1"
        )
      )
    ).toBe(true);
  });
});
