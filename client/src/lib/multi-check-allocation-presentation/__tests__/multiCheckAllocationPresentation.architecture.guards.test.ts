/**
 * MULTI-CHECK-ALLOCATION-PRESENTATION-1 — architecture guards.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function listTsFiles(dirRel: string): string[] {
  const abs = join(repoRoot, dirRel);
  const out: string[] = [];
  for (const name of readdirSync(abs)) {
    const rel = `${dirRel}/${name}`.replace(/\\/g, "/");
    const full = join(repoRoot, rel);
    if (statSync(full).isDirectory()) {
      if (name === "__tests__" || name === "node_modules") continue;
      out.push(...listTsFiles(rel));
      continue;
    }
    if (name.endsWith(".ts") || name.endsWith(".tsx")) out.push(rel);
  }
  return out;
}

describe("MULTI-CHECK-ALLOCATION-PRESENTATION-1 architecture guards", () => {
  it("Check Workspace exposes Multi Check Allocation in settlement workflow", () => {
    const sheet = read(
      "client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx"
    );
    expect(sheet).toContain("MultiCheckAllocationPanel");
    expect(sheet).toContain("SplitPaymentPanel");
    expect(sheet).not.toContain("getMultiCheckAllocationProjectionStore");
    expect(sheet).not.toContain("multiCheckAllocationRepository");
    expect(sheet).not.toContain(
      "materializeMultiCheckAllocationProjections"
    );
  });

  it("presentation module consumes API only — no Write Model / Projection store / Domain", () => {
    const files = [
      ...listTsFiles("client/src/lib/multi-check-allocation-presentation"),
      ...listTsFiles("client/src/components/multi-check-allocation"),
    ];
    for (const file of files) {
      if (file.includes("__tests__")) continue;
      const src = read(file);
      expect(src, file).not.toContain("multiCheckAllocationRepository");
      expect(src, file).not.toContain(
        "getMultiCheckAllocationProjectionStore"
      );
      expect(src, file).not.toContain(
        "materializeMultiCheckAllocationProjections"
      );
      expect(src, file).not.toContain("CheckService");
      expect(src, file).not.toContain("createAllocationOnCheck");
      expect(src, file).not.toContain("parseAllocationMoney");
      expect(src, file).not.toContain("getDb");
      expect(src, file).not.toContain("@shared/operational-session");
    }
  });

  it("panel reads/writes only via presentation hooks and API procedures", () => {
    const panel = read(
      "client/src/components/multi-check-allocation/MultiCheckAllocationPanel.tsx"
    );
    expect(panel).toContain("useMultiCheckAllocationsBySourceCheck");
    expect(panel).toContain("useMultiCheckAllocationMutations");
    expect(panel).toContain("toMultiCheckAllocationPanelViewModel");
    expect(panel).toContain("createAllocation");
    expect(panel).toContain("AllocationActionBar");
    expect(panel).not.toContain("getMultiCheckAllocationProjectionStore");
    expect(panel).not.toContain("session.getOwnerWorkspace");
  });

  it("action bars invalidate multiCheckAllocation queries after mutations", () => {
    const actionBar = read(
      "client/src/components/dashboard/DiningSessionActionBar.tsx"
    );
    const quick = read(
      "client/src/components/dashboard/SessionRowQuickActions.tsx"
    );
    expect(actionBar).toContain(
      "multiCheckAllocation.listAllocations.invalidate"
    );
    expect(actionBar).toContain(
      "multiCheckAllocation.getAllocation.invalidate"
    );
    expect(quick).toContain(
      "multiCheckAllocation.listAllocations.invalidate"
    );
    expect(quick).toContain(
      "multiCheckAllocation.getAllocationSummary.invalidate"
    );
  });

  it("does not redesign API, Domain, Projection, or Integration", () => {
    const apiRouter = read(
      "server/operational-session/check/api/multiCheckAllocationRouter.ts"
    );
    expect(apiRouter).toContain("MULTI-CHECK-ALLOCATION-API-1");
    expect(apiRouter).not.toContain("PRESENTATION-1");

    const builder = read(
      "shared/operational-session/check/multiCheckAllocation/projection/multiCheckAllocationProjectionBuilder.ts"
    );
    expect(builder).toContain("MULTI-CHECK-ALLOCATION-PROJECTION-1");
    expect(builder).not.toContain("PRESENTATION-1");

    const integration = read(
      "server/operational-session/check/checkMultiCheckAllocationIntegration.ts"
    );
    expect(integration).toContain("MULTI-CHECK-ALLOCATION-INTEGRATION-1");
    expect(integration).not.toContain("MultiCheckAllocationPanel");
  });
});
