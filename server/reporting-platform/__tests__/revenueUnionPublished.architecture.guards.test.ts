/**
 * REVENUE-UNION-PUBLISHED-ADOPTION-1 — publication + production-safety guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REVENUE-UNION-PUBLISHED-ADOPTION-1 architecture", () => {
  it("publishes Business Metrics through Union with published eligibility only", () => {
    const metrics = read("server/reporting-platform/BusinessMetricsService.ts");
    const publication = read(
      "server/reporting-platform/revenueUnionPublication.ts"
    );
    expect(metrics).toContain("computeRevenueUnion");
    expect(metrics).toContain('eligibility: "published"');
    expect(metrics).not.toContain('eligibility: "isolated"');
    expect(metrics).toContain("resolveRevenueUnionPublicationMode");
    expect(publication).toContain("REPORTING_REVENUE_UNION");
    expect(publication).toContain(
      'const DEFAULT_MODE: RevenueUnionPublicationMode = "published"'
    );
    expect(publication).toContain('"legacy"');
  });

  it("does not write Collection Facts or change Cashier Confirm / PAID", () => {
    const metrics = read("server/reporting-platform/BusinessMetricsService.ts");
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const settle = read("server/pos/services/PosSettlementInitiateService.ts");
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const check = read("server/operational-session/check/CheckService.ts");
    expect(metrics).not.toContain("commitCollectionFact");
    expect(confirm).not.toContain("commitCollectionFact");
    expect(confirm).toContain("settleCashierPosOrderPaidByIdDetailed");
    expect(settle).toContain("confirmPayment");
    expect(panel).not.toContain("commitCollectionFact");
    expect(check).not.toContain("commitCollectionFact");
  });

  it("does not add a payments table; production purpose is 0097 only", () => {
    const sql = read("drizzle/0096_payment_collection_facts.sql");
    const sql0097 = read(
      "drizzle/0097_payment_collection_facts_production_purpose.sql"
    );
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    const contract = read(
      "shared/reporting-platform/revenue-union/revenueUnionContract.ts"
    );
    expect(sql).toMatch(
      /`purpose` enum\('synthetic','shadow','test','validation'\) NOT NULL/
    );
    expect(sql).not.toMatch(/'production'/);
    expect(sql0097).toContain("'production'");
    expect(sql0097).not.toMatch(/CREATE TABLE `payments`/);
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(journal).toContain("0097_payment_collection_facts_production_purpose");
    expect(journal).not.toContain("0097_payments");
    expect(contract).toContain(
      "export const PUBLISHED_COLLECTION_FACT_PURPOSES"
    );
    expect(contract).toContain("COLLECTION_FACT_PRODUCTION_PURPOSE");
  });

  it("does not make Settlement the financial authority or add a second Revenue root", () => {
    const metrics = read("server/reporting-platform/BusinessMetricsService.ts");
    const aggregator = read(
      "server/reporting-platform/businessMetricsAggregator.ts"
    );
    expect(metrics).toContain("listSettlementRecordsForReporting");
    expect(metrics).not.toContain("createSettlementRecord");
    expect(aggregator).not.toContain("paymentCollectionFacts");
    expect(aggregator).not.toContain("commitCollectionFact");
  });
});
