/**
 * CASHIER-PAYMENT-READINESS-STATE-HARDENING-1 — architecture guards.
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
const SALE = "server/pos/services/PosSaleService.ts";

describe("CASHIER-PAYMENT-READINESS-STATE-HARDENING-1 architecture", () => {
  it("derives Confirm Payment from Check outstandingAmount, not intakeMutation.isPending", () => {
    const panel = read(PANEL);
    expect(panel).toContain("resolveCashierPaymentReadiness");
    expect(panel).toContain("settlementRow?.outstandingAmount");
    expect(panel).toContain("paymentReadiness.confirmDisabled");
    expect(panel).toContain("paymentReadiness.showPreparingMessage");
    expect(panel).not.toContain("intakeMutation.isPending ?");
    expect(panel).toContain('current === "" || current === directSale?.totalAmount');
    expect(panel).toContain("cancelPaymentSheet");
    expect(panel).not.toContain("voidCheck");
    expect(panel).not.toContain("trpc.order.cancel");
  });

  it("keeps Confirm Payment on pos.settlement.initiate and does not pay from Order total", () => {
    const panel = read(PANEL);
    const settle = read(SETTLE);
    const sale = read(SALE);
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn).toContain("settleMutation.mutateAsync");
    expect(completeFn).not.toContain("directSale?.totalAmount");
    expect(completeFn.indexOf("settleMutation.mutateAsync")).toBeLessThan(
      completeFn.indexOf("setPaidCheckout")
    );
    expect(sale).toContain("awaitRelay: false");
    expect(sale).toContain("enrollCheck: false");
    expect(settle).toContain("settleCheckPaidByIdDetailed");
    expect(panel).not.toContain("mada");
    expect(panel).not.toContain("apple_pay");
  });

  it("polls settlement read only while Check due is missing on the payment sheet", () => {
    const panel = read(PANEL);
    expect(panel).toContain("refetchInterval");
    expect(panel).toContain("query.state.data?.[0]?.outstandingAmount");
    expect(panel).toContain('if (salePhase !== "payment") return false');
  });
});
