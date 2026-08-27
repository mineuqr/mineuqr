/**
 * REFUND-DOCUMENT-PERSISTENCE-SEPARATION-1 — architecture guards.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REFUND-DOCUMENT-PERSISTENCE-SEPARATION-1 architecture", () => {
  it("CF-backed original-sale resolution uses Collection Fact, not gen=1 SR", () => {
    const resolver = read(
      "shared/operational-session/check/refund/refundOriginalSaleAnchor.ts"
    );
    expect(resolver).toContain("kind: \"collection_fact\"");
    expect(resolver).toContain("originalCollectedAmount");
    expect(resolver).not.toContain("gen=1");
    const budget = read(
      "shared/operational-session/check/refund/refundBudget.ts"
    );
    expect(budget).toContain("originalSale?.kind === \"collection_fact\"");
    expect(budget).toContain("originalCollectedAmount");
  });

  it("CF-backed refund execution does not require gen=1 SR as sale identity", () => {
    const cmds = read(
      "shared/operational-session/check/refund/refundCommands.ts"
    );
    expect(cmds).toContain("!budget.priorSettlementRecordId && !cfBacked");
    expect(cmds).toContain("originalCollectionFactId");
    const invariants = read(
      "shared/operational-session/check/refund/refundInvariants.ts"
    );
    expect(invariants).toContain("originalCollectionFactId");
  });

  it("SR remains refund/document persistence", () => {
    const integration = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    expect(integration).toContain("insertSettlementRecord");
    expect(integration).toContain("allocateRefundDocumentNumber");
    expect(integration).toContain('recordKind: "refund"');
    const cmds = read(
      "shared/operational-session/check/refund/refundCommands.ts"
    );
    expect(cmds).toContain("createCompensatingSettlementRecord");
    expect(cmds).toContain('recordKind: "refund"');
  });

  it("refund does not create Collection Fact or PAID", () => {
    const integration = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    expect(integration).not.toContain("commitCollectionFact");
    expect(integration).not.toContain("commitCashierProductionCollectionFact");
    expect(integration).not.toContain("markOrderPaid");
    expect(integration).not.toContain("status: \"paid\"");
  });

  it("refund does not increase Gross and current Cashier financial truth remains CF", () => {
    const map = read("shared/pos/financialResponsibilityMap.ts");
    expect(map).toContain("Collection Fact.amount");
    expect(map).toContain("production CF present = PAID");
    expect(map).toContain("not financial SSOT");
    const kpi = read("shared/reporting-platform/kpiDictionary.ts");
    expect(kpi).toContain("excludes complimentary CF and recordKind=refund");
    expect(kpi).toContain("recordKind = 'refund'");
  });

  it("legacy no-CF refund path remains available and ambiguous CF fails closed", () => {
    const resolver = read(
      "shared/operational-session/check/refund/refundOriginalSaleAnchor.ts"
    );
    expect(resolver).toContain("legacy_settlement_record");
    expect(resolver).toContain("no_production_collection_fact");
    expect(resolver).toContain("AmbiguousRefundOriginalSaleError");
    expect(resolver).toContain("fail closed");
    const resolution = read(
      "server/operational-session/check/checkRefundOriginalSaleResolution.ts"
    );
    expect(resolution).toContain(
      "Query failure must propagate. Empty rows are the only"
    );
  });

  it("does not create a second ledger or migration 0101", () => {
    const cmds = read(
      "shared/operational-session/check/refund/refundCommands.ts"
    );
    expect(cmds).not.toContain("createRefundLedger");
    expect(cmds).not.toContain("commitCollectionFact");
    expect(existsSync(join(repoRoot, "drizzle/0101_refund_document_separation.sql"))).toBe(
      false
    );
    expect(existsSync(join(repoRoot, "drizzle/0101.sql"))).toBe(false);
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
