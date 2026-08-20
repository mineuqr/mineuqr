/**
 * REVENUE-UNION-ADOPTION-1 — non-adoption + one-authority guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REVENUE-UNION-ADOPTION-1 architecture", () => {
  it("does not write Collection Facts or change Cashier Confirm / PAID", () => {
    const union = read(
      "server/reporting-platform/revenue-union/RevenueUnionService.ts"
    );
    const adapter = read(
      "server/reporting-platform/revenue-union/collectionFactReportingAdapter.ts"
    );
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const settle = read("server/pos/services/PosSettlementInitiateService.ts");
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(union).not.toContain("commitCollectionFact");
    expect(adapter).not.toContain("insert(");
    expect(adapter).not.toContain("commitCollectionFact");
    expect(confirm).not.toContain("commitCollectionFact");
    expect(confirm).toContain("settleCashierPosOrderPaidByIdDetailed");
    expect(settle).toContain("confirmPayment");
    expect(panel).not.toContain("commitCollectionFact");
  });

  it("does not replace published Business Metrics with isolated Union eligibility", () => {
    const metrics = read("server/reporting-platform/BusinessMetricsService.ts");
    const router = read("server/reporting-platform/reportingRouter.ts");
    expect(metrics).toContain("listSettlementRecordsForReporting");
    expect(metrics).not.toContain('eligibility: "isolated"');
    expect(metrics).not.toContain("commitCollectionFact");
    expect(router).not.toContain("getRevenueUnion");
  });

  it("does not create a payments table or Settlement redesign", () => {
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    const sr = read(
      "server/operational-session/check/settlementRecordRepository.ts"
    );
    expect(schema).toContain("paymentCollectionFacts");
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(journal).not.toContain("0097_payments");
    expect(journal).not.toContain("0096_payments");
    expect(sr).not.toContain("commitCollectionFact");
  });

  it("enforces one authority per transaction in the resolver", () => {
    const resolver = read(
      "shared/reporting-platform/revenue-union/revenueUnionResolver.ts"
    );
    expect(resolver).toContain('code: "BOTH"');
    expect(resolver).toContain("isCollectionFactRevenueEligible");
    expect(resolver).toContain('eligibility === "none"');
    expect(resolver).toContain('eligibility === "published"');
    expect(resolver).toContain("UNRESOLVED");
    expect(resolver).toContain("PUBLISHED_COLLECTION_FACT_PURPOSES");
  });
});
