/**
 * CASHIER-CHECKOUT-PRINT-FLOW-1 — checkout, cancel, idempotency, receipt guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const COPY = "client/src/lib/cashier-workspace/cashierCopy.ts";
const SALE = "server/pos/services/PosSaleService.ts";
const RECEIPT =
  "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx";
const SESSION_RECEIPT =
  "client/src/components/settlement-record/SettlementReceiptDialog.tsx";
const HISTORY =
  "client/src/components/settlement-record/SettlementHistoryPanel.tsx";

describe("CASHIER-CHECKOUT-PRINT-FLOW-1 architecture guards", () => {
  it("cancels payment presentation without financial mutations", () => {
    const panel = read(PANEL);
    const copy = read(COPY);
    expect(copy).toContain('cancelPayment: { ar: "إلغاء"');
    expect(panel).toContain("function cancelPaymentSheet");
    expect(panel).toContain("function resumePaymentSheet");
    const cancelFn = panel.slice(
      panel.indexOf("function cancelPaymentSheet"),
      panel.indexOf("function resumePaymentSheet")
    );
    expect(cancelFn).toContain('setSalePhase("ticket")');
    expect(cancelFn).not.toContain("mutateAsync");
    expect(cancelFn).not.toContain("voidCheck");
    expect(cancelFn).not.toContain("trpc.order.cancel");
    expect(cancelFn).not.toContain("trpc.refund");
  });

  it("reuses stable sale and settle idempotency keys instead of minting per click", () => {
    const panel = read(PANEL);
    const placeSaleFn = panel.slice(
      panel.indexOf("async function placeSale"),
      panel.indexOf("async function completePayment")
    );
    expect(placeSaleFn).toContain("saleKeyRef.current");
    expect(placeSaleFn).toContain("idempotencyKey: saleKeyRef.current");
    expect(placeSaleFn).not.toContain("idempotencyKey: newCashierIdempotencyKey");
    expect(placeSaleFn).toContain('setSalePhase("payment")');
    expect(placeSaleFn).not.toContain("invalidateOrderReads");

    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("settleKeyRef.current");
    expect(completeFn).not.toContain('idempotencyKey: newCashierIdempotencyKey("settle")');
    expect(completeFn).toContain("settleMutation.mutateAsync");
    expect(completeFn.indexOf("settleMutation.mutateAsync")).toBeLessThan(
      completeFn.indexOf("setPaidReceipt")
    );
    expect(completeFn).not.toContain("window.print()");
  });

  it("prints the preserved paid invoice after HTTP success without Settlement Record", () => {
    const panel = read(PANEL);
    const receipt = read(RECEIPT);
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    const startNewSaleFn = panel.slice(
      panel.indexOf("function startNewSale"),
      panel.indexOf("function cancelPaymentSheet")
    );
    expect(panel).toContain("CashierPaidReceiptDialog");
    expect(panel).not.toContain("SettlementReceiptDialog");
    expect(panel).toContain("print:hidden");
    expect(panel.indexOf("print:hidden")).toBeLessThan(
      panel.indexOf("<CashierPaidReceiptDialog")
    );
    expect(completeFn).toContain("buildCashierPaidReceiptSnapshot");
    expect(completeFn).toContain("startNewSale()");
    expect(completeFn).toContain("setPaidReceipt(receipt)");
    expect(completeFn).toContain("setPrintOpen(true)");
    expect(completeFn.indexOf("startNewSale()")).toBeLessThan(
      completeFn.indexOf("setPrintOpen(true)")
    );
    expect(completeFn).not.toContain("if (paid.settlementRecordId)");
    expect(completeFn).not.toContain("settlementRecord.getReceipt");
    expect(startNewSaleFn).not.toContain("setPrintOpen(false)");
    expect(startNewSaleFn).not.toContain("setPaidReceipt");
    expect(panel).not.toContain("تأكيد الدفع والطباعة");
    expect(panel).not.toContain("pos_revenue");
    expect(panel).not.toContain("pos_sales");
    expect(receipt).not.toContain("useSettlementRecordReceipt");
    expect(receipt).not.toContain("settlementRecord.getReceipt");
    expect(receipt).toContain("window.print()");
    expect(read(HISTORY)).toContain("SettlementReceiptDialog");
    expect(read(SESSION_RECEIPT)).toContain("useSettlementRecordReceipt");
    expect(read("client/src/lib/settlement-record-presentation/useSettlementRecordQueries.ts")).toContain(
      "trpc.settlementRecord.getReceipt"
    );
  });

  it("does not wait for post-commit sale mapping read on the HTTP path", () => {
    const sale = read(SALE);
    expect(sale).toContain("enrollCheck: false");
    expect(sale).toContain("awaitRelay: false");
    expect(sale).not.toContain("const stored = await this.idempotency.get");
    expect(sale).toContain("placed.order.id");
  });
});
