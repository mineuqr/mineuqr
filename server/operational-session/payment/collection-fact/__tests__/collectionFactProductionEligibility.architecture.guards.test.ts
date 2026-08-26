/**
 * PAYMENT-COLLECTION-FACT-PRODUCTION-ELIGIBILITY-1 — purpose + safety guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  COLLECTION_FACT_ISOLATED_PURPOSES,
  COLLECTION_FACT_PRODUCTION_PURPOSE,
  COLLECTION_FACT_PURPOSES,
  isCollectionFactIsolatedPurpose,
  isCollectionFactProductionPurpose,
  isCollectionFactPurpose,
} from "@shared/operational-session/payment/collection-fact";
import { PUBLISHED_COLLECTION_FACT_PURPOSES } from "@shared/reporting-platform/revenue-union";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("PAYMENT-COLLECTION-FACT-PRODUCTION-ELIGIBILITY-1", () => {
  it("distinguishes production purpose from isolated purposes", () => {
    expect(COLLECTION_FACT_PRODUCTION_PURPOSE).toBe("production");
    expect(COLLECTION_FACT_ISOLATED_PURPOSES).toEqual([
      "synthetic",
      "shadow",
      "test",
      "validation",
    ]);
    expect(COLLECTION_FACT_PURPOSES).toContain("production");
    expect(isCollectionFactPurpose("production")).toBe(true);
    expect(isCollectionFactProductionPurpose("production")).toBe(true);
    expect(isCollectionFactIsolatedPurpose("production")).toBe(false);
    for (const purpose of COLLECTION_FACT_ISOLATED_PURPOSES) {
      expect(isCollectionFactIsolatedPurpose(purpose)).toBe(true);
      expect(isCollectionFactProductionPurpose(purpose)).toBe(false);
    }
    expect(PUBLISHED_COLLECTION_FACT_PURPOSES).toEqual(["production"]);
  });

  it("keeps Collection Fact writes on the certified adapter, not Cashier UI or sale.create", () => {
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const settle = read("server/pos/services/PosSettlementInitiateService.ts");
    const finalize = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const check = read("server/operational-session/check/CheckService.ts");
    const paymentIndex = read("server/operational-session/payment/index.ts");
    for (const body of [settle, panel, check, paymentIndex]) {
      expect(body).not.toContain("commitCollectionFact");
    }
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(confirm).not.toContain("insertCollectionFact");
    expect(confirm).toContain("settleCashierPosOrderPaidByIdDetailed");
    expect(finalize).toContain("commitCashierProductionCollectionFact");
    expect(finalize).not.toContain("insertCollectionFact");
    expect(panel).not.toContain("trpc.pos.sale.create");
  });

  it("does not create a payments table or rewrite Check/Settlement", () => {
    const sql = read(
      "drizzle/0097_payment_collection_facts_production_purpose.sql"
    );
    const schema = read("drizzle/schema.ts");
    const sr = read(
      "server/operational-session/check/settlementRecordRepository.ts"
    );
    expect(sql).toContain("ALTER TABLE `payment_collection_facts`");
    expect(sql).toContain("'production'");
    expect(sql).not.toMatch(/CREATE TABLE `payments`/);
    expect(sql).not.toMatch(/INSERT\s+INTO/i);
    expect(sql).not.toMatch(/^\s*UPDATE\b/im);
    expect(sql).not.toMatch(/^\s*DELETE\b/im);
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(sr).not.toContain("commitCollectionFact");
  });
});
