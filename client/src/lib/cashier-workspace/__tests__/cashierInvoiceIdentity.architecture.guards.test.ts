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
const SALE = "server/pos/services/PosSaleService.ts";
const VISIBILITY = "server/order/read/cashierPosOperationalVisibility.ts";

describe("CASHIER-PASS-2-INVOICE-IDENTITY-1", () => {
  it("resumes Payment without sale.create when the ticket matches the prepared invoice", () => {
    const panel = read(PANEL);
    const placeSaleFn = panel.slice(
      panel.indexOf("async function placeSale"),
      panel.indexOf("async function completePayment")
    );
    expect(placeSaleFn.indexOf("cashierCatalogTicketMatchesInvoiceLines")).toBeLessThan(
      placeSaleFn.indexOf("saleMutation.mutateAsync")
    );
    expect(placeSaleFn.indexOf("resumePaymentSheet()")).toBeLessThan(
      placeSaleFn.indexOf("saleMutation.mutateAsync")
    );
    expect(placeSaleFn).toContain("saleInFlightRef.current || saleMutation.isPending");
    expect(placeSaleFn).not.toContain("trpc.pos.sale.replace");
    expect(placeSaleFn).not.toContain("replaceItems");
    expect(panel).not.toContain("ensureCheckForOrder");
  });

  it("keeps the sale.create key across a lost response and does not mint a new key on retry", () => {
    const panel = read(PANEL);
    const placeSaleFn = panel.slice(
      panel.indexOf("async function placeSale"),
      panel.indexOf("async function completePayment")
    );
    const catchFn = placeSaleFn.slice(placeSaleFn.indexOf("} catch (error)"));
    expect(placeSaleFn).toContain("writeCashierPendingSaleAttempt");
    expect(placeSaleFn).toContain("if (!saleKeyRef.current)");
    expect(placeSaleFn).toContain("cashierTicketMatchesSaleAttempt");
    expect(catchFn).not.toContain("saleKeyRef.current = null");
    expect(catchFn).not.toContain("clearCashierPendingSaleAttempt");
    expect(placeSaleFn).toContain("idempotencyKey: saleKeyRef.current");
    expect(placeSaleFn).not.toContain("idempotencyKey: newCashierIdempotencyKey");
  });

  it("Confirm uses the prepared Order identity, not the client ticket or a selected list row", () => {
    const panel = read(PANEL);
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("const paymentOrderId = directSale?.orderId");
    expect(completeFn).toContain("orderId: paymentOrderId");
    expect(completeFn).not.toContain("orderId: selectedOrderId");
    expect(completeFn).not.toContain("ticketLines: ticket");
    expect(completeFn).not.toContain("directSale?.totalAmount");
    expect(completeFn).toContain("billDiscountAmount: directSale.money.billDiscountAmount");
    expect(completeFn).not.toContain("billDiscountAmount: ticketDiscount");
    expect(read(SALE)).toContain("fingerprintOf");
    expect(read(SALE)).toContain("idempotency_conflict");
    expect(read(SALE)).toContain("enrollCheck: false");
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
