/**
 * CASHIER-PASS-2-BOUNDARY-COMPLIANCE-AND-HARDENING-1
 * Approved: الدفع → Payment UI (local) → Confirm → Order+CF/PAID
 * → customer-facing invoice identity on paidReceipt → Print.
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
const SALE = "server/pos/services/PosSaleService.ts";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";
const FINALIZE = "server/pos/services/finalizeCashierPreparedInvoice.ts";
const CONFIRM = "server/operational-session/payment/PaymentConfirmService.ts";
const DIALOG =
  "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx";

describe("CASHIER-PASS-2-BOUNDARY-COMPLIANCE-AND-HARDENING-1", () => {
  it("opens Payment UI without sale.create or financial persist", () => {
    const panel = read(PANEL);
    const placeSaleFn = panel.slice(
      panel.indexOf("function placeSale"),
      panel.indexOf("async function completePayment")
    );
    expect(placeSaleFn).toContain('setSalePhase("payment")');
    expect(placeSaleFn).not.toContain("saleMutation.mutateAsync");
    expect(placeSaleFn).not.toContain("settleMutation");
    expect(placeSaleFn).not.toContain("settlement.initiate");
    expect(placeSaleFn).not.toContain("commitCashierProductionCollectionFact");
    expect(placeSaleFn).not.toContain("createOpenCheck");
    expect(placeSaleFn).not.toContain("replaceItems");
    expect(read(SALE)).toContain("enrollCheck: false");
  });

  it("finalizes Order and Collection Fact together on Confirm", () => {
    const settle = read(SETTLE);
    const finalize = read(FINALIZE);
    const repo = read(
      "server/order/infrastructure/persistence/DrizzleOrderRepository.ts"
    );
    expect(settle).toContain("finalizeCashierPreparedInvoice");
    expect(settle).toContain("findCollectionFactByIdempotency");
    expect(finalize).toContain("enrollCheck: false");
    expect(finalize).toContain("afterPersistInTransaction");
    expect(finalize).toContain("commitCashierProductionCollectionFact");
    expect(finalize).toContain("createDrizzleCollectionFactStore(tx");
    expect(finalize).toContain("freezeCashierPosPayableFromOrder");
    expect(finalize).not.toContain("enrollCheck: true");
    expect(repo).toContain("appendInTransaction");
  });

  it("Payment UI payable uses prepared lines plus frozen discount through the shared engine", () => {
    const panel = read(PANEL);
    const view = read(VIEW);
    expect(view).toContain("projectPreparedCashierInvoiceMoney");
    expect(view).toContain("projectCashierSaleInvoiceMoney");
    expect(view).toContain("mapDraftTicketToPreparedInvoiceLines");
    expect(panel).toContain("applyPreparedPayableDiscount");
    expect(panel).toContain("toCashierSaleCreateMoney");
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain(
      "billDiscountAmount: directSale.money.billDiscountAmount"
    );
    expect(completeFn).toContain("items: confirmItems");
    expect(completeFn).not.toContain("orderId: paymentOrderId");
    expect(completeFn).not.toContain("billDiscountAmount: ticketDiscount");
    expect(completeFn).not.toContain("ticketLines: ticket");
    expect(completeFn).not.toContain("previewGrandTotal as payable");
  });

  it("does not expose customer-facing invoice number/date/time before paidReceipt", () => {
    const panel = read(PANEL);
    const overlay = panel.slice(panel.indexOf("cashierPos.overlay"));
    expect(overlay).not.toContain("directSale.displayReference");
    expect(read(VIEW)).toContain("displayReference: null");
    expect(read(DIALOG)).toContain("receipt.displayReference");
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("receipt?.displayReference");
    expect(completeFn.indexOf("settleMutation.mutateAsync")).toBeLessThan(
      completeFn.indexOf("setPrintOpen(true)")
    );
    expect(read(CONFIRM)).toContain("commitCashierProductionCollectionFact");
  });

  it("Confirm commits Collection Fact before PAID and does not use Check as Cashier SSOT", () => {
    const settle = read(SETTLE);
    const confirm = read(CONFIRM);
    expect(read(FINALIZE)).toContain("commitCashierProductionCollectionFact");
    expect(confirm).toContain("commitCashierProductionCollectionFactInTransaction");
    expect(settle).toContain("awaitAttribution: false");
    expect(settle).toContain("productionCollectionFactByOrderLookup");
    expect(read(SALE)).not.toContain("createAndEnrollCashierPosOpenCheckInTransaction");
    expect(read(PANEL)).not.toContain("trpc.pos.check.intake");
    expect(read(PANEL)).not.toContain("orderCheck?.grandTotal");
  });
});
