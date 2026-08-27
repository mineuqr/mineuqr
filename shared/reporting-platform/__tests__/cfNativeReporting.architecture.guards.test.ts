/**
 * CF-NATIVE-REPORTING-1 — current Cashier financial KPIs publish Collection Fact.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getKpiDefinition } from "../kpiDictionary";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CF-NATIVE-REPORTING-1 architecture", () => {
  it("published Gross formulas name Collection Fact and historical settlement_records", () => {
    const revenue = getKpiDefinition("revenue");
    expect(revenue.formula).toContain("payment_collection_facts");
    expect(revenue.formula).toContain("settlement_records");
    expect(revenue.sourceOfTruth).toMatch(/Collection Fact/i);
    expect(getKpiDefinition("taxCollected").formula).toContain(
      "payment_collection_facts.taxAmount"
    );
  });

  it("Business Metrics pass the reporting period into Collection Fact reads", () => {
    const metrics = read("server/reporting-platform/BusinessMetricsService.ts");
    expect(metrics).toContain("listCollectionFactsForRevenueUnion");
    expect(metrics).toContain("from: input.from");
    expect(metrics).toContain("to: input.to");
    expect(metrics).toContain('eligibility: "published"');
    expect(metrics).not.toContain("commitCollectionFact");
  });

  it("does not create 0100 or alter 0098/0099", () => {
    expect(existsSync(join(repoRoot, "drizzle/0100_cf_native_reporting.sql"))).toBe(
      false
    );
    expect(read("drizzle/0098_pos_sale_idempotency_open_check.sql")).toContain(
      "ADD COLUMN `checkId` int NOT NULL"
    );
    expect(read("drizzle/0099_cashier_order_handoffs.sql")).toContain(
      "CREATE TABLE `cashier_order_handoffs`"
    );
  });
});
