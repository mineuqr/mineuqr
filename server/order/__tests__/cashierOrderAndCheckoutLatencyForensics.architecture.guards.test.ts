/**
 * CASHIER-ORDER-AND-CHECKOUT-LATENCY-FORENSICS-1 — boundary guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-ORDER-AND-CHECKOUT-LATENCY-FORENSICS-1 architecture guards", () => {
  it("keeps prior sale-path latency corrections", () => {
    const sale = read("server/pos/services/PosSaleService.ts");
    const place = read("server/order/application/IdentityPlaceOrderService.ts");
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(sale).toContain("awaitRelay: false");
    expect(sale).toContain("enrollCheck: false");
    expect(sale).not.toContain("const stored = await this.idempotency.get");
    expect(place).toContain("enrollCheck: false");
    const placeSaleFn = panel.slice(
      panel.indexOf("async function placeSale"),
      panel.indexOf("function orchestrateIntake")
    );
    expect(placeSaleFn).not.toContain("invalidateOrderReads");
    expect(placeSaleFn).toContain('setSalePhase("payment")');
  });

  it("completes cashier_pos تم التقديم in one sequential persist", () => {
    const complete = read(
      "server/order/application/CompleteCashierPosOperationalService.ts"
    );
    const advance = read("server/order/application/AdvanceOrderStatusService.ts");
    expect(complete).toContain("executeSequential");
    expect(complete).toContain("nextCashierPosServeStep");
    expect(complete).toContain("assertOrderCompletable");
    expect(advance).toContain("async executeSequential");
  });

  it("does not show Paid before canonical settlement", () => {
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn.indexOf("settleMutation.mutateAsync")).toBeLessThan(
      completeFn.indexOf("setPaidCheckout")
    );
    expect(completeFn).not.toContain("await orchestrateIntake");
  });

  it("does not invent cashier money or order tables", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).not.toMatch(
      /export const cashierOrders|export const posOrders|export const cashierRevenue|export const cashierPayments/
    );
  });
});
