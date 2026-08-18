/**
 * CASHIER-POS-CHECK-READ-CONTRACT-1 — Cashier payment-read architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const READY = "client/src/lib/cashier-workspace/cashierPaymentReadiness.ts";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";
const SALE = "server/pos/services/PosSaleService.ts";

describe("CASHIER-POS-CHECK-READ-CONTRACT-1 architecture", () => {
  it("derives Confirm Payment from Check.grandTotal via pos.read.check.getByOrder", () => {
    const panel = read(PANEL);
    const ready = read(READY);
    expect(panel).toContain("trpc.pos.read.check.getByOrder");
    expect(panel).toContain("resolveCashierPaymentReadiness");
    expect(panel).toContain("orderCheck?.grandTotal");
    expect(panel).toContain("orderCheck?.outcome");
    expect(panel).toContain("paymentReadiness.confirmDisabled");
    expect(panel).toContain("paymentReadiness.showPreparingMessage");
    expect(panel).not.toContain("settlementRow?.outstandingAmount");
    expect(panel).not.toContain("intakeMutation.isPending ?");
    expect(panel).toContain('current === "" || current === directSale?.totalAmount');
    expect(panel).toContain("cancelPaymentSheet");
    expect(panel).not.toContain("voidCheck");
    expect(panel).not.toContain("trpc.order.cancel");
    expect(ready).toContain("checkGrandTotal");
    expect(ready).toContain('input.checkOutcome === "open"');
    expect(ready).not.toContain("outstandingAmount");
    expect(ready).not.toContain("totalAmount");
    expect(ready).not.toMatch(/0\.15|\* 15/);
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
    expect(completeFn).not.toContain("outstandingAmount");
    expect(completeFn.indexOf("settleMutation.mutateAsync")).toBeLessThan(
      completeFn.indexOf("setPaidCheckout")
    );
    expect(sale).toContain("awaitRelay: false");
    expect(sale).toContain("enrollCheck: false");
    expect(settle).toContain("settleCheckPaidByIdDetailed");
    expect(settle).toContain("getCheckById");
    expect(panel).not.toContain("mada");
    expect(panel).not.toContain("apple_pay");
    expect(panel).not.toMatch(/0\.15|\* 15/);
  });

  it("does not poll Order Settlement for Open Check payment readiness", () => {
    const panel = read(PANEL);
    const settlementBlock = panel.slice(
      panel.indexOf("trpc.pos.read.orderSettlement.listByOrder"),
      panel.indexOf("trpc.pos.read.check.getByOrder")
    );
    expect(settlementBlock).toContain("listByOrder.useQuery");
    expect(settlementBlock).not.toContain("refetchInterval");
    expect(settlementBlock).not.toContain("outstandingAmount");
    expect(panel).not.toContain("query.state.data?.[0]?.outstandingAmount");
  });
});
