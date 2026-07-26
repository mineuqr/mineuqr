/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 — architecture guards.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2 architecture guards", () => {
  it("exposes checkRefund transport façade with Settlement Number lookup", () => {
    const router = read(
      "server/operational-session/check/api/checkRefundRouter.ts"
    );
    const routers = read("server/routers.ts");
    expect(router).toContain("getCheckRefundBudget");
    expect(router).toContain("applyRefundOnCheck");
    expect(router).toContain("lookupBySettlementNumber");
    expect(router).toContain("assertRefundPolicyAllowsApply");
    expect(router).not.toContain("executeRefundOnCheck");
    expect(router).not.toContain("calculateRefundBudget");
    expect(routers).toContain("checkRefund: checkRefundRouter");
  });

  it("Settlement Ledger is the sole Refund write entry point", () => {
    const detail = read(
      "client/src/components/settlement-record/SettlementDetailSheet.tsx"
    );
    const panel = read(
      "client/src/components/settlement-record/SettlementHistoryPanel.tsx"
    );
    const ledgerDialog = read(
      "client/src/components/settlement-record/SettlementLedgerRefundDialog.tsx"
    );
    const dash = read("client/src/pages/Dashboard.tsx");
    expect(detail).not.toContain("SettlementRefundDialog");
    expect(detail).not.toContain("useApplyCheckRefund");
    expect(detail).not.toContain("isRefundActionVisible");
    expect(detail).not.toContain("ledgerRefundAction");
    expect(
      existsSync(
        join(
          repoRoot,
          "client/src/components/settlement-record/SettlementRefundDialog.tsx"
        )
      )
    ).toBe(false);
    expect(panel).toContain("ledgerRefundAction");
    expect(panel).toContain("SettlementLedgerRefundDialog");
    expect(ledgerDialog).toContain("useLookupCheckRefundBySettlementNumber");
    expect(ledgerDialog).toContain("REFUND-OPERATIONAL-WORKFLOW-ADOPTION-2");
    expect(
      read(
        "client/src/lib/settlement-record-presentation/useSettlementRecordQueries.ts"
      )
    ).toContain("trpc.checkRefund.lookupBySettlementNumber");
    expect(dash).not.toContain("RefundWorkspace");
    expect(dash).not.toContain("RefundDashboard");
  });

  it("presentation does not reimplement refund domain", () => {
    const files = [
      "client/src/components/settlement-record/SettlementDetailSheet.tsx",
      "client/src/components/settlement-record/SettlementLedgerRefundDialog.tsx",
      "client/src/lib/settlement-record-presentation/refundWorkflowPresentation.ts",
      "client/src/lib/settlement-record-presentation/useSettlementRecordQueries.ts",
      "server/operational-session/check/api/checkRefundLookupService.ts",
    ];
    for (const file of files) {
      const src = read(file);
      expect(src, file).not.toContain("executeRefundOnCheck");
      expect(src, file).not.toContain("calculateRefundBudget");
      expect(src, file).not.toContain("publishCompensatingSettlementRecord");
      expect(src, file).not.toContain("insertSettlementRecord");
    }
  });
});
