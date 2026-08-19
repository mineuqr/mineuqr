/**
 * CASHIER-ORDER-CONFIRMATION-PAYMENT-FLOW-1 — two-stage Order → Payment guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cashierUiLabel } from "../cashierCopy";
import { SELECTABLE_PAYMENT_METHODS } from "@shared/operational-session";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const COPY = "client/src/lib/cashier-workspace/cashierCopy.ts";
const SALE = "server/pos/services/PosSaleService.ts";

describe("CASHIER-ORDER-CONFIRMATION-PAYMENT-FLOW-1", () => {
  it("names Payment as the sale CTA and Confirm Payment as the financial commit", () => {
    expect(cashierUiLabel("placeSale", "ar")).toBe("الدفع");
    expect(cashierUiLabel("placeSale", "en")).toBe("Payment");
    expect(cashierUiLabel("confirmPayment", "ar")).toBe("تأكيد الدفع");
    expect(cashierUiLabel("paidSuccess", "ar")).toBe("تم الدفع بنجاح");
    expect(cashierUiLabel("cancelPayment", "ar")).toBe("إلغاء");
    const copy = read(COPY);
    expect(copy).not.toContain("تأكيد البيع");
    expect(copy).not.toContain("Place sale");
    expect(copy).not.toContain("Confirm order");
  });

  it("keeps Payment CTA on pos.sale.create and Confirm Payment on settlement.initiate", () => {
    const panel = read(PANEL);
    const sale = read(SALE);
    const placeSaleFn = panel.slice(
      panel.indexOf("async function placeSale"),
      panel.indexOf("async function completePayment")
    );
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(placeSaleFn).toContain("saleMutation.mutateAsync");
    expect(placeSaleFn).toContain('setSalePhase("payment")');
    expect(placeSaleFn).not.toContain("settleMutation");
    expect(completeFn).toContain("settleMutation.mutateAsync");
    expect(completeFn).not.toContain("directSale?.totalAmount");
    expect(sale).toContain("awaitRelay: false");
    expect(sale).toContain("enrollCheck: false");
    expect(sale).not.toContain("settleCheckPaid");
  });

  it("shows Check.grandTotal as amount due and does not invent tax or card brands", () => {
    const panel = read(PANEL);
    expect(panel).toContain("trpc.pos.read.check.getByOrder");
    expect(panel).toContain("previewGrandTotal");
    expect(panel).not.toContain("amountDueIsOrderFallback");
    expect(panel).not.toContain("settlementRow?.outstandingAmount");
    expect(panel).toContain("tenderCash");
    expect(SELECTABLE_PAYMENT_METHODS).toEqual(["cash", "card"]);
    expect(panel).not.toContain("mada");
    expect(panel).not.toContain("apple_pay");
    expect(panel).not.toContain("stc_pay");
    expect(panel).not.toMatch(/0\.15|\* 15/);
    expect(panel).not.toContain('t("ticketTax")');
    expect(panel).not.toContain("voidCheck");
    expect(panel).not.toContain("trpc.order.cancel");
  });

  it("keeps Cancel as presentation-only close of the payment sheet", () => {
    const panel = read(PANEL);
    const cancelFn = panel.slice(
      panel.indexOf("function cancelPaymentSheet"),
      panel.indexOf("function resumePaymentSheet")
    );
    expect(cancelFn).toContain('setSalePhase("ticket")');
    expect(cancelFn).not.toContain("mutateAsync");
    expect(cancelFn).not.toContain("trpc.order.cancel");
  });
});
