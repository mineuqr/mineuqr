/**
 * REFUND-DOCUMENT-SR-SIMPLIFICATION-1 — architecture guards.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REFUND-DOCUMENT-SR-SIMPLIFICATION-1 architecture", () => {
  it("SR is not current financial SSOT and CF is original-sale anchor", () => {
    const map = read("shared/pos/financialResponsibilityMap.ts");
    expect(map).toContain("not financial SSOT");
    expect(map).toContain("Collection Fact.amount");
    expect(map).toContain("refund document/history + RF identity");
    expect(map).toContain("priorSettlementRecordId is document-chain only");
  });

  it("CF-backed refund does not require gen=1 SR for execute or ST lookup", () => {
    const cmds = read(
      "shared/operational-session/check/refund/refundCommands.ts"
    );
    expect(cmds).toContain("!budget.priorSettlementRecordId && !cfBacked");
    const lookup = read(
      "server/operational-session/check/api/checkRefundLookupService.ts"
    );
    expect(lookup).toContain("if (!primary && !cfAnchor)");
    expect(lookup).toContain("ST- is Check identity");
  });

  it("refund SR remains document/history persistence with RF identity", () => {
    const integration = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    expect(integration).toContain("insertSettlementRecord");
    expect(integration).toContain("allocateRefundDocumentNumber");
    const adoption = read(
      "shared/operational-session/check/settlementRecord/settlementRecordAdoption.ts"
    );
    expect(adoption).toContain("if (isRefundSettlementRecord(record)) return true");
  });

  it("refund cannot create CF, PAID, or Gross and has no second ledger", () => {
    const integration = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    expect(integration).not.toContain("commitCollectionFact");
    expect(integration).not.toContain("commitCashierProductionCollectionFact");
    expect(integration).not.toContain("createRefundLedger");
    const reporting = read(
      "server/reporting-platform/settlementRecordReportingAdapter.ts"
    );
    expect(reporting).toContain('if (kind !== "settlement" && kind !== "void") continue');
    expect(reporting).toContain('if (kind !== "refund") continue');
    expect(existsSync(join(repoRoot, "drizzle/0101.sql"))).toBe(false);
  });

  it("legacy no-CF path and refund document chain remain", () => {
    const budget = read(
      "shared/operational-session/check/refund/refundBudget.ts"
    );
    expect(budget).toContain("latestRefund?.settlementRecordId");
    expect(budget).toContain("legacy_settlement_record");
    const lookup = read(
      "server/operational-session/check/api/checkRefundLookupService.ts"
    );
    expect(lookup).toContain("if (!primary && !cfAnchor)");
  });

  it("does not alter 0098/0099/0100 or stop the gen=1 writer", () => {
    const writer = read(
      "server/operational-session/check/checkSettlementRecordIntegration.ts"
    );
    expect(writer).toContain("createSettlementRecordForCheckFinalize");
    expect(read("drizzle/0098_pos_sale_idempotency_open_check.sql")).toContain(
      "ADD COLUMN `checkId` int NOT NULL"
    );
    expect(read("drizzle/0099_cashier_order_handoffs.sql")).toContain(
      "CREATE TABLE `cashier_order_handoffs`"
    );
    expect(read("drizzle/0100_crmp_collection_fact_attribution.sql")).toContain(
      "collection_fact"
    );
  });
});
