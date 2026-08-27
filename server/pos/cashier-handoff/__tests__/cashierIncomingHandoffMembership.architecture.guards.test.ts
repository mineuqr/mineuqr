/**
 * CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-INCOMING-HANDOFF-MEMBERSHIP-1 architecture", () => {
  it("Incoming Queue membership is Cashier Handoff, not a restaurant Order scan", () => {
    const intent = read("server/pos/services/InvoiceIntentService.ts");
    expect(intent).toContain("listCashierHandoffsByRestaurant");
    expect(intent).toContain("hasCashierHandoff");
    expect(intent).not.toContain("getOrdersByRestaurant");
    expect(intent).not.toContain("commitCollectionFact");
    expect(intent).not.toContain("confirmPayment");
  });

  it("handoff persistence is non-financial and keyed by restaurantId + orderId", () => {
    const sql = read("drizzle/0099_cashier_order_handoffs.sql");
    const service = read("server/pos/cashier-handoff/CashierHandoffService.ts");
    const repo = read("server/pos/cashier-handoff/cashierHandoffRepository.ts");
    expect(sql).toContain("CREATE TABLE `cashier_order_handoffs`");
    expect(sql).toContain("PRIMARY KEY(`restaurantId`,`orderId`)");
    expect(sql).not.toMatch(/amount|paid|collectionFact|invoice/i);
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(service).toContain("insertCashierHandoffIgnoreDuplicate");
    expect(service).not.toContain("commitCollectionFact");
    expect(service).not.toContain("confirmPayment");
    expect(service).not.toContain("closeSession");
    expect(service).not.toContain("markPaid");
    expect(service).not.toContain("settleCheck");
    expect(repo).toContain("onDuplicateKeyUpdate");
  });

  it("Send to Cashier is a mutation and does not navigate to empty Cashier", () => {
    const bar = read("client/src/components/dashboard/DiningSessionActionBar.tsx");
    const row = read("client/src/components/dashboard/SessionRowQuickActions.tsx");
    const orders = read(
      "client/src/components/orders-workspace/OrdersWorkspacePanel.tsx"
    );
    const handoff = read(
      "client/src/lib/cashier-workspace/cashierIncomingHandoff.ts"
    );
    const routers = read("server/routers.ts");
    expect(routers).toContain("activateCashierHandoffForSession");
    expect(routers).toContain("activateCashierHandoffForOrder");
    expect(bar).toContain("session.sendToCashier");
    expect(row).toContain("session.sendToCashier");
    expect(orders).toContain("order.sendToCashier");
    expect(handoff).not.toContain("syncDashboardUrl");
    expect(handoff).toContain("listInvoiceIntents.invalidate");
  });

  it("does not restore Session/QR/Counter financial writers or change Confirm", () => {
    const session = read("server/diningSession/sessionService.ts");
    const qr = read("server/order/application/SettleOrderPaidService.ts");
    const counter = read(
      "server/order/application/StaffCounterPickupSettlementService.ts"
    );
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const close = read(
      "server/operational-session/check/lifecycleSettlementGuardService.ts"
    );
    expect(session).toContain("Financial settlement requires Cashier Confirm");
    expect(qr).toContain("FINANCIAL_REQUIRES_CASHIER");
    expect(counter).toContain("FINANCIAL_REQUIRES_CASHIER");
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(confirm).not.toContain("closeSession");
    expect(close).toContain("findProductionCollectionFactByOrderId");
    expect(read("drizzle/0098_pos_sale_idempotency_open_check.sql")).toContain(
      "ADD COLUMN `checkId` int NOT NULL"
    );
  });
});
