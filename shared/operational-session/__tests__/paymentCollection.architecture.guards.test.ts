/**
 * PAYMENT-COLLECTION-ARCHITECTURE-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("PAYMENT-COLLECTION-ARCHITECTURE-1 architecture guards", () => {
  it("reuses check_settlement_transactions as the collection fact store", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0070_check_settlement_transactions");
    expect(journal).toContain("0095_check_charges");
    expect(journal).not.toContain("0096_");
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("checkSettlementTransactions");
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
  });

  it("Check collection uses Bill remaining, not Order or Session totals", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("billAmountDueFromCollection");
    expect(svc).toContain("listSettlementTransactionsForCheck");
    expect(svc).not.toContain("getOrdersByIds");
    expect(svc).not.toContain("loadOrdersSubtotal");
    expect(svc).not.toMatch(/ordersTotalAmount/);
    expect(svc).not.toContain("PaymentEngine");
    expect(svc).not.toContain("PaymentOrchestrator");
    expect(svc).not.toContain("class PaymentAggregate");
  });

  it("collection currency is copied from the Bill snapshot", () => {
    const repo = read(
      "server/operational-session/check/settlementTransactionRepository.ts"
    );
    expect(repo).toContain("currencyCode: input.currencyCode");
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("currencyCode: check.currencySnapshot.currencyCode");
  });

  it("Revenue remains Check/Bill based, not Payment", () => {
    const agg = read("server/reporting-platform/businessMetricsAggregator.ts");
    expect(agg).toContain('outcome === "paid"');
    expect(agg).toContain("grandTotal");
    expect(agg).not.toContain("check_settlement_transactions");
    const analytics = read(
      "server/reporting-platform/PaymentMethodAnalyticsService.ts"
    );
    expect(analytics).toContain("Does not replace Check Revenue");
  });

  it("does not redesign Refund, Settlement Record, or add a Payment engine", () => {
    const invariants = read(
      "shared/operational-session/check/settlementInvariants.ts"
    );
    expect(invariants).toContain("PAYMENT-COLLECTION-ARCHITECTURE-1");
    expect(invariants).toContain("remainingCollectible");
    expect(invariants).not.toContain("PaymentEngine");
    const refund = read(
      "shared/operational-session/check/refund/refundBudget.ts"
    );
    expect(refund).toContain("Settlement Record history only");
  });

  it("Order Settlement is not Bill amount authority", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    const paidSliceStart = svc.indexOf("async function finalizeOpenCheckById");
    const paidSlice = svc.slice(paidSliceStart, paidSliceStart + 8000);
    expect(paidSlice).toContain("resolvePaidCollectionLines");
    expect(paidSlice).toContain("loadChargesSubtotal");
    expect(paidSlice).not.toContain("orderTotalSnapshot");
    expect(paidSlice).not.toContain("listActiveOrderIdsForCheck");
  });
});
