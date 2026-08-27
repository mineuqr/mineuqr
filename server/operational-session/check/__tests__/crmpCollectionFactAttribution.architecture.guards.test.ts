/**
 * CRMP-CF-ATTRIBUTION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CRMP-CF-ATTRIBUTION-1 architecture", () => {
  it("does not make CRMP a second financial ledger or payment writer", () => {
    const domain = read("shared/crmp/financialShift/financialShiftCommands.ts");
    const adoption = read(
      "server/operational-session/check/checkSettlementAttributionAdoption.ts"
    );
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    expect(domain).not.toContain("commitCollectionFact");
    expect(domain).not.toContain("finalizeCheckOutcome");
    expect(adoption).not.toContain("commitCollectionFact");
    expect(adoption).not.toContain("finalizeCheckOutcome");
    expect(adoption).toContain("Never creates Collection Facts or PAID");
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(confirm).toContain("settleCashierPosOrderPaidByIdDetailed");
  });

  it("keeps 0098 and 0099 unchanged and journals additive 0100", () => {
    const sql0098 = read("drizzle/0098_pos_sale_idempotency_open_check.sql");
    const sql0099 = read("drizzle/0099_cashier_order_handoffs.sql");
    const sql0100 = read("drizzle/0100_crmp_collection_fact_attribution.sql");
    const journal = read("drizzle/meta/_journal.json");
    expect(sql0098).toContain("ALTER TABLE `pos_sale_idempotency`");
    expect(sql0099).toContain("CREATE TABLE `cashier_order_handoffs`");
    expect(sql0100).toContain("crmp_settlement_attributions");
    expect(sql0100).toContain("collectionFactId");
    expect(sql0100).not.toMatch(/ALTER TABLE `payment_collection_facts`/);
    expect(sql0100).not.toMatch(/ALTER TABLE `settlement_records`/);
    expect(journal).toContain("0100_crmp_collection_fact_attribution");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
    expect(journal).toContain("0099_cashier_order_handoffs");
  });

  it("does not use LIMIT 1 to hide Collection Fact ambiguity", () => {
    const resolver = read(
      "shared/operational-session/check/crmpSaleAttributionAnchor.ts"
    );
    const adoption = read(
      "server/operational-session/check/checkSettlementAttributionAdoption.ts"
    );
    expect(resolver).not.toMatch(/\bLIMIT 1\b/);
    expect(resolver).toContain("fail closed");
    expect(adoption).toContain("ambiguous_collection_facts");
    expect(adoption).not.toContain("findProductionCollectionFactByCheckId");
  });

  it("does not redesign refund persistence", () => {
    const adoption = read(
      "server/operational-session/check/checkSettlementAttributionAdoption.ts"
    );
    const refund = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    expect(adoption).toContain("adoptRefundAttributionAfterFinalize");
    expect(adoption).toContain("REFUND-REGISTER-ADOPTION-1");
    expect(refund).toContain("insertSettlementRecord");
    expect(refund).toContain("recordKind: \"refund\"");
  });
});
