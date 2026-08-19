/**
 * CASHIER-PAYMENT-FLOW-UX-CORRECTION-1 — architecture guards.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { cashierUiLabel } from "../cashierCopy";
import { SELECTABLE_PAYMENT_METHODS } from "@shared/operational-session";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const MONEY = "client/src/lib/cashier-workspace/cashierTicketMoney.ts";
const READY = "client/src/lib/cashier-workspace/cashierPaymentReadiness.ts";
const INTAKE = "server/pos/services/PosCheckIntakeService.ts";
const ROUTER = "server/pos/api/posRouter.ts";

describe("CASHIER-PAYMENT-FLOW-UX-CORRECTION-1 architecture", () => {
  it("shows tax and discount on the ticket before Payment using computeCheckMoney", () => {
    const panel = read(PANEL);
    const money = read(MONEY);
    expect(panel).toContain("displayCashierTicketMoney");
    expect(panel).toContain("t(\"applyDiscount\")");
    expect(panel).toContain("ticketMoney?.taxAmount");
    expect(money).toContain("computeCheckMoney");
    expect(money).toContain("captureTaxPolicySnapshot");
    expect(money).not.toMatch(/0\.15|\* 15/);
    expect(panel).not.toContain('t("ticketTax")');
    expect(panel).not.toContain('t("taxAtPayment")');
  });

  it("opens the Payment overlay before waiting for sale.create", () => {
    const panel = read(PANEL);
    const placeSaleFn = panel.slice(
      panel.indexOf("async function placeSale"),
      panel.indexOf("async function completePayment")
    );
    expect(panel).toContain('salePhase === "payment"');
    expect(placeSaleFn.indexOf('setSalePhase("payment")')).toBeLessThan(
      placeSaleFn.indexOf("saleMutation.mutateAsync")
    );
    expect(placeSaleFn).not.toContain("settleMutation");
    expect(panel).toContain("t(\"verifyingAmount\")");
    expect(panel).not.toContain('t("preparingPayment")');
  });

  it("presents Cash / Network / Mixed and persists canonical cash|card", () => {
    expect(cashierUiLabel("tenderCash", "ar")).toBe("نقدًا");
    expect(cashierUiLabel("tenderNetwork", "ar")).toBe("شبكة");
    expect(cashierUiLabel("tenderMixed", "ar")).toBe("تسوية");
    const panel = read(PANEL);
    expect(panel).toContain('tenderMode === "mixed"');
    expect(panel).toContain("tenderMode != null");
    expect(panel).toContain("remainingShown");
    expect(panel).toContain('setPaymentMethod("card")');
    expect(SELECTABLE_PAYMENT_METHODS).toEqual(["cash", "card"]);
    expect(panel).not.toContain("mada");
    expect(panel).not.toContain("apple_pay");
    expect(read(READY)).toContain("previewGrandTotal");
    expect(read(READY)).not.toContain("computeCheckMoney");
  });

  it("keeps Confirm on pos.settlement.initiate and sends discount intent, not browser totals", () => {
    const panel = read(PANEL);
    const intake = read(INTAKE);
    const router = read(ROUTER);
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("settleMutation.mutateAsync");
    expect(completeFn).toContain("billDiscountAmount: ticketDiscount");
    expect(completeFn).not.toContain("ticketMoney");
    expect(completeFn).not.toContain("paymentDisplayMoney");
    expect(completeFn).not.toContain("directSale?.totalAmount");
    expect(intake).toContain("billDiscountAmount");
    expect(intake).toContain("ensureCheckForOrder");
    expect(intake).not.toMatch(/grandTotal:\s*input/);
    expect(router.indexOf("const moneyAmountInput")).toBeGreaterThan(-1);
    expect(router).toContain("billDiscountAmount: input.billDiscountAmount");
    expect(router).not.toContain("PaymentEngine");
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0095_check_charges");
    expect(journal).not.toContain("0096_");
    const drizzleFiles = readdirSync(join(repoRoot, "drizzle"));
    expect(drizzleFiles.some((name) => name.startsWith("0096"))).toBe(false);
    expect(existsSync(join(repoRoot, "drizzle/0096_payments.sql"))).toBe(false);
  });
});
