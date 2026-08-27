/**
 * SESSION-TO-CASHIER-HANDOFF-1
 * Session Send is non-financial membership. Cashier Confirm remains CF → PAID.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SESSION-TO-CASHIER-HANDOFF-1 architecture", () => {
  it("Session Send writes handoff only and cannot create financial truth", () => {
    const service = read("server/pos/cashier-handoff/CashierHandoffService.ts");
    const routers = read("server/routers.ts");
    const bar = read("client/src/components/dashboard/DiningSessionActionBar.tsx");
    const row = read("client/src/components/dashboard/SessionRowQuickActions.tsx");
    expect(routers).toContain("activateCashierHandoffForSession");
    expect(bar).toContain("session.sendToCashier");
    expect(row).toContain("session.sendToCashier");
    expect(bar).not.toContain("markComplimentary");
    expect(row).not.toContain("markComplimentary");
    expect(service).toContain("insertCashierHandoffIgnoreDuplicate");
    expect(service).toContain("getOrdersBySessionId");
    expect(service).not.toContain("commitCollectionFact");
    expect(service).not.toContain("confirmPayment");
    expect(service).not.toContain("closeSession");
    expect(service).not.toContain("createOrder");
    expect(service).not.toContain("placeOrder");
    expect(service).not.toContain("allocateBusinessIdentity");
  });

  it("Incoming hydrates the same Order and does not allocate a Cashier invoice number", () => {
    const intent = read("server/pos/services/InvoiceIntentService.ts");
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const finalize = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    expect(intent).toContain("listCashierHandoffsByRestaurant");
    expect(intent).toContain("resolveOrderDisplayIdentity");
    expect(intent).not.toContain("commitCollectionFact");
    expect(intent).not.toContain("DrizzleBusinessIdentityAllocator");
    expect(panel).toContain("reviewInvoiceIntent");
    expect(panel).toContain("intent.displayReference || intent.orderNumber");
    expect(panel).toContain("incomingOperationalOrder");
    expect(panel).toContain("? { orderId: inboundOrderId }");
    expect(panel).toContain(": { items: confirmItems }");
    expect(panel).not.toContain('t("invoiceNumber")');
    expect(finalize).not.toContain("activateCashierHandoff");
    expect(confirm).toContain("settleCashierPosOrderPaidByIdDetailed");
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(confirm).not.toContain("closeSession");
  });

  it("keeps Confirm → CF → PAID frozen and does not add 0101", () => {
    const journal = read("drizzle/meta/_journal.json");
    const cf = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    const initiate = read("server/pos/services/PosSettlementInitiateService.ts");
    const close = read("server/diningSession/sessionService.ts");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
    expect(journal).toContain("0099_cashier_order_handoffs");
    expect(journal).toContain("0100_crmp_collection_fact_attribution");
    expect(journal).not.toContain("0101_");
    expect(cf).toContain("collectionFactCommitIsPaid");
    expect(initiate).toContain("finalizeCashierPreparedInvoice");
    expect(initiate).toContain("this.settlePaid");
    expect(close).toContain('source: "manual_close"');
    expect(close).not.toContain("settleAndCloseSession");
  });
});
