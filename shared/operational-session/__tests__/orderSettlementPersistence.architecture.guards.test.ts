/**
 * ORDER-SETTLEMENT-PERSISTENCE-1 / ADR-ARCH-022 — persistence architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("ORDER-SETTLEMENT-PERSISTENCE-1 architecture guards", () => {
  it("migration 0073 creates check_order_settlements with unique identity", () => {
    const sql = read("drizzle/0073_check_order_settlements.sql");
    expect(sql).toContain("ORDER-SETTLEMENT-PERSISTENCE-1");
    expect(sql).toContain("CREATE TABLE `check_order_settlements`");
    expect(sql).toContain(
      "check_order_settlements_check_order_unique"
    );
    expect(sql).toContain("partially_settled");
    expect(sql).toContain("--> statement-breakpoint");
  });

  it("Drizzle schema mirrors Domain fields only", () => {
    const schema = read("drizzle/schema.ts");
    const start = schema.indexOf('mysqlTable(\n\t"check_order_settlements"');
    expect(start).toBeGreaterThanOrEqual(0);
    const end = schema.indexOf("export type InsertCheckOrderSettlement", start);
    const tableBlock = schema.slice(start, end);
    expect(tableBlock).toContain("orderTotalSnapshot");
    expect(tableBlock).toContain("allocatedAmount");
    expect(tableBlock).toContain("settledAmount");
    expect(tableBlock).toContain("outstandingAmount");
    expect(tableBlock).not.toContain("grandTotal");
    expect(tableBlock).not.toContain("paymentMethod");
  });

  it("repository has no Domain command / invariant imports", () => {
    const repo = read(
      "server/operational-session/check/orderSettlementRepository.ts"
    );
    expect(repo).toContain("SessionDbClient");
    expect(repo).toContain("expectedStatus");
    expect(repo).toContain("DUPLICATE");
    expect(repo).toContain("CONFLICT");
    expect(repo).toContain("not provided");
    expect(repo).not.toContain("createOrderSettlement");
    expect(repo).not.toContain("applyFullSettlement");
    expect(repo).not.toContain("assertTransitionAllowed");
    expect(repo).not.toContain("assertMoneyInvariants");
    expect(repo).not.toContain("calculateOutstandingAmount");
    expect(repo).not.toMatch(/deleteFrom|\.delete\s*\(/);
  });

  it("mapper is deterministic and Domain-field scoped", () => {
    const mapper = read(
      "server/operational-session/check/orderSettlementMapper.ts"
    );
    expect(mapper).toContain("mapRowToOrderSettlement");
    expect(mapper).toContain("toOrderSettlementInsertValues");
    expect(mapper).toContain("assertOrderSettlementStatus");
    expect(mapper).not.toContain("applyFullSettlement");
    expect(mapper).not.toContain("recalculateOrderSettlement");
  });

  it("journal includes 0073_check_order_settlements", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0073_check_order_settlements");
  });

  it("verify-schema covers check_order_settlements", () => {
    const verify = read("scripts/verify-schema-deployment.cjs");
    expect(verify).toContain("check_order_settlements");
    expect(verify).toContain("check_order_settlements_check_order_unique");
  });
});
