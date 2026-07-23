/**
 * SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 + SETTLEMENT-UI-CLEANUP-1
 * Architecture guards — operator UI dormant, core preserved.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  isSplitPaymentUiEnabled,
  SPLIT_PAYMENT_CAPABILITY_STATUS,
  SPLIT_PAYMENT_CORE_ACTIVE,
  SPLIT_PAYMENT_REACTIVATION_SUPPORTED,
  SPLIT_PAYMENT_UI_ENABLED,
} from "../splitPaymentCapability";

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

describe("SETTLEMENT-UI-CLEANUP-1 Split Payment UI suspension", () => {
  it("capability is dormant — UI disabled, core active, reactivation supported", () => {
    expect(SPLIT_PAYMENT_CAPABILITY_STATUS).toBe("dormant");
    expect(SPLIT_PAYMENT_UI_ENABLED).toBe(false);
    expect(SPLIT_PAYMENT_CORE_ACTIVE).toBe(true);
    expect(SPLIT_PAYMENT_REACTIVATION_SUPPORTED).toBe(true);
    expect(isSplitPaymentUiEnabled()).toBe(false);
  });

  it("Check Workspace does not mount Split Payment or MCA panels", () => {
    const sheet = read(
      "client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx"
    );
    expect(sheet).not.toContain("<SplitPaymentPanel");
    expect(sheet).not.toContain(
      'from "@/components/split-payment/SplitPaymentPanel"'
    );
    expect(sheet).not.toContain("<MultiCheckAllocationPanel");
    expect(sheet).not.toContain("splitPayment.listByCheck");
    expect(sheet).toContain("SETTLEMENT-UI-CLEANUP-1");
    expect(sheet).toContain("OrderSettlementPanel");
  });

  it("settlement action bars do not bind orphaned splitPayment invalidation", () => {
    const actionBar = read(
      "client/src/components/dashboard/DiningSessionActionBar.tsx"
    );
    const quick = read(
      "client/src/components/dashboard/SessionRowQuickActions.tsx"
    );
    expect(actionBar).not.toContain("splitPayment.");
    expect(quick).not.toContain("splitPayment.");
    expect(actionBar).not.toContain("multiCheckAllocation.");
    expect(quick).not.toContain("multiCheckAllocation.");
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

  it("SplitPaymentPanel library remains for reactivation", () => {
    const panel = read(
      "client/src/components/split-payment/SplitPaymentPanel.tsx"
    );
    expect(panel).toContain("useSplitPaymentsByCheck");
    expect(panel).toContain("UI dormant");
    expect(panel).not.toContain("getSplitPaymentProjectionStore");
  });

  it("does not redesign Split Payment API, Domain, or Projection builders", () => {
    const apiRouter = read(
      "server/operational-session/check/api/splitPaymentReadRouter.ts"
    );
    expect(apiRouter).toContain("SPLIT-PAYMENT-API-1");

    const builder = read(
      "shared/operational-session/check/splitPayment/projection/splitPaymentProjectionBuilder.ts"
    );
    expect(builder).toContain("SPLIT-PAYMENT-PROJECTION-1");

    const integration = read(
      "server/operational-session/check/checkSplitPaymentIntegration.ts"
    );
    expect(integration).toContain("SPLIT-PAYMENT-INTEGRATION-1");
    expect(integration).not.toContain("SplitPaymentPanel");

    const routers = read("server/routers.ts");
    expect(routers).toContain("splitPayment: splitPaymentReadRouter");
  });
});
