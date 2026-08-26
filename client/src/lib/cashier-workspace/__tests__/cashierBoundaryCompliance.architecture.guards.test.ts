/**
 * CASHIER-PASS-2-BOUNDARY-COMPLIANCE-AND-HARDENING-1
 * Approved: الدفع → commercial invoice (sale.create) → Payment UI → Confirm → CF/PAID
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
const CONFIRM = "server/operational-session/payment/PaymentConfirmService.ts";
const DIALOG =
  "client/src/components/cashier-workspace/CashierPaidReceiptDialog.tsx";

describe("CASHIER-PASS-2-BOUNDARY-COMPLIANCE-AND-HARDENING-1", () => {
  it("opens Payment UI only after sale.create commercial invoice persist", () => {
    const panel = read(PANEL);
    const placeSaleFn = panel.slice(
      panel.indexOf("async function placeSale"),
      panel.indexOf("async function completePayment")
    );
    expect(placeSaleFn.indexOf("saleMutation.mutateAsync")).toBeLessThan(
      placeSaleFn.indexOf('setSalePhase("payment")')
    );
    expect(read(SALE)).toContain("enrollCheck: false");
    expect(placeSaleFn).not.toContain("settlement.initiate");
    expect(placeSaleFn).not.toContain("commitCashierProductionCollectionFact");
    expect(placeSaleFn).not.toContain("createOpenCheck");
    expect(placeSaleFn).not.toContain("replaceItems");
  });

  it("Payment UI payable uses prepared lines plus frozen discount through the shared engine", () => {
    const panel = read(PANEL);
    const view = read(VIEW);
    expect(view).toContain("projectPreparedCashierInvoiceMoney");
    expect(view).toContain("projectCashierSaleInvoiceMoney");
    expect(panel).toContain("applyPreparedPayableDiscount");
    expect(panel).toContain("toCashierSaleCreateMoney");
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain(
      "billDiscountAmount: directSale.money.billDiscountAmount"
    );
    expect(completeFn).not.toContain("billDiscountAmount: ticketDiscount");
    expect(completeFn).not.toContain("ticketLines: ticket");
    expect(completeFn).not.toContain("previewGrandTotal as payable");
  });

  it("does not expose customer-facing invoice number/date/time before paidReceipt", () => {
    const panel = read(PANEL);
    const overlay = panel.slice(panel.indexOf("cashierPos.overlay"));
    const aside = panel.slice(
      panel.indexOf("cashierPos.aside"),
      panel.indexOf("cashierPos.overlay")
    );
    expect(aside).not.toContain('t("receiptInvoiceNumber")');
    expect(aside).not.toContain('t("receiptDate")');
    expect(overlay).not.toContain('t("receiptInvoiceNumber")');
    expect(overlay).not.toContain("directSale.displayReference");
    expect(read(VIEW)).toContain("displayReference: null");
    expect(read(DIALOG)).toContain("receipt.displayReference");
    expect(read(DIALOG)).toContain("formatCashierReceiptDateTime");
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("receipt?.displayReference");
    expect(completeFn.indexOf("settleMutation.mutateAsync")).toBeLessThan(
      completeFn.indexOf("setPrintOpen(true)")
    );
    expect(completeFn).not.toContain("awaitAttribution: true");
    expect(completeFn).not.toContain("if (paid.settlementRecordId)");
  });

  it("Confirm commits Collection Fact before PAID and does not use Check as Cashier SSOT", () => {
    const settle = read(SETTLE);
    const confirm = read(CONFIRM);
    expect(confirm).toContain("commitCashierProductionCollectionFactInTransaction");
    expect(confirm).toContain("awaitAttribution: command.awaitAttribution");
    expect(settle).toContain("awaitAttribution: false");
    expect(settle).toContain("productionCollectionFactByOrderLookup");
    expect(read(SALE)).not.toContain("createAndEnrollCashierPosOpenCheckInTransaction");
    expect(read(PANEL)).not.toContain("trpc.pos.check.intake");
    expect(read(PANEL)).not.toContain("orderCheck?.grandTotal");
  });
});
