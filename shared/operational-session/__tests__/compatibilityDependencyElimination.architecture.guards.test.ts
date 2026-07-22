/**
 * COMPATIBILITY-DEPENDENCY-ELIMINATION-1 + COMPATIBILITY-CLEANUP-1 —
 * financial compatibility layers must be absent from production code.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("COMPATIBILITY-CLEANUP-1 architecture guards", () => {
  it("production Check create uses authoritative syncSessionOrdersToCheck", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("syncSessionOrdersToCheck");
    expect(svc).not.toContain("dualWriteSyncSessionOrdersToCheck");
    expect(svc).toContain("deactivateMembershipsOnCheckVoid");
    expect(svc).not.toContain("dualWriteDeactivateMembershipsOnVoid");
  });

  it("Session aggregate writers use authoritative enroll (not dual-write)", () => {
    const writers = read("server/diningSession/sessionAggregateWriters.ts");
    expect(writers).toContain("enrollOrderForSessionCheck");
    expect(writers).not.toContain("dualWriteEnrollOrderForSession");
  });

  it("operational lifecycle voids via Check ById (not Session voidCheck façade)", () => {
    const lifecycle = read(
      "server/operational-session/operationalSessionLifecycle.ts"
    );
    expect(lifecycle).toContain("voidCheckById");
    expect(lifecycle).not.toMatch(/\bvoidCheck\b/);
  });

  it("Session-scan money discovery is removed", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).not.toContain("loadOrdersSubtotalCompatibilitySessionScan");
    expect(svc).not.toContain("getOrdersBySessionId");
  });

  it("dual-write helpers are deleted from membership service", () => {
    const membership = read(
      "server/operational-session/check/checkMembershipService.ts"
    );
    expect(membership).not.toContain("dualWriteEnrollOrderForSession");
    expect(membership).not.toContain("dualWriteSyncSessionOrdersToCheck");
    expect(membership).not.toContain("dualWriteEnabled");
  });

  it("ops.getSettlement* APIs and settlementMetrics module are deleted", () => {
    const ops = read("server/ops/opsRouter.ts");
    expect(ops).not.toContain("getSettlementSummary");
    expect(ops).not.toContain("getSettlementTrend");
    expect(ops).not.toContain("getSettlementBreakdown");
    expect(
      existsSync(join(repoRoot, "server/analytics/settlementMetrics.ts"))
    ).toBe(false);

    for (const file of [
      "client/src/components/dashboard/ReportsTab.tsx",
      "client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx",
      "client/src/pages/waiter/WaiterTableWorkspaceStage.tsx",
    ]) {
      try {
        const src = read(file);
        expect(src, file).not.toContain("getSettlementSummary");
        expect(src, file).not.toContain("ops.getSettlement");
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw e;
      }
    }
    const reporting = read("server/reporting-platform/BusinessMetricsService.ts");
    expect(reporting).not.toContain("settlementMetrics");
    expect(reporting).not.toContain("getSettlementSummary");
  });
});
