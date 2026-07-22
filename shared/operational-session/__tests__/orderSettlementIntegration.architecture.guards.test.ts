/**
 * ORDER-SETTLEMENT-INTEGRATION-1 — architecture guards.
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

describe("ORDER-SETTLEMENT-INTEGRATION-1 architecture guards", () => {
  it("Check Aggregate owns transaction boundary and OS orchestration", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("ORDER-SETTLEMENT-INTEGRATION-1");
    expect(svc).toContain("withCheckOwnedTransaction");
    expect(svc).toContain("applyFullSettlementToCheckOrders");
    expect(svc).toContain("applyComplimentaryToCheckOrders");
    expect(svc).toContain("voidOrderSettlementsForCheck");
    expect(svc).toContain("ensureOrderSettlementForEnrollment");
    expect(svc).toContain("recalculateOrderSettlementsForCheck");
    expect(svc).toContain("db.transaction");
    expect(svc).not.toContain("insertOrderSettlement(");
    expect(svc).not.toContain("updateOrderSettlement(");
  });

  it("integration module routes Domain → Repository only", () => {
    const integ = read(
      "server/operational-session/check/checkOrderSettlementIntegration.ts"
    );
    expect(integ).toContain("createOrderSettlement");
    expect(integ).toContain("applyFullSettlement");
    expect(integ).toContain("insertOrderSettlement");
    expect(integ).toContain("updateOrderSettlement");
    expect(integ).toContain("already_in_state");
    expect(integ).not.toContain("EventBus");
    expect(integ).not.toContain("outbox");
    expect(integ).not.toContain("inbox");
  });

  it("insertOrderSettlement is not imported outside Check Aggregate surface", () => {
    const allowed = new Set([
      "server/operational-session/check/checkOrderSettlementIntegration.ts",
      "server/operational-session/check/orderSettlementRepository.ts",
      "server/operational-session/check/index.ts",
    ]);
    const serverFiles = listTsFiles("server");
    const violators: string[] = [];
    for (const file of serverFiles) {
      if (file.includes("__tests__")) continue;
      if (allowed.has(file)) continue;
      const src = read(file);
      if (
        src.includes("insertOrderSettlement") ||
        src.includes("updateOrderSettlement")
      ) {
        // index re-exports are allowed via barrel; already filtered.
        violators.push(file);
      }
    }
    expect(violators).toEqual([]);
  });

  it("membership void rethrows for financial atomicity", () => {
    const membership = read(
      "server/operational-session/check/checkMembershipService.ts"
    );
    expect(membership).toContain("ensureOrderSettlementForEnrollment");
    expect(membership).toContain("throw e");
    expect(membership).toContain("deactivateMembershipsOnCheckVoid");
  });

  it("does not redesign Domain or Persistence in this program", () => {
    const domainCmd = read(
      "shared/operational-session/check/orderSettlement/orderSettlementCommands.ts"
    );
    expect(domainCmd).toContain("ORDER-SETTLEMENT-DOMAIN-1");
    const migration = read("drizzle/0073_check_order_settlements.sql");
    expect(migration).toContain("ORDER-SETTLEMENT-PERSISTENCE-1");
  });
});
