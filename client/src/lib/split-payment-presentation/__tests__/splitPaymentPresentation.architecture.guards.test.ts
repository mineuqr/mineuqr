/**
 * SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 — architecture guards.
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

describe("SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 architecture guards", () => {
  it("Check Workspace consumes splitPayment API panel", () => {
    const sheet = read(
      "client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx"
    );
    expect(sheet).toContain("SplitPaymentPanel");
    expect(sheet).toContain("splitPayment.listByCheck");
    expect(sheet).not.toContain("getSplitPaymentProjectionStore");
    expect(sheet).not.toContain("splitPaymentRepository");
    expect(sheet).not.toContain("materializeSplitPaymentProjections");
  });

  it("presentation module does not touch Write Model / Projection store / Domain", () => {
    const files = listTsFiles("client/src/lib/split-payment-presentation");
    for (const file of files) {
      if (file.includes("__tests__")) continue;
      const src = read(file);
      expect(src, file).not.toContain("applySplitPayment");
      expect(src, file).not.toContain("splitPaymentRepository");
      expect(src, file).not.toContain("getSplitPaymentProjectionStore");
      expect(src, file).not.toContain("materializeSplitPaymentProjections");
      expect(src, file).not.toContain("CheckService");
      expect(src, file).not.toContain("calculateOutstanding");
      expect(src, file).not.toContain("getDb");
      expect(src, file).not.toContain("@shared/operational-session");
    }
  });

  it("SplitPaymentPanel reads only via presentation hooks / View Models", () => {
    const panel = read(
      "client/src/components/split-payment/SplitPaymentPanel.tsx"
    );
    expect(panel).toContain("useSplitPaymentsByCheck");
    expect(panel).toContain("useSplitPaymentOutstanding");
    expect(panel).toContain("toSplitPaymentPanelViewModel");
    expect(panel).not.toContain("getSplitPaymentProjectionStore");
    expect(panel).not.toContain("session.getOwnerWorkspace");
    expect(panel).not.toContain(".mutation(");
  });

  it("action bars invalidate splitPayment queries after mutations", () => {
    const actionBar = read(
      "client/src/components/dashboard/DiningSessionActionBar.tsx"
    );
    const quick = read(
      "client/src/components/dashboard/SessionRowQuickActions.tsx"
    );
    expect(actionBar).toContain("splitPayment.listByCheck.invalidate");
    expect(actionBar).toContain("splitPayment.getOutstanding.invalidate");
    expect(quick).toContain("splitPayment.listByCheck.invalidate");
    expect(quick).toContain("splitPayment.getSummaryByCheck.invalidate");
  });

  it("does not redesign Split Payment API, Domain, or Projection builders", () => {
    const apiRouter = read(
      "server/operational-session/check/api/splitPaymentReadRouter.ts"
    );
    expect(apiRouter).toContain("SPLIT-PAYMENT-API-1");
    expect(apiRouter).not.toContain("SPLIT-PAYMENT-PRESENTATION");

    const builder = read(
      "shared/operational-session/check/splitPayment/projection/splitPaymentProjectionBuilder.ts"
    );
    expect(builder).toContain("SPLIT-PAYMENT-PROJECTION-1");
    expect(builder).not.toContain("SPLIT-PAYMENT-PRESENTATION");

    const integration = read(
      "server/operational-session/check/checkSplitPaymentIntegration.ts"
    );
    expect(integration).toContain("SPLIT-PAYMENT-INTEGRATION-1");
    expect(integration).not.toContain("SplitPaymentPanel");
  });
});
