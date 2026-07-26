/**
 * REFUND-PRESENTATION-ADOPTION-1 — architecture / UX guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REFUND-PRESENTATION-ADOPTION-1 architecture guards", () => {
  it("Settlement Ledger remains the only financial workspace for refunds", () => {
    const panel = read(
      "client/src/components/settlement-record/SettlementHistoryPanel.tsx"
    );
    const dash = read("client/src/pages/Dashboard.tsx");
    expect(panel).toContain("settlementHistoryFiltersForStatusFacet");
    expect(panel).toContain('value="refunded"');
    expect(panel).not.toContain("RefundWorkspace");
    expect(panel).not.toContain("RefundPanel");
    expect(dash).toContain("SettlementHistoryPanel");
    expect(dash).not.toContain("RefundHistoryPanel");
  });

  it("presentation performs no financial calculations or mutations", () => {
    const files = [
      "client/src/lib/settlement-record-presentation/settlementChainPresentation.ts",
      "client/src/lib/settlement-record-presentation/settlementHistoryFilterPresentation.ts",
      "client/src/components/settlement-record/SettlementHistoryPanel.tsx",
      "client/src/components/settlement-record/SettlementDetailSheet.tsx",
    ];
    for (const file of files) {
      const src = read(file);
      expect(src, file).not.toContain("computeCheckMoney");
      expect(src, file).not.toContain("applyRefund");
      expect(src, file).not.toContain("insertSettlementRecord");
      expect(src, file).not.toContain("UPDATE ");
      expect(src, file).not.toContain("DELETE ");
    }
  });

  it("detail exposes compensating chain and prior linkage", () => {
    const detail = read(
      "client/src/components/settlement-record/SettlementDetailSheet.tsx"
    );
    expect(detail).toContain("toSettlementChainViewModel");
    expect(detail).toContain("useSettlementRecordsByCheck");
    expect(detail).toContain("priorSettlement");
    expect(detail).toContain("onOpenSettlementRecord");
    expect(detail).toContain('dir={language === "ar" ? "rtl" : "ltr"}');
  });

  it("attribution enrichment is read-only display labels", () => {
    const enrich = read(
      "server/operational-session/check/api/settlementRecordAttributionDisplay.ts"
    );
    expect(enrich).toContain("REFUND-PRESENTATION-ADOPTION-1");
    expect(enrich).toContain("loadSettlementRecordAttributionDisplay");
    expect(enrich).not.toContain("cashTenderAmount");
    expect(enrich).not.toContain("expectedCash");
  });
});
