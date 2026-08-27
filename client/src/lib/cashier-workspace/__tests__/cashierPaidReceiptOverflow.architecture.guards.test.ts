/**
 * CASHIER-PAID-RECEIPT-OVERFLOW-UX-1 — on-screen scroll vs print completeness.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const DIALOG =
  "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx";
const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const PROJECTION =
  "server/operational-session/payment/cashierPaidReceiptProjection.ts";
const INITIATE = "server/pos/services/PosSettlementInitiateService.ts";
const INDEX_CSS = "client/src/index.css";

describe("CASHIER-PAID-RECEIPT-OVERFLOW-UX-1 architecture guards", () => {
  it("keeps the dialog in the viewport and scrolls only the receipt body", () => {
    const dialog = read(DIALOG);
    expect(dialog).toContain("CASHIER-PAID-RECEIPT-OVERFLOW-UX-1");
    expect(dialog).toContain("max-h-[90dvh]");
    expect(dialog).toContain("flex-col");
    expect(dialog).toContain("overflow-hidden");
    expect(dialog).toContain('id="cashier-paid-receipt-print"');
    expect(dialog).toContain("overflow-y-auto");
    expect(dialog).toContain("shrink-0 print:hidden");

    const printRoot = dialog.slice(
      dialog.indexOf('id="cashier-paid-receipt-print"'),
      dialog.indexOf("flex shrink-0 gap-2 print:hidden")
    );
    expect(printRoot).toContain("overflow-y-auto");
    expect(printRoot).not.toContain("window.print()");
    expect(printRoot).not.toContain('t("receiptClose")');

    const footer = dialog.slice(
      dialog.indexOf("flex shrink-0 gap-2 print:hidden")
    );
    expect(footer).toContain("{t(\"receiptClose\")}");
    expect(footer).toContain("window.print()");
    expect(footer).not.toContain("overflow-y-auto");
  });

  it("prints the complete snapshot instead of the on-screen scroll clip", () => {
    const dialog = read(DIALOG);
    const css = read(INDEX_CSS);
    expect(dialog).toContain("print:overflow-visible");
    expect(dialog).toContain("print:max-h-none");
    expect(dialog).toContain("print:h-auto");
    expect(css).toContain("CASHIER-PAID-RECEIPT-OVERFLOW-UX-1");
    expect(css).toContain("#cashier-paid-receipt-print");
    expect(css).toContain("overflow: visible !important");
    expect(css).not.toContain("body.printing-shift-closing #cashier-paid-receipt-print");
    expect(dialog).toContain("receipt.lines.map");
    expect(dialog).not.toContain(".slice(");
    expect(dialog).not.toContain("maxLines");
    expect(dialog).not.toContain("line-clamp");
    expect(dialog).toContain("line.unitPrice");
    expect(dialog).toContain("line.quantity");
    expect(dialog).toContain("receipt.subtotal");
    expect(dialog).toContain("receipt.discountAmount");
    expect(dialog).toContain("receipt.taxAmount");
    expect(dialog).toContain("receipt.grandTotal");
    expect(dialog).toContain("receipt.tenders.map");
    expect(dialog).toContain("receipt.displayReference");
    expect(dialog).toContain("receipt.invoiceNumber");
    expect(dialog).toContain("receiptOrderNumber");
    expect(dialog).toContain("formatCashierReceiptDateTime");
    expect(dialog).toContain("receipt.cashierDisplayName");
    expect(dialog).toContain("receipt.terminalId");
    expect(dialog).toContain("dir={language === \"ar\" ? \"rtl\" : \"ltr\"}");
  });

  it("does not gate Print on Settlement Record or change PAID / financial paths", () => {
    const dialog = read(DIALOG);
    const panel = read(PANEL);
    expect(dialog).toContain("window.print()");
    expect(dialog).not.toContain("settlementRecordId");
    expect(dialog).not.toContain("useSettlementRecordReceipt");
    expect(dialog).not.toContain("settlementRecord.getReceipt");
    expect(dialog).not.toContain("trpc.pos.read.check");
    expect(dialog).not.toContain("collectionFact");
    expect(dialog).not.toContain("mutateAsync");
    expect(dialog).toContain("onOpenChange(false)");
    expect(dialog).not.toContain("startNewSale");
    expect(dialog).not.toContain("setPaidReceipt");

    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("result.paidReceipt");
    expect(completeFn).not.toContain("if (paid.settlementRecordId)");

    expect(read(PROJECTION)).toContain("buildCashierPaidReceiptProjection");
    expect(read(INITIATE)).toContain("paidReceipt");
  });
});
