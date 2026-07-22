/**
 * ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1 — architecture guards.
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

describe("ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1 architecture guards", () => {
  it("Check Workspace consumes orderSettlement API panel only", () => {
    const sheet = read(
      "client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx"
    );
    expect(sheet).toContain("OrderSettlementPanel");
    expect(sheet).toContain("orderSettlement.listByCheck");
    expect(sheet).not.toContain("deriveSettlementSummary");
    expect(sheet).not.toContain("DiningSessionSettlementSummarySection");
    expect(sheet).not.toContain("SESSION_PAID");
  });

  it("legacy session-event settlement inference is removed", () => {
    const view = read("client/src/lib/diningSessionWorkspaceView.ts");
    expect(view).not.toContain("deriveSettlementSummary");
    expect(view).not.toContain("SessionSettlementSummary");
    expect(view).not.toContain("SESSION_COMPLIMENTARY");
  });

  it("presentation module does not touch Write Model / Projection store / Domain", () => {
    const files = listTsFiles("client/src/lib/order-settlement-presentation");
    for (const file of files) {
      if (file.includes("__tests__")) continue;
      const src = read(file);
      expect(src, file).not.toContain("createOrderSettlement");
      expect(src, file).not.toContain("applyFullSettlement");
      expect(src, file).not.toContain("insertOrderSettlement");
      expect(src, file).not.toContain("getOrderSettlementProjectionStore");
      expect(src, file).not.toContain("materializeOrderSettlementProjections");
      expect(src, file).not.toContain("CheckService");
      expect(src, file).not.toContain("calculateOutstandingAmount");
    }
  });

  it("OrderSettlementPanel reads only via presentation hooks / View Models", () => {
    const panel = read(
      "client/src/components/order-settlement/OrderSettlementPanel.tsx"
    );
    expect(panel).toContain("useOrderSettlementsByCheck");
    expect(panel).toContain("toOrderSettlementPanelViewModel");
    expect(panel).not.toContain("getOrderSettlementProjectionStore");
    expect(panel).not.toContain("session.getOwnerWorkspace");
  });

  it("action bars invalidate orderSettlement queries after mutations", () => {
    const actionBar = read(
      "client/src/components/dashboard/DiningSessionActionBar.tsx"
    );
    const quick = read(
      "client/src/components/dashboard/SessionRowQuickActions.tsx"
    );
    expect(actionBar).toContain("orderSettlement.listByCheck.invalidate");
    expect(quick).toContain("orderSettlement.listByCheck.invalidate");
  });

  it("does not redesign Order Settlement API or Projection builders", () => {
    const apiRouter = read(
      "server/operational-session/check/api/orderSettlementReadRouter.ts"
    );
    expect(apiRouter).toContain("ORDER-SETTLEMENT-API-1");
    const builder = read(
      "shared/operational-session/check/orderSettlement/projection/orderSettlementProjectionBuilder.ts"
    );
    expect(builder).toContain("ORDER-SETTLEMENT-PROJECTION-1");
    expect(builder).not.toContain("ORDER-SETTLEMENT-PRESENTATION");
  });
});
