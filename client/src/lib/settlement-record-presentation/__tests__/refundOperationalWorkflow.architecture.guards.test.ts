/**
 * REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1 architecture guards", () => {
  it("exposes checkRefund transport façade over CheckService only", () => {
    const router = read(
      "server/operational-session/check/api/checkRefundRouter.ts"
    );
    const routers = read("server/routers.ts");
    expect(router).toContain("getCheckRefundBudget");
    expect(router).toContain("applyRefundOnCheck");
    expect(router).toContain("applyOnCheck");
    expect(router).toContain("assertRestaurantAccess");
    expect(router).not.toContain("executeRefundOnCheck");
    expect(router).not.toContain("calculateRefundBudget");
    expect(routers).toContain("checkRefund: checkRefundRouter");
  });

  it("Settlement Ledger hosts Refund action without a refund workspace", () => {
    const detail = read(
      "client/src/components/settlement-record/SettlementDetailSheet.tsx"
    );
    const dialog = read(
      "client/src/components/settlement-record/SettlementRefundDialog.tsx"
    );
    const dash = read("client/src/pages/Dashboard.tsx");
    expect(detail).toContain("isRefundActionVisible");
    expect(detail).toContain("useApplyCheckRefund");
    expect(detail).toContain("SettlementRefundDialog");
    expect(detail).toContain("readActiveRegister");
    expect(dialog).toContain("REFUND-OPERATIONAL-WORKFLOW-ADOPTION-1");
    expect(dash).not.toContain("RefundWorkspace");
    expect(dash).not.toContain("RefundDashboard");
  });

  it("presentation does not reimplement refund domain", () => {
    const files = [
      "client/src/components/settlement-record/SettlementDetailSheet.tsx",
      "client/src/components/settlement-record/SettlementRefundDialog.tsx",
      "client/src/lib/settlement-record-presentation/refundWorkflowPresentation.ts",
      "client/src/lib/settlement-record-presentation/useSettlementRecordQueries.ts",
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
