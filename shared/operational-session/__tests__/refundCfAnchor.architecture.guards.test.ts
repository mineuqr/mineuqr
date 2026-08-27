/**
 * REFUND-CF-ANCHOR-1 — architecture guards.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("REFUND-CF-ANCHOR-1 architecture", () => {
  it("CF-backed refund resolution uses Collection Fact, not gen=1 SR, for original amount", () => {
    const budget = read(
      "shared/operational-session/check/refund/refundBudget.ts"
    );
    expect(budget).toContain("collection_fact");
    expect(budget).toContain("originalCollectedAmount");
    const resolver = read(
      "shared/operational-session/check/refund/refundOriginalSaleAnchor.ts"
    );
    expect(resolver).toContain("REFUND-CF-ANCHOR-1");
    expect(resolver).toContain("fail closed");
    expect(resolver).not.toContain(".limit(1)");
  });

  it("refund persistence still publishes compensating Settlement Record and does not write Collection Fact or PAID", () => {
    const integration = read(
      "server/operational-session/check/checkRefundIntegration.ts"
    );
    expect(integration).toContain("executeRefundOnCheck");
    expect(integration).toContain("originalSaleAnchor");
    expect(integration).toContain("insertSettlementRecord");
    expect(integration).toContain("resolveRefundOriginalSaleAnchorForCheck");
    expect(integration).not.toContain("commitCollectionFact");
    expect(integration).not.toContain("commitCashierProductionCollectionFact");
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    expect(confirm).not.toContain("applyRefundOnCheck");
    expect(confirm).not.toContain("resolveRefundOriginalSaleAnchor");
  });

  it("legacy non-CF path remains when no production Collection Fact exists", () => {
    const resolver = read(
      "shared/operational-session/check/refund/refundOriginalSaleAnchor.ts"
    );
    expect(resolver).toContain("legacy_settlement_record");
    expect(resolver).toContain("no_production_collection_fact");
    const budget = read(
      "shared/operational-session/check/refund/refundBudget.ts"
    );
    expect(budget).toContain("NoPriorSettlementError");
  });

  it("does not create migration 0100 or alter 0098/0099", () => {
    expect(existsSync(join(repoRoot, "drizzle/0100_refund_cf_anchor.sql"))).toBe(
      false
    );
    expect(read("drizzle/0098_pos_sale_idempotency_open_check.sql")).toContain(
      "ADD COLUMN `checkId` int NOT NULL"
    );
    expect(read("drizzle/0099_cashier_order_handoffs.sql")).toContain(
      "CREATE TABLE `cashier_order_handoffs`"
    );
  });

  it("responsibility map names Collection Fact as current refund original-sale identity", () => {
    const map = read("shared/pos/financialResponsibilityMap.ts");
    expect(map).toContain("CF-backed: production Collection Fact");
    expect(map).toContain("applyRefundOnCheck");
  });
});
