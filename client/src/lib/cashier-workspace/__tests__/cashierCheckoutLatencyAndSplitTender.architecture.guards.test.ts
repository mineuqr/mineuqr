/**
 * CASHIER-CHECKOUT-LATENCY-AND-SPLIT-TENDER-1 — boundary guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

const PANEL = "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx";
const PLACE = "server/order/application/PlaceOrderService.ts";
const REPO = "server/order/infrastructure/persistence/DrizzleOrderRepository.ts";
const SETTLE = "server/pos/services/PosSettlementInitiateService.ts";
const ROUTER = "server/pos/api/posRouter.ts";

describe("CASHIER-CHECKOUT-LATENCY-AND-SPLIT-TENDER-1 architecture guards", () => {
  it("folds cashier_pos Accept into the first Order persist transaction", () => {
    const place = read(PLACE);
    const repo = read(REPO);
    expect(place).toContain("cashier-pos-inbound-accept");
    expect(place).toContain("CASHIER_POS_INBOUND_STATUS");
    expect(place).not.toContain("const accepted = await this.repository.save");
    expect(repo).toContain("persisted.status !== snapshot.status");
  });

  it("forwards existing Check settlement lines and does not invent POS money tables", () => {
    const panel = read(PANEL);
    const settle = read(SETTLE);
    const router = read(ROUTER);
    const schema = read("drizzle/schema.ts");
    expect(panel).toContain("settlements: [...plan.settlements]");
    expect(panel).toContain("resolveCashierSettlementPlan");
    expect(panel).not.toContain("pos_cash");
    expect(panel).not.toContain("pos_card");
    expect(panel).not.toContain("pos_revenue");
    expect(panel).not.toContain("cashier_settlements");
    expect(settle).toContain("resolveCommandSettlements");
    expect(settle).toContain("confirmPayment");
    expect(
      read("server/operational-session/payment/PaymentConfirmService.ts")
    ).toContain("settleCheckPaidByIdDetailed");
    expect(router).toContain("settlements: input.settlements");
    expect(router).not.toContain("tender");
    expect(schema).not.toMatch(
      /export const posCash|export const posCard|export const posRevenue|export const cashierSettlements/
    );
  });

  it("does not show Paid before pos.settlement.initiate succeeds", () => {
    const panel = read(PANEL);
    const completeFn = panel.slice(
      panel.indexOf("async function completePayment"),
      panel.indexOf("function returnToDashboard")
    );
    expect(completeFn.indexOf("settleMutation.mutateAsync")).toBeLessThan(
      completeFn.indexOf("setPaidReceipt")
    );
    expect(completeFn.indexOf("setPaidReceipt")).toBeLessThan(
      completeFn.indexOf("setPrintOpen(true)")
    );
    expect(completeFn).not.toContain('setSalePhase("paid")');
    expect(completeFn).not.toContain("await orchestrateIntake");
  });

  it("loads authoritative sale prices in one lookup wave", () => {
    const pricing = read("server/orderPricing.ts");
    const access = read("server/pos/services/PosAccessService.ts");
    expect(pricing).toContain("Promise.all");
    expect(pricing).toContain("items.map(async (item)");
    expect(access).toContain("Promise.all");
    expect(access).toContain("this.entitlements.resolve");
    expect(access).toContain("this.listPermissions");
  });
});
