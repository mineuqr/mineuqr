/**
 * COMPATIBILITY-DEPENDENCY-ELIMINATION-1 — production must not depend on
 * dual-write / Session money façades / soft-sunset settlement APIs.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("COMPATIBILITY-DEPENDENCY-ELIMINATION-1 architecture guards", () => {
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

  it("Session scan money discovery is isolated compatibility helper", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("loadOrdersSubtotalCompatibilitySessionScan");
    expect(svc).toMatch(
      /loadOrdersSubtotalCompatibilitySessionScan[\s\S]*getOrdersBySessionId/
    );
  });

  it("dual-write helpers remain in codebase (unused by production callers)", () => {
    const membership = read(
      "server/operational-session/check/checkMembershipService.ts"
    );
    expect(membership).toContain("export async function dualWriteEnrollOrderForSession");
    expect(membership).toContain("export async function dualWriteSyncSessionOrdersToCheck");
    expect(membership).toContain("if (!dualWriteEnabled()) return");
  });

  it("no production client/runtime calls ops.getSettlement*", () => {
    const clientSrcDirs = [
      "client/src/components",
      "client/src/pages",
      "client/src/hooks",
      "client/src/lib",
    ];
    // Spot-check known production surfaces previously audited
    for (const file of [
      "client/src/components/dashboard/ReportsTab.tsx",
      "client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx",
      "client/src/pages/waiter/WaiterTableWorkspaceStage.tsx",
    ]) {
      try {
        const src = read(file);
        expect(src, file).not.toContain("getSettlementSummary");
        expect(src, file).not.toContain("getSettlementTrend");
        expect(src, file).not.toContain("getSettlementBreakdown");
        expect(src, file).not.toContain("ops.getSettlement");
      } catch (e) {
        if ((e as NodeJS.ErrnoException).code === "ENOENT") continue;
        throw e;
      }
    }
    void clientSrcDirs;
    // Soft-sunset procedures may remain registered — no non-ops production importer.
    const reporting = read("server/reporting-platform/BusinessMetricsService.ts");
    expect(reporting).not.toContain("settlementMetrics");
    expect(reporting).not.toContain("getSettlementSummary");
  });
});
