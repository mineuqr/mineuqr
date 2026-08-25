/**
 * REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1 — architecture guards.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REVENUE-UNION-PRODUCTION-COLLECTION-AUTHORITY-1 architecture", () => {
  it("does not change Cashier, Confirm, PAID, Check, or Settlement writers", () => {
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const settle = read("server/pos/services/PosSettlementInitiateService.ts");
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const check = read("server/operational-session/check/CheckService.ts");
    const sr = read(
      "server/operational-session/check/settlementRecordRepository.ts"
    );
    const st = read(
      "server/operational-session/check/settlementTransactionRepository.ts"
    );
    const os = read(
      "server/operational-session/check/orderSettlementRepository.ts"
    );
    const writer = read(
      "server/operational-session/payment/collection-fact/CollectionFactService.ts"
    );
    for (const body of [settle, panel, check, sr, st, os]) {
      expect(body).not.toContain("PRODUCTION_OVERLAP");
      expect(body).not.toContain("commitCollectionFact");
    }
    expect(confirm).not.toContain("PRODUCTION_OVERLAP");
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(confirm).not.toContain("insertCollectionFact");
    expect(confirm).toContain("settleCashierPosOrderPaidByIdDetailed");
    expect(writer).toContain("Cashier Confirm is the first certified");
  });

  it("does not add a payments table or Payment aggregate; 0098 is the certified POS sale endpoint", () => {
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(journal).toContain("0097_payment_collection_facts_production_purpose");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
    expect(journal).not.toContain("0098_payments");
    const sql = readdirSync(join(repoRoot, "drizzle")).filter((name) =>
      name.endsWith(".sql")
    );
    expect(sql.filter((name) => name.startsWith("0098"))).toEqual([
      "0098_pos_sale_idempotency_open_check.sql",
    ]);
    expect(existsSync(join(repoRoot, "drizzle/0098.sql"))).toBe(false);
    const sql0098 = read("drizzle/0098_pos_sale_idempotency_open_check.sql");
    expect(sql0098).toContain("ALTER TABLE `pos_sale_idempotency`");
    expect(sql0098).not.toMatch(/payment_collection_facts/);
    expect(sql0098).not.toMatch(/CREATE TABLE `payments`/);
  });

  it("keeps Union as the published metrics path and does not write Collection Facts", () => {
    const metrics = read("server/reporting-platform/BusinessMetricsService.ts");
    const resolver = read(
      "shared/reporting-platform/revenue-union/revenueUnionResolver.ts"
    );
    const adapter = read(
      "server/reporting-platform/revenue-union/collectionFactReportingAdapter.ts"
    );
    expect(metrics).toContain("computeRevenueUnion");
    expect(metrics).toContain('eligibility: "published"');
    expect(metrics).toContain("productionOverlapResolved");
    expect(metrics).toContain("legacyExcludedBecauseProductionCollectionFactWon");
    expect(resolver).toContain("PRODUCTION_OVERLAP");
    expect(resolver).toContain("provenEconomicSaleOverlap");
    expect(resolver).not.toContain("commitCollectionFact");
    expect(adapter).not.toContain(".insert(");
    expect(adapter).not.toContain(".update(");
    expect(adapter).not.toContain(".delete(");
  });

  it("does not import Cashier, Confirm, or Collection Fact writers into Union", () => {
    const files = [
      "shared/reporting-platform/revenue-union/revenueUnionResolver.ts",
      "shared/reporting-platform/revenue-union/revenueUnionAggregator.ts",
      "shared/reporting-platform/revenue-union/revenueUnionClassifier.ts",
      "shared/reporting-platform/revenue-union/revenueUnionIdentity.ts",
      "server/reporting-platform/revenue-union/RevenueUnionService.ts",
      "server/reporting-platform/revenue-union/businessMetricsFromUnion.ts",
    ];
    for (const rel of files) {
      const body = read(rel);
      expect(body).not.toMatch(/cashier-workspace/i);
      expect(body).not.toContain("PaymentConfirmService");
      expect(body).not.toContain("commitCollectionFact");
      expect(body).not.toContain("kind: \"refund\"");
      expect(body).not.toContain("kind: \"void\"");
      expect(body).not.toContain("kind: \"complimentary\"");
    }
  });
});
