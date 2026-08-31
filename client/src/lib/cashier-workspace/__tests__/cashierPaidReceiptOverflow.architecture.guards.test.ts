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
    expect(footer).toContain("printCashierPaidReceipt()");
    expect(footer).not.toContain("overflow-y-auto");
  });

  it("prints the complete snapshot instead of the on-screen scroll clip", () => {
    const dialog = read(DIALOG);
    const css = read(INDEX_CSS);
    const receiptLib = read(
      "client/src/lib/cashier-workspace/cashierPaidReceipt.ts"
    );
    expect(dialog).toContain("print:overflow-visible");
    expect(dialog).toContain("print:max-h-none");
    expect(dialog).toContain("print:h-auto");
    expect(css).toContain("CASHIER-PAID-RECEIPT-OVERFLOW-UX-1");
    expect(css).toContain("CASHIER-PAID-RECEIPT-PRINT-ISOLATION-1");
    expect(css).toContain("#cashier-paid-receipt-print");
    expect(css).toContain("body.printing-cashier-paid-receipt");
    expect(css).toContain("max-width: 72.1mm");
    expect(css).toContain("display: none !important");
    expect(css).not.toContain("body.printing-shift-closing #cashier-paid-receipt-print");
    expect(receiptLib).toContain("printCashierPaidReceipt");
    expect(receiptLib).toContain("CASHIER_PAID_RECEIPT_PRINT_BODY_CLASS");
    expect(dialog).toContain("printCashierPaidReceipt()");
    expect(dialog).not.toContain("window.print()");
    expect(dialog).toContain("receipt.lines.map");
    expect(dialog).not.toContain(".slice(");
    expect(dialog).not.toContain("maxLines");
    expect(dialog).not.toContain("line-clamp");
    expect(dialog).toContain("line.unitPrice");
    expect(dialog).toContain("line.quantity");
    expect(dialog).toContain("line.lineTotal");
    expect(dialog).toContain("cashier-receipt-lines");
    expect(dialog).toContain("table-fixed");
    expect(dialog).toContain("whitespace-nowrap");
    expect(dialog).toContain("text-xs");
    expect(dialog).not.toContain("text-[11px]");
    expect(dialog).toContain("cashier-receipt-restaurant-name");
    expect(dialog).toContain("formatCashierReceiptRestaurantHeading");
    expect(dialog).not.toContain('t("receiptPaidStamp")');
    expect(dialog).toContain('t("paidTitle")');
    expect(dialog).toContain("cashier-receipt-product");
    expect(dialog).toContain("text-sm font-medium");
    expect(dialog).toContain("cashier-receipt-qty");
    expect(dialog).toContain("formatCashierReceiptLineAmount");
    const itemRows = dialog.slice(
      dialog.indexOf("receipt.lines.map"),
      dialog.indexOf("space-y-1 border-t border-[#111827] pt-3")
    );
    expect(itemRows).toContain("formatCashierReceiptLineAmount(line.unitPrice)");
    expect(itemRows).toContain("formatCashierReceiptLineAmount(line.lineTotal)");
    expect(itemRows).not.toContain("formatCashierReceiptMoney(");
    expect(dialog).toContain("formatCashierReceiptMoney(");
    expect(dialog).toContain("bg-white");
    expect(dialog).not.toContain("break-words");
    expect(dialog).not.toContain("break-all");
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
    // One Items column header only (no duplicate section title + header)
    expect(dialog.match(/t\("receiptItems"\)/g)?.length).toBe(1);
    expect(receiptLib).toContain("installCashierPaidReceiptPageStyle");
    expect(receiptLib).toContain("CASHIER_PAID_RECEIPT_PAPER_WIDTH_MM = 72.1");
    expect(receiptLib).toContain("CASHIER_PAID_RECEIPT_PAPER_HEIGHT_MM = 180");
    expect(receiptLib).toContain("CASHIER_PAID_RECEIPT_PAPER_WIDTH_MM}mm");
    expect(receiptLib).toContain("margin: 0");
    expect(css).toContain("CASHIER-PAID-RECEIPT-RENDER-STABILITY-1");
    expect(css).toContain("white-space: nowrap !important");
    expect(css).toContain("word-break: normal");
    expect(css).toContain("cashier-receipt-qty");
    expect(css).toContain("width: 44%");
  });

  it("does not gate Print on Settlement Record or change PAID / financial paths", () => {
    const dialog = read(DIALOG);
    const panel = read(PANEL);
    expect(dialog).toContain("printCashierPaidReceipt()");
    expect(dialog).not.toContain("window.print()");
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
