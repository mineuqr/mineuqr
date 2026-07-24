/**
 * SETTLEMENT-HISTORY-UX-RATIONALIZATION-1 — architecture / UX guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("SETTLEMENT-HISTORY-UX-RATIONALIZATION-1 guards", () => {
  it("history panel uses quick ranges and defaults to 30 days", () => {
    const panel = read(
      "client/src/components/settlement-record/SettlementHistoryPanel.tsx"
    );
    expect(panel).toContain('useState<SettlementQuickRange>("30d")');
    expect(panel).toContain("defaultSettlementHistoryRange");
    expect(panel).toContain("quickToday");
    expect(panel).toContain("quick7d");
    expect(panel).toContain("quick30d");
    expect(panel).toContain("quick90d");
    expect(panel).not.toContain("month");
    expect(panel).not.toContain("year");
    expect(panel).not.toContain("type=\"month\"");
  });

  it("table is simplified with icon actions and merged source", () => {
    const panel = read(
      "client/src/components/settlement-record/SettlementHistoryPanel.tsx"
    );
    expect(panel).toContain("sourceLabel");
    expect(panel).toContain("statusLabel");
    expect(panel).toContain("<Receipt");
    expect(panel).toContain("<Eye");
    expect(panel).toContain("Tooltip");
    expect(panel).not.toContain("paymentStatusLabel");
    expect(panel).not.toContain("sourceNumber");
    expect(panel).toContain("dir={language === \"ar\" ? \"rtl\" : \"ltr\"}");
  });

  it("Settlement presentation resolves via provider alias (no local ST compose)", () => {
    const helpers = read(
      "client/src/lib/settlement-record-presentation/settlementHistoryPresentation.ts"
    );
    expect(helpers).toContain("resolveSettlementOperationalIdentity");
    expect(helpers).toContain("@shared/operational-document-identity");
    expect(helpers).toContain("formatOperationalSettlementNumber");
  });

  it("does not change Settlement Record domain or write APIs", () => {
    const panel = read(
      "client/src/components/settlement-record/SettlementHistoryPanel.tsx"
    );
    expect(panel).toContain("useSettlementRecordHistory");
    expect(panel).not.toContain("insertSettlementRecord");
    expect(panel).not.toContain("settleCheckPaid");
    const helpers = read(
      "client/src/lib/settlement-record-presentation/settlementHistoryPresentation.ts"
    );
    expect(helpers).toContain("SETTLEMENT-HISTORY-UX-RATIONALIZATION-1");
    expect(helpers).toContain("resolveSettlementOperationalIdentity");
  });
});
