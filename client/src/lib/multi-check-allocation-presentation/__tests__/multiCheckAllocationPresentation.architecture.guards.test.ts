/**
 * MULTI-CHECK-ALLOCATION-PRESENTATION-1 + PRODUCTION-ADOPTION-1 Rev 2.0
 * Architecture guards — UI dormant, core preserved.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isMultiCheckAllocationUiEnabled,
  MULTI_CHECK_ALLOCATION_CAPABILITY_STATUS,
  MULTI_CHECK_ALLOCATION_CORE_ACTIVE,
  MULTI_CHECK_ALLOCATION_REACTIVATION_SUPPORTED,
  MULTI_CHECK_ALLOCATION_UI_ENABLED,
} from "../multiCheckAllocationCapability";

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

describe("MULTI-CHECK-ALLOCATION-PRODUCTION-ADOPTION-1 UI suspension guards", () => {
  it("capability is dormant — UI disabled, core active, reactivation supported", () => {
    expect(MULTI_CHECK_ALLOCATION_CAPABILITY_STATUS).toBe("dormant");
    expect(MULTI_CHECK_ALLOCATION_UI_ENABLED).toBe(false);
    expect(MULTI_CHECK_ALLOCATION_CORE_ACTIVE).toBe(true);
    expect(MULTI_CHECK_ALLOCATION_REACTIVATION_SUPPORTED).toBe(true);
    expect(isMultiCheckAllocationUiEnabled()).toBe(false);
  });

  it("Check Workspace does not expose Multi Check Allocation or Split Payment to operators", () => {
    const sheet = read(
      "client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx"
    );
    expect(sheet).toContain("OrderSettlementPanel");
    expect(sheet).not.toContain("<MultiCheckAllocationPanel");
    expect(sheet).not.toContain("<SplitPaymentPanel");
    expect(sheet).not.toContain(
      'from "@/components/multi-check-allocation/MultiCheckAllocationPanel"'
    );
    expect(sheet).not.toContain(
      'from "@/components/split-payment/SplitPaymentPanel"'
    );
    expect(sheet).toContain("SETTLEMENT-UI-CLEANUP-1");
  });

  it("settlement action bars do not bind orphaned MCA or Split Payment invalidation", () => {
    const actionBar = read(
      "client/src/components/dashboard/DiningSessionActionBar.tsx"
    );
    const quick = read(
      "client/src/components/dashboard/SessionRowQuickActions.tsx"
    );
    expect(actionBar).not.toContain("multiCheckAllocation.");
    expect(quick).not.toContain("multiCheckAllocation.");
    expect(actionBar).not.toContain("splitPayment.");
    expect(quick).not.toContain("splitPayment.");
  });

  it("presentation library + components remain for reactivation", () => {
    expect(
      listTsFiles("client/src/lib/multi-check-allocation-presentation").length
    ).toBeGreaterThan(0);
    expect(
      listTsFiles("client/src/components/multi-check-allocation").length
    ).toBeGreaterThan(0);
    const panel = read(
      "client/src/components/multi-check-allocation/MultiCheckAllocationPanel.tsx"
    );
    expect(panel).toContain("useMultiCheckAllocationsBySourceCheck");
    expect(panel).toContain("UI dormant");
  });

  it("presentation module still does not touch Write Model / Projection store / Domain", () => {
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

  it("preserves API, Domain, Projection, and Integration (core active)", () => {
    const apiRouter = read(
      "server/operational-session/check/api/multiCheckAllocationRouter.ts"
    );
    expect(apiRouter).toContain("MULTI-CHECK-ALLOCATION-API-1");
    expect(apiRouter).toContain("createAllocation");

    const builder = read(
      "shared/operational-session/check/multiCheckAllocation/projection/multiCheckAllocationProjectionBuilder.ts"
    );
    expect(builder).toContain("MULTI-CHECK-ALLOCATION-PROJECTION-1");

    const integration = read(
      "server/operational-session/check/checkMultiCheckAllocationIntegration.ts"
    );
    expect(integration).toContain("MULTI-CHECK-ALLOCATION-INTEGRATION-1");
    expect(integration).not.toContain("MultiCheckAllocationPanel");

    const domain = read(
      "shared/operational-session/check/multiCheckAllocation/multiCheckAllocationCommands.ts"
    );
    expect(domain).toContain("MULTI-CHECK-ALLOCATION-DOMAIN-1");

    const routers = read("server/routers.ts");
    expect(routers).toContain(
      "multiCheckAllocation: multiCheckAllocationRouter"
    );
  });
});
