/**
 * MULTI-CHECK-ALLOCATION-PERSISTENCE-1 / ADR-ARCH-025 — persistence architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("MULTI-CHECK-ALLOCATION-PERSISTENCE-1 architecture guards", () => {
  it("migration 0075 creates Multi Check Allocation tables with canonical identities", () => {
    const sql = read("drizzle/0075_multi_check_allocation.sql");
    expect(sql).toContain("MULTI-CHECK-ALLOCATION-PERSISTENCE-1");
    expect(sql).toContain("CREATE TABLE `multi_check_allocations`");
    expect(sql).toContain("CREATE TABLE `multi_check_allocation_portions`");
    expect(sql).toContain("CREATE TABLE `multi_check_allocation_adjustments`");
    expect(sql).toContain("CREATE TABLE `multi_check_allocation_reversals`");
    expect(sql).toContain("CREATE TABLE `multi_check_allocation_history`");
    expect(sql).toContain("CREATE TABLE `multi_check_allocation_sources`");
    expect(sql).toContain("mca_allocation_id_unique");
    expect(sql).toContain("`allocationReference`");
    expect(sql).toContain("`financialReference`");
    expect(sql).toContain("`sourcePaymentId`");
    expect(sql).toContain("`sourceCheckId`");
    expect(sql).toContain("`targetCheckId`");
    expect(sql).toContain("`allocationSequence`");
    expect(sql).toContain("`previousRevision`");
    expect(sql).toContain("`newRevision`");
    expect(sql).toContain("`mutationType`");
    expect(sql).toContain("`version`");
    expect(sql).toContain("`schemaVersion`");
    expect(sql).toContain("--> statement-breakpoint");
  });

  it("Drizzle schema mirrors Domain fields + persistence version/history", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain('mysqlTable(\n\t"multi_check_allocations"');
    expect(schema).toContain('mysqlTable(\n\t"multi_check_allocation_history"');
    expect(schema).toContain("allocationId");
    expect(schema).toContain("allocationReference");
    expect(schema).toContain("allocationSequence");
    expect(schema).toContain("previousRevision");
    expect(schema).toContain("newRevision");
    const start = schema.indexOf('mysqlTable(\n\t"multi_check_allocations"');
    const end = schema.indexOf(
      "export type InsertMultiCheckAllocationHistory",
      start
    );
    const block = schema.slice(start, end);
    expect(block).not.toContain("grandTotal");
    expect(block).not.toContain("impliesCheckSettlement");
    expect(block).not.toContain("impliesPaymentCompletion");
  });

  it("repository has no Domain command / invariant / calculation imports", () => {
    const repo = read(
      "server/operational-session/check/multiCheckAllocationRepository.ts"
    );
    expect(repo).toContain("SessionDbClient");
    expect(repo).toContain("expectedVersion");
    expect(repo).toContain("DUPLICATE");
    expect(repo).toContain("CONFLICT");
    expect(repo).toContain("appendHistory");
    expect(repo).toContain("append-only");
    expect(repo).not.toContain("createMultiCheckAllocation");
    expect(repo).not.toContain("reserveAllocation");
    expect(repo).not.toContain("applyAllocation");
    expect(repo).not.toContain("assertTransitionAllowed");
    expect(repo).not.toContain("assertAllocationConservation");
    expect(repo).not.toContain("computeAllocatedAmount");
    expect(repo).not.toMatch(/deleteFrom|\.delete\s*\(/);
    expect(repo).not.toContain(".transaction(");
  });

  it("mapper is deterministic and Domain-field scoped", () => {
    const mapper = read(
      "server/operational-session/check/multiCheckAllocationMapper.ts"
    );
    expect(mapper).toContain("mapRowsToMultiCheckAllocation");
    expect(mapper).toContain("toMultiCheckAllocationInsertValues");
    expect(mapper).toContain("assertAllocationStatus");
    expect(mapper).toContain("impliesCheckSettlement: false");
    expect(mapper).toContain("impliesPaymentCompletion: false");
    expect(mapper).toContain("toAllocationHistoryInsertValues");
    expect(mapper).not.toContain("createMultiCheckAllocation");
    expect(mapper).not.toContain("applyAllocation");
  });

  it("history is append-only with revision audit fields", () => {
    const repo = read(
      "server/operational-session/check/multiCheckAllocationRepository.ts"
    );
    expect(repo).toContain("listAllocationHistory");
    expect(repo).toContain("appendAllocationHistoryRecord");
    expect(repo).toContain("previousRevision");
    expect(repo).toContain("newRevision");
    expect(repo).not.toContain("deleteAllocationHistory");
    expect(repo).not.toContain("updateAllocationHistory");
    expect(repo).not.toContain("replaceAllocationHistory");
  });

  it("journal retains 0075_multi_check_allocation (terminus may advance)", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0075_multi_check_allocation");
    const gov = read("scripts/lib/migration-governance-lib.cjs");
    expect(gov).toContain("CANONICAL_MIGRATION_TAIL_TAG");
    expect(gov).toContain("CANONICAL_JOURNAL_ENTRY_COUNT");
  });

  it("verify-schema covers Multi Check Allocation tables", () => {
    const verify = read("scripts/verify-schema-deployment.cjs");
    expect(verify).toContain("multi_check_allocations");
    expect(verify).toContain("multi_check_allocation_history");
    expect(verify).toContain("mca_allocation_id_unique");
    expect(verify).toContain("multiCheckAllocationTables");
  });
});
