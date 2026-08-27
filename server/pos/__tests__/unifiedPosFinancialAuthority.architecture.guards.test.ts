/**
 * UNIFIED-POS-FINANCIAL-AUTHORITY-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("UNIFIED-POS-FINANCIAL-AUTHORITY-1 architecture", () => {
  it("keeps Invoice Intent non-financial and Collection Fact Cashier-only", () => {
    const intent = read("shared/pos/cashierFinancialFinalization.ts");
    const builder = read("server/pos/services/InvoiceIntentService.ts");
    const commit = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    expect(intent).toContain("Invoice Intent != Collection Fact");
    expect(intent).toContain("CASHIER_FINALIZABLE_ORDERING_CHANNELS");
    expect(builder).not.toContain("commitCollectionFact");
    expect(builder).toContain("listAwaitingInvoiceIntents");
    expect(builder).not.toContain("confirmPayment");
    expect(commit).toContain("isCashierFinalizableOrderingChannel");
  });

  it("blocks Table/QR/Counter Check settlement as financial truth", () => {
    const session = read("server/diningSession/sessionService.ts");
    const qr = read("server/order/application/SettleOrderPaidService.ts");
    const counter = read(
      "server/order/application/StaffCounterPickupSettlementService.ts"
    );
    const close = read(
      "server/operational-session/check/lifecycleSettlementGuardService.ts"
    );
    const markPaid = session.slice(
      session.indexOf("export async function markPaid")
    );
    expect(markPaid.slice(0, 400)).toContain(
      "Financial settlement requires Cashier Confirm"
    );
    expect(markPaid.slice(0, 400)).not.toContain("await confirmPayment");
    expect(qr).toContain("FINANCIAL_REQUIRES_CASHIER");
    expect(counter).toContain("FINANCIAL_REQUIRES_CASHIER");
    expect(close).toContain("findProductionCollectionFactByOrderId");
    expect(close).not.toContain("getActiveCheckForSession");
    expect(read("server/pos/api/posReadRouter.ts")).toContain("listInvoiceIntents");
    expect(read("client/src/components/dashboard/DiningSessionActionBar.tsx")).toContain(
      "sendToCashier"
    );
    expect(read("client/src/components/dashboard/DiningSessionActionBar.tsx")).not.toContain(
      "markComplimentary.useMutation"
    );
    expect(read("client/src/components/dashboard/DiningSessionActionBar.tsx")).not.toContain(
      "markComplimentaryMutation"
    );
  });

  it("complimentary Confirm is Cashier Collection Fact, not a second paid entity", () => {
    const intent = read("shared/pos/cashierFinancialFinalization.ts");
    const freeze = read(
      "server/operational-session/payment/cashierPosOrderFreeze.ts"
    );
    const initiate = read("server/pos/services/PosSettlementInitiateService.ts");
    const panel = read("client/src/components/cashier-workspace/CashierWorkspacePanel.tsx");
    expect(intent).toContain("isComplimentaryCollectionFact");
    expect(intent).not.toContain("ComplimentaryFact");
    expect(intent).not.toContain("ComplimentaryPaid");
    expect(freeze).toContain("COMPLIMENTARY_COLLECTION_TENDER");
    expect(initiate).toContain("Complimentary Confirm cannot collect tender");
    expect(panel).toContain("complimentary: true");
  });

  it("removes Session and Check-id Confirm as financial writers", () => {
    const session = read("server/diningSession/sessionService.ts");
    const payment = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const check = read("server/operational-session/check/CheckService.ts");
    expect(session).not.toContain("settleAndCloseSession");
    expect(session).not.toContain("confirmPayment");
    expect(session).not.toContain("settleCheckComplimentaryByIdDetailed");
    expect(payment).not.toContain("settleCheckPaidByIdDetailed");
    expect(payment).toContain("settleCashierPosOrderPaidByIdDetailed");
    expect(check).toContain("Financial settlement requires Cashier Confirm");
    expect(check).toContain("listActiveOrderIdsForCheck");
    expect(check).toContain("if (!order)");
  });

  it("does not add schema, 0099, or a second financial entity", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
    expect(journal).not.toContain("0099_");
  });

  it("keeps ST/OS/SR as supporting writers, not Collection Fact authority", () => {
    const st = read(
      "server/operational-session/check/settlementTransactionRepository.ts"
    );
    const os = read(
      "server/operational-session/check/checkOrderSettlementIntegration.ts"
    );
    const sr = read(
      "server/operational-session/check/checkSettlementRecordIntegration.ts"
    );
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    expect(st).not.toContain("commitCollectionFact");
    expect(os).not.toContain("commitCollectionFact");
    expect(sr).not.toContain("commitCollectionFact");
    expect(confirm).not.toContain("closeSession");
    expect(confirm).toContain("commitCashierProductionCollectionFact");
  });

  it("keeps reporting Gross and refund identity mapped to Collection Fact", () => {
    const map = read("shared/pos/financialResponsibilityMap.ts");
    const revenue = read(
      "server/reporting-platform/revenue-union/RevenueUnionService.ts"
    );
    const close = read("server/diningSession/sessionService.ts");
    expect(map).toContain("Collection Fact.amount");
    expect(map).toContain("original Collection Fact");
    expect(map).toContain("independentSettlement: false");
    expect(revenue).toContain("listCollectionFactsForRevenueUnion");
    expect(close).toContain("assertSessionCloseable");
    expect(close).toContain('source: "manual_close"');
    expect(close).not.toContain("settleAndCloseSession");
  });
});
