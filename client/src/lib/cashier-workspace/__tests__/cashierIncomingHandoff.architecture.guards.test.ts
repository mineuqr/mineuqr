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
    expect(bar).toContain("handoffOperationalOrderToCashier");
    expect(row).toContain("handoffOperationalOrderToCashier");
    expect(orders).toContain("handoffOperationalOrderToCashier");
    expect(orders).toContain("settle-self-ordering");
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
