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
  it("legacy Check collection remains ST; dormant Collection Fact is separate (ADR-039, not adopted)", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0070_check_settlement_transactions");
    expect(journal).toContain("0095_check_charges");
    expect(journal).toContain("0096_payment_collection_facts");
    expect(journal).not.toContain("0096_payments");
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("checkSettlementTransactions");
    expect(schema).toContain("paymentCollectionFacts");
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
    expect(agg).not.toContain("payment_collection_facts");
    expect(agg).not.toContain("paymentCollectionFacts");
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
    expect(refund).toContain("production Collection Fact.amount");
    expect(refund).toContain("Applied refunds remain the existing refund SR chain");
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
