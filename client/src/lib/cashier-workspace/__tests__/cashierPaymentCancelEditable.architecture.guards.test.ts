/**
 * CASHIER-PAYMENT-CANCEL-RETURN-TO-EDITABLE-1 — Cancel restores editing.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const VIEW = "client/src/lib/cashier-workspace/cashierInvoiceView.ts";
const STORAGE = "client/src/lib/cashier-workspace/cashierDirectSaleStorage.ts";
const DIALOG =
  "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx";

describe("CASHIER-PAYMENT-CANCEL-RETURN-TO-EDITABLE-1 architecture guards", () => {
  it("Cancel Payment restores catalog editing on the same Order without PAID", () => {
    const panel = read(PANEL);
    const cancelFn = panel.slice(
      panel.indexOf("function cancelPaymentSheet"),
      panel.indexOf("function resumePaymentSheet")
    );
    expect(panel).toContain("CASHIER-PAYMENT-CANCEL-RETURN-TO-EDITABLE-1");
    expect(cancelFn).toContain('setSalePhase("ticket")');
    expect(cancelFn).toContain("catalogTicketFromInvoiceLines");
    expect(cancelFn).not.toContain("setDirectSale(null)");
    expect(cancelFn).not.toContain("startNewSale");
    expect(cancelFn).not.toContain("setPaidReceipt");
    expect(cancelFn).not.toContain("setPrintOpen");
    expect(cancelFn).not.toContain("mutateAsync");
    expect(cancelFn).not.toContain("settlement.initiate");
    expect(cancelFn).not.toContain("trpc.pos.read.check");
    expect(panel).toContain("cashierCatalogTicketMatchesInvoiceLines");
    expect(panel).toContain("resumePaymentSheet()");
    expect(panel).toContain('if (salePhase === "payment" || paidCheckout) return current');
    expect(panel).toContain("disabled={salePhase === \"payment\" || Boolean(paidCheckout)}");
    expect(panel).not.toContain("disabled={Boolean(directSale)}");
    expect(read(VIEW)).toContain("catalogTicketFromInvoiceLines");
    expect(read(STORAGE)).toContain('"ticket" | "payment" | "paid"');
  });

  it("does not show P# / invoice date / time on the left editable SALE/INVOICE", () => {
    const panel = read(PANEL);
    const aside = panel.slice(
      panel.indexOf("cashierPos.aside"),
      panel.indexOf("cashierPos.overlay")
    );
    expect(aside).not.toContain('t("receiptInvoiceNumber")');
    expect(aside).not.toContain('t("receiptDate")');
    expect(aside).not.toContain('t("receiptTime")');
    expect(aside).not.toContain("invoiceView.displayReference");
    expect(aside).not.toContain("invoiceWhen");
    const overlay = panel.slice(panel.indexOf("cashierPos.overlay"));
    expect(overlay).not.toContain('t("receiptInvoiceNumber")');
    expect(overlay).not.toContain("directSale.displayReference");
    expect(overlay).not.toContain('t("receiptDate")');
    expect(overlay).not.toContain('t("receiptTime")');
    expect(read(DIALOG)).toContain("receipt.displayReference");
    expect(read(DIALOG)).toContain("formatCashierReceiptDateTime");
  });

  it("does not add financial queries or a second tax engine for Cancel", () => {
    const panel = read(PANEL);
    const cancelFn = panel.slice(
      panel.indexOf("function cancelPaymentSheet"),
      panel.indexOf("function resumePaymentSheet")
    );
    expect(cancelFn).not.toContain("getOrderById");
    expect(cancelFn).not.toContain("findProductionCollectionFact");
    expect(cancelFn).not.toContain("getCheckById");
    expect(cancelFn).not.toContain("settlementRecord");
    expect(panel).not.toContain("trpc.pos.sale.replace");
    expect(panel).not.toContain("computeCheckMoney(");
    expect(panel).toContain("projectCashierSaleInvoiceMoney");
    expect(panel).toContain("settleMutation.mutateAsync");
  });
});
