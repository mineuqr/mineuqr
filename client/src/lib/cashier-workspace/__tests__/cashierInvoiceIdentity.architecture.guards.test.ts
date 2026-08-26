/**
 * CASHIER-PASS-2-INVOICE-IDENTITY-1 — identity / retry / Confirm order guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";
const VISIBILITY = "server/order/read/cashierPosOperationalVisibility.ts";

describe("CASHIER-PASS-2-INVOICE-IDENTITY-1", () => {
  it("resumes Payment without sale.create when the ticket matches the prepared invoice", () => {
    const panel = read(PANEL);
    const placeSaleFn = panel.slice(
      panel.indexOf("function placeSale"),
      panel.indexOf("async function completePayment")
    );
    expect(placeSaleFn).toContain("cashierCatalogTicketMatchesInvoiceLines");
    expect(placeSaleFn).toContain("resumePaymentSheet");
    expect(placeSaleFn).not.toContain("saleMutation.mutateAsync");
    expect(placeSaleFn).not.toContain("trpc.pos.sale.replace");
    expect(placeSaleFn).not.toContain("replaceItems");
    expect(panel).not.toContain("ensureCheckForOrder");
  });

  it("keeps the Confirm key across a lost response and does not mint a new key on retry", () => {
    const panel = read(PANEL);
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("writeCashierPendingSaleAttempt");
    expect(completeFn).toContain("if (!settleKeyRef.current)");
    expect(completeFn).toContain("cashierTicketMatchesSaleAttempt");
    expect(completeFn).toContain("idempotencyKey: settleKeyRef.current");
    expect(completeFn).not.toContain("idempotencyKey: newCashierIdempotencyKey");
    const catchFn = completeFn.slice(completeFn.indexOf("} catch (error)"));
    expect(catchFn).not.toContain("settleKeyRef.current = null");
    expect(catchFn).not.toContain("clearCashierPendingSaleAttempt");
  });

  it("Confirm sends prepared invoice items, not a preexisting Order id or live ticket totals", () => {
    const panel = read(PANEL);
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("items: confirmItems");
    expect(completeFn).not.toContain("orderId: selectedOrderId");
    expect(completeFn).not.toContain("orderId: paymentOrderId");
    expect(completeFn).not.toContain("ticketLines: ticket");
    expect(completeFn).not.toContain("directSale?.totalAmount");
    expect(completeFn).toContain("billDiscountAmount: directSale.money.billDiscountAmount");
    expect(completeFn).not.toContain("billDiscountAmount: ticketDiscount");
    expect(read(SETTLE)).toContain("finalizeCashierPreparedInvoice");
    expect(read(SETTLE)).toContain("idempotency_conflict");
  });

  it("does not invent unpaid-order supersession; unpaid cashier_pos stays off operational lists until paid", () => {
    const panel = read(PANEL);
    const visibility = read(VISIBILITY);
    expect(panel).not.toContain("trpc.order.cancel");
    expect(panel).not.toContain("advanceStatus");
    expect(panel).not.toContain("supersede");
    expect(visibility).toContain("cashierPosPaidOperationalVisibilitySql");
    expect(visibility).toContain("productionCollectionFact");
  });
});
