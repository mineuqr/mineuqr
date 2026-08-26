/**
 * CASHIER-PAYMENT-FLOW-IMPLEMENTATION-1 — architecture guards.
 * Protects Cashier UX + existing financial/operational boundaries.
 * Does not rewrite CheckService, Payment, Settlement, Refund, or Order.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cashierUiLabel } from "../cashierCopy";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const COPY = "client/src/lib/cashier-workspace/cashierCopy.ts";
const DTO = "server/pos/read/posCheckDto.ts";
const CHECK_READ = "server/pos/services/PosCheckReadService.ts";
const SALE = "server/pos/services/PosSaleService.ts";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";
const VISIBILITY = "server/order/read/cashierPosOperationalVisibility.ts";
const TICKET = "client/src/lib/cashier-workspace/cashierTicketTotals.ts";
const READY = "client/src/lib/cashier-workspace/cashierPaymentReadiness.ts";

describe("CASHIER-PAYMENT-FLOW-IMPLEMENTATION-1 architecture", () => {
  it("keeps Payment inside the Cashier workspace and does not add Bill or Payment screens", () => {
    const panel = read(PANEL);
    const copy = read(COPY);
    const types = read("client/src/components/dashboard/layout/types.ts");
    expect(cashierUiLabel("placeSale", "en")).toBe("Payment");
    expect(cashierUiLabel("confirmPayment", "en")).toBe("Confirm payment");
    expect(cashierUiLabel("title", "en")).toBe("Cashier");
    expect(panel).toContain("cashierPos.overlay");
    expect(panel).toContain('setSalePhase("payment")');
    expect(panel).toContain("trpc.pos.settlement.initiate");
    expect(panel).not.toContain("BillEngine");
    expect(panel).not.toContain("PaymentEngine");
    expect(panel).not.toContain("CashierFinancialEngine");
    expect(copy).not.toContain("PaymentEngine");
    expect(copy).not.toContain("BillEngine");
    expect(types).not.toContain('| "bill"');
    expect(types).not.toContain('| "payment"');
    expect(panel).not.toContain('t("checkLabel")');
    expect(panel).not.toContain('t("checkAmountDue")');
    expect(panel).not.toContain('t("preparingCheck")');
    expect(panel).not.toContain('t("invoiceNumber")');
    expect(panel).not.toContain('t("afterPayment")');
    expect(panel).not.toContain('t("unpaidOrderHint")');
    expect(panel).not.toContain('t("intakeCheck")');
    expect(panel).not.toContain('t("initiateSettlement")');
  });

  it("shows invoice preview figures on payment and does not invent ticket tax authority", () => {
    const panel = read(PANEL);
    const dto = read(DTO);
    const checkRead = read(CHECK_READ);
    const ticket = read(TICKET);
    const ready = read(READY);
    expect(panel).toContain("previewGrandTotal");
    expect(panel).toContain("invoiceView.money");
    expect(panel).not.toContain("orderCheck?.subtotal");
    expect(panel).not.toContain("orderCheck?.taxAmount");
    expect(panel).not.toContain("orderCheck?.billDiscountAmount");
    expect(panel).toContain("paymentReadiness.confirmDisabled");
    expect(panel).not.toContain("amountDueIsOrderFallback");
    expect(panel).not.toContain('t("ticketTax")');
    expect(panel).not.toMatch(/0\.15|\* 15/);
    expect(ticket).toContain("Display-only ticket arithmetic");
    expect(ticket).not.toContain("computeCheckMoney");
    expect(ready).toContain("previewGrandTotal");
    expect(ready).not.toContain("computeCheckMoney");
    expect(dto).toContain("billDiscountAmount");
    expect(dto).not.toContain("computeCheckMoney");
    expect(checkRead).toContain("billDiscountAmount");
    expect(checkRead).not.toContain("computeCheckMoney");
    expect(checkRead).not.toContain("getOrdersByIds");
  });

  it("persists cashier_pos Order as the invoice and lists it operationally only after Paid", () => {
    const panel = read(PANEL);
    const sale = read(SALE);
    const settle = read(SETTLE);
    const visibility = read(VISIBILITY);
    const placeSaleFn = panel.slice(
      panel.indexOf("async function placeSale"),
      panel.indexOf("async function completePayment")
    );
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(placeSaleFn.indexOf("saleMutation.mutateAsync")).toBeLessThan(
      placeSaleFn.indexOf('setSalePhase("payment")')
    );
    expect(placeSaleFn).not.toContain("settleMutation");
    expect(completeFn).toContain("settleMutation.mutateAsync");
    expect(completeFn).not.toContain("directSale?.totalAmount");
    expect(sale).toContain("enrollCheck: false");
    expect(sale).toContain("awaitRelay: false");
    expect(settle).toContain("confirmPayment");
    expect(
      read("server/operational-session/payment/PaymentConfirmService.ts")
    ).toContain("settleCheckPaidByIdDetailed");
    expect(visibility).toContain("cashierPosPaidOperationalVisibilitySql");
    expect(visibility).toContain('"paid"');
    expect(visibility).toContain('"complimentary"');
    expect(visibility).toContain("ORDERING_CHANNEL_CASHIER_POS");
  });

  it("does not add a payments table, a second settlement store, or a Refund redesign", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0095_check_charges");
    expect(journal).toContain("0096_payment_collection_facts");
    expect(journal).not.toContain("0096_payments");
    const drizzleFiles = readdirSync(join(repoRoot, "drizzle"));
    expect(drizzleFiles).toContain("0096_payment_collection_facts.sql");
    expect(drizzleFiles.some((name) => name.startsWith("0096_payments"))).toBe(false);
    expect(existsSync(join(repoRoot, "drizzle/0096_payments.sql"))).toBe(false);
    const panel = read(PANEL);
    expect(panel).not.toContain("trpc.refund");
    expect(panel).not.toContain("createRefund");
    expect(read(SETTLE)).not.toContain("PaymentEngine");
    expect(read("server/operational-session/check/CheckService.ts")).not.toContain(
      "CashierFinancialEngine"
    );
  });
});
