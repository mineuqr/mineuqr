/**
 * REFUND-INVOICE-IDENTITY-AND-CONCURRENCY-HARDENING-1 — architecture guards.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REFUND invoice identity architecture guards", () => {
  it("exposes Invoice primary lookup and keeps ST secondary", () => {
    const router = read(
      "server/operational-session/check/api/checkRefundRouter.ts"
    );
    const routers = read("server/routers.ts");
    expect(router).toContain("lookupByInvoiceNumber");
    expect(router).toContain("lookupBySettlementNumber");
    expect(router).toContain("getCheckRefundBudget");
    expect(router).toContain("applyRefundOnCheck");
    expect(router).not.toContain("executeRefundOnCheck");
    expect(router).not.toContain("calculateRefundBudget");
    expect(routers).toContain("checkRefund: checkRefundRouter");
  });

  it("Settlement Ledger Refund UI uses Invoice as primary identity", () => {
    const ledgerDialog = read(
      "client/src/components/settlement-record/SettlementLedgerRefundDialog.tsx"
    );
    const panel = read(
      "client/src/components/settlement-record/SettlementHistoryPanel.tsx"
    );
    const hooks = read(
      "client/src/lib/settlement-record-presentation/useSettlementRecordQueries.ts"
    );
    const detail = read(
      "client/src/components/settlement-record/SettlementDetailSheet.tsx"
    );
    expect(detail).not.toContain("SettlementRefundDialog");
    expect(detail).not.toContain("useApplyCheckRefund");
    expect(
      existsSync(
        join(
          repoRoot,
          "client/src/components/settlement-record/SettlementRefundDialog.tsx"
        )
      )
    ).toBe(false);
    expect(panel).toContain("SettlementLedgerRefundDialog");
    expect(ledgerDialog).toContain("useLookupCheckRefundByInvoiceNumber");
    expect(ledgerDialog).toContain("invoiceNumber");
    expect(ledgerDialog).toContain('placeholder="000050"');
    expect(ledgerDialog).not.toContain('placeholder="ST-000570004"');
    expect(hooks).toContain("trpc.checkRefund.lookupByInvoiceNumber");
    expect(hooks).toContain("trpc.checkRefund.lookupBySettlementNumber");
  });

  it("Refund lookup does not mutate Invoice / CF / PAID writers", () => {
    const lookup = read(
      "server/operational-session/check/api/checkRefundLookupService.ts"
    );
    const integration = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    for (const src of [lookup, integration]) {
      expect(src).not.toContain("allocateCashierInvoiceForOrder");
      expect(src).not.toContain("insertCollectionFact");
      expect(src).not.toContain("updateCollectionFact");
    }
    expect(lookup).toContain("lookupCheckRefundByInvoiceNumber");
    expect(lookup).toContain("findCashierInvoiceBySequenceNumber");
    expect(lookup).toContain("getCheckRefundBudget");
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
