/**
 * SETTLEMENT-RECORD-UI-ADOPTION-1 — presentation architecture guards.
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

describe("SETTLEMENT-RECORD-UI-ADOPTION-1 architecture guards", () => {
  it("registers settlementRecord read router on appRouter", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("settlementRecordReadRouter");
    expect(routers).toContain("settlementRecord: settlementRecordReadRouter");
  });

  it("payment dialog exposes approved Register Payment layout only", () => {
    const dialog = read(
      "client/src/components/dashboard/MarkPaidSettlementDialog.tsx"
    );
    expect(dialog).toContain('settlementRecordUiLabel("outstanding"');
    expect(dialog).toContain('settlementRecordUiLabel("paymentMethods"');
    expect(dialog).toContain('settlementRecordUiLabel("amountPaid"');
    expect(dialog).toContain('settlementRecordUiLabel("remaining"');
    expect(dialog).toContain('settlementRecordUiLabel("registerPayment"');
    expect(dialog).not.toContain("allocation");
    expect(dialog).not.toContain("responsibility");
    expect(dialog).not.toContain("multiCheck");
  });

  it("presentation module consumes settlementRecord.* APIs only", () => {
    const files = listTsFiles("client/src/lib/settlement-record-presentation");
    for (const file of files) {
      if (file.includes("__tests__")) continue;
      const src = read(file);
      expect(src, file).not.toContain("CheckService");
      expect(src, file).not.toContain("insertSettlementRecord");
      expect(src, file).not.toContain("createSettlementRecord");
      expect(src, file).not.toContain("computeCheckMoney");
      expect(src, file).not.toContain("orderSettlement.");
    }
    const hooks = read(
      "client/src/lib/settlement-record-presentation/useSettlementRecordQueries.ts"
    );
    expect(hooks).toContain("trpc.settlementRecord");
    // REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — Check Aggregate refund façade only.
    expect(hooks).toContain("trpc.checkRefund");
  });

  it("history / detail / receipt UI mounts are present", () => {
    expect(
      read("client/src/components/settlement-record/SettlementHistoryPanel.tsx")
    ).toContain("useSettlementRecordHistory");
    expect(
      read("client/src/components/settlement-record/SettlementDetailSheet.tsx")
    ).toContain("useSettlementRecordDetail");
    expect(
      read("client/src/components/settlement-record/SettlementReceiptDialog.tsx")
    ).toContain("useSettlementRecordReceipt");
    const dash = read("client/src/pages/Dashboard.tsx");
    expect(dash).toContain("SettlementHistoryPanel");
    expect(dash).toContain('activeTab === "settlements"');
  });

  it("workspace surfaces settlement completion without technical jargon", () => {
    const sheet = read(
      "client/src/components/dashboard/DiningSessionWorkspaceSheet.tsx"
    );
    expect(sheet).toContain("SettlementSessionStatusPanel");
    expect(sheet).not.toContain("financialReference");
    expect(sheet).not.toContain("recordGeneration");
  });

  it("markPaid returns settlementRecordId for success navigation", () => {
    const routers = read("server/routers.ts");
    expect(routers).toContain("settlementRecordId: latest?.settlementRecordId");
    const actionBar = read(
      "client/src/components/dashboard/DiningSessionActionBar.tsx"
    );
    expect(actionBar).toContain("SettlementSuccessDialog");
    expect(actionBar).toContain("settlementRecordId");
  });
});
