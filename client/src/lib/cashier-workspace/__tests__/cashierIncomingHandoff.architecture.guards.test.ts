/**
 * CASHIER-INCOMING-ORDER-HANDOFF-1
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CASHIER-INCOMING-ORDER-HANDOFF-1", () => {
  it("Send to Cashier does not open an empty direct-sale Cashier screen", () => {
    const bar = read("client/src/components/dashboard/DiningSessionActionBar.tsx");
    const row = read("client/src/components/dashboard/SessionRowQuickActions.tsx");
    const orders = read("client/src/components/orders-workspace/OrdersWorkspacePanel.tsx");
    const handoff = read(
      "client/src/lib/cashier-workspace/cashierIncomingHandoff.ts"
    );
    expect(handoff).toContain("CASHIER-INCOMING-ORDER-HANDOFF-1");
    expect(handoff).toContain("listInvoiceIntents.invalidate");
    expect(handoff).not.toContain("syncDashboardUrl");
    expect(handoff).not.toContain("commitCollectionFact");
    expect(bar).toContain("session.sendToCashier");
    expect(row).toContain("session.sendToCashier");
    expect(orders).toContain("order.sendToCashier");
    expect(orders).toContain("send-to-cashier");
    const sendBar = bar.slice(bar.indexOf("sendToCashier") - 200, bar.indexOf("sendToCashier") + 80);
    expect(sendBar).not.toContain('section: "cashier"');
  });

  it("Cashier incoming queue is always loaded and hydrates the same orderId", () => {
    const panel = read("client/src/components/cashier-workspace/CashierWorkspacePanel.tsx");
    const intentsQuery = panel.slice(
      panel.indexOf("listInvoiceIntents.useQuery"),
      panel.indexOf("detailQuery")
    );
    expect(intentsQuery).toContain("enabled: scoped && allowed");
    expect(intentsQuery).not.toContain("ordersOpen");
    expect(panel).toContain("incomingOrders");
    expect(panel).toContain("reviewInvoiceIntent");
    expect(panel).toContain("inboundOrderId");
    expect(panel).toContain("? { orderId: inboundOrderId }");
    expect(panel).toContain(": { items: confirmItems }");
    expect(panel).toContain("startNewSale");
  });

  it("does not list cashier_pos on Incoming or Cashier Active orders", () => {
    const panel = read("client/src/components/cashier-workspace/CashierWorkspacePanel.tsx");
    const posRead = read("server/pos/services/PosOrderReadService.ts");
    const sale = read("server/pos/services/PosSaleService.ts");
    const finalize = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    const intent = read("server/pos/services/InvoiceIntentService.ts");
    const handoff = read("server/pos/cashier-handoff/CashierHandoffService.ts");
    expect(panel).toContain("listInvoiceIntents.useQuery");
    expect(panel).toContain("incomingOrders");
    expect(panel).toContain("listActive.useQuery");
    expect(posRead).toContain('cashierPosMembership: "exclude"');
    expect(posRead).not.toContain('cashierPosMembership: "paid-visible"');
    expect(intent).toContain("listCashierHandoffsByRestaurant");
    expect(intent).toContain("ORDERING_CHANNEL_CASHIER_POS");
    expect(handoff).toContain("Direct Cashier sales are not Incoming Queue items");
    expect(sale).not.toContain("insertCashierHandoff");
    expect(sale).not.toContain("activateCashierHandoff");
    expect(finalize).not.toContain("insertCashierHandoff");
    expect(finalize).not.toContain("activateCashierHandoff");
  });

  it("does not restore Session/QR/Counter financial writers", () => {
    const bar = read("client/src/components/dashboard/DiningSessionActionBar.tsx");
    const qr = read("server/order/application/SettleOrderPaidService.ts");
    const counter = read(
      "server/order/application/StaffCounterPickupSettlementService.ts"
    );
    expect(bar).not.toContain("session.markPaid");
    expect(bar).not.toContain("confirmPayment");
    expect(qr).toContain("FINANCIAL_REQUIRES_CASHIER");
    expect(counter).toContain("FINANCIAL_REQUIRES_CASHIER");
  });
});
