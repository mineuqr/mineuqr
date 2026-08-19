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
const RECEIPT = "client/src/components/settlement-record/SettlementReceiptDialog.tsx";

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
      completeFn.indexOf("setPaidCheckout")
    );
    expect(completeFn).not.toContain("window.print()");
  });

  it("prints from Settlement Record after Paid and hides Cashier chrome", () => {
    const panel = read(PANEL);
    const receipt = read(RECEIPT);
    expect(panel).toContain("SettlementReceiptDialog");
    expect(panel).toContain("print:hidden");
    expect(panel.indexOf("print:hidden")).toBeLessThan(
      panel.indexOf("<SettlementReceiptDialog")
    );
    expect(panel).not.toContain("تأكيد الدفع والطباعة");
    expect(panel).not.toContain("pos_revenue");
    expect(panel).not.toContain("pos_sales");
    expect(receipt).toContain("useSettlementRecordReceipt");
    expect(receipt).toContain("window.print()");
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
