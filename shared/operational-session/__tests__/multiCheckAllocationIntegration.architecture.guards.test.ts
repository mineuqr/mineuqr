/**
 * MULTI-CHECK-ALLOCATION-INTEGRATION-1 / ADR-ARCH-025 — integration architecture guards.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function listTsFiles(dir: string): string[] {
  const abs = join(repoRoot, dir);
  const out: string[] = [];
  for (const entry of readdirSync(abs, { withFileTypes: true })) {
    const rel = join(dir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      out.push(...listTsFiles(rel));
    } else if (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx")) {
      out.push(rel);
    }
  }
  return out;
}

describe("MULTI-CHECK-ALLOCATION-INTEGRATION-1 architecture guards", () => {
  it("Check Aggregate owns transaction boundary and Allocation orchestration", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("MULTI-CHECK-ALLOCATION-INTEGRATION-1");
    expect(svc).toContain("withCheckOwnedTransaction");
    expect(svc).toContain("createAllocationOnCheck");
    expect(svc).toContain("applyAllocationOnCheck");
    expect(svc).toContain("createMultiCheckAllocationOnCheck");
    expect(svc).toContain("applyMultiCheckAllocationOnCheck");
    expect(svc).toContain("db.transaction");
    expect(svc).not.toContain("insertMultiCheckAllocation(");
    expect(svc).not.toContain("updateMultiCheckAllocation(");
  });

  it("integration module routes Domain → Repository only", () => {
    const integ = read(
      "server/operational-session/check/checkMultiCheckAllocationIntegration.ts"
    );
    expect(integ).toContain("MULTI-CHECK-ALLOCATION-INTEGRATION-1");
    expect(integ).toContain("createMultiCheckAllocation");
    expect(integ).toContain("reserveAllocation");
    expect(integ).toContain("applyAllocation");
    expect(integ).toContain("adjustAllocation");
    expect(integ).toContain("reverseAllocation");
    expect(integ).toContain("completeAllocation");
    expect(integ).toContain("cancelAllocation");
    expect(integ).toContain("insertMultiCheckAllocation");
    expect(integ).toContain("updateMultiCheckAllocation");
    expect(integ).toContain("already_applied");
    expect(integ).toContain("no_change");
    expect(integ).toContain("SessionDbClient");
    expect(integ).not.toContain("EventBus");
    expect(integ).not.toContain("outbox");
    expect(integ).not.toContain("inbox");
    expect(integ).not.toContain(".transaction(");
    expect(integ).not.toContain("updateOrderSettlement");
    expect(integ).not.toContain("applyPartialSettlementForOrder");
  });

  it("ATOMICITY GOVERNANCE: Check-owned tx required; no partial persist path", () => {
    const integ = read(
      "server/operational-session/check/checkMultiCheckAllocationIntegration.ts"
    );
    expect(integ).toContain("ATOMICITY GOVERNANCE");
    expect(integ).toContain("requireCheckOwnedTxClient");
    expect(integ).toContain("Partial persistence is prohibited");
    expect(integ).toContain("Allocation history append");
    expect(integ).toContain("Version increment");
    expect(integ).toContain("Domain event collection");
    expect(integ).toContain("must not open independent transactions");
    const repo = read(
      "server/operational-session/check/multiCheckAllocationRepository.ts"
    );
    expect(repo).toContain("appendHistory");
    expect(repo).not.toContain(".transaction(");
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("withCheckOwnedTransaction");
    expect(svc).toContain("createAllocationOnCheck(input, tx)");
    expect(svc).toContain("applyAllocationOnCheck(input, tx)");
  });

  it("insertMultiCheckAllocation is not imported outside Check Aggregate surface", () => {
    const allowed = new Set([
      "server/operational-session/check/checkMultiCheckAllocationIntegration.ts",
      "server/operational-session/check/multiCheckAllocationRepository.ts",
      "server/operational-session/check/index.ts",
    ]);
    const violators: string[] = [];
    for (const file of listTsFiles("server")) {
      if (file.includes("__tests__")) continue;
      if (allowed.has(file)) continue;
      const src = read(file);
      if (
        src.includes("insertMultiCheckAllocation") ||
        src.includes("updateMultiCheckAllocation(")
      ) {
        violators.push(file);
      }
    }
    expect(violators).toEqual([]);
  });

  it("does not redesign Domain or Persistence in this program", () => {
    const domainCmd = read(
      "shared/operational-session/check/multiCheckAllocation/multiCheckAllocationCommands.ts"
    );
    expect(domainCmd).toContain("MULTI-CHECK-ALLOCATION-DOMAIN-1");
    const migration = read("drizzle/0075_multi_check_allocation.sql");
    expect(migration).toContain("MULTI-CHECK-ALLOCATION-PERSISTENCE-1");
  });
});
