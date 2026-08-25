/**
 * PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1 — architecture guards.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1 architecture", () => {
  it("Cashier Confirm consumes the certified writer and does not own persistence", () => {
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const adapter = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    const writer = read(
      "server/operational-session/payment/collection-fact/CollectionFactService.ts"
    );
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    const settle = read("server/pos/services/PosSettlementInitiateService.ts");
    const check = read("server/operational-session/check/CheckService.ts");
    const paymentIndex = read("server/operational-session/payment/index.ts");
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(confirm).toContain("commitCashierProductionCollectionFactInTransaction");
    expect(confirm).toContain("paymentIntentId");
    expect(confirm).toContain("idempotencyKey");
    expect(confirm).toContain("terminalId");
    expect(confirm).not.toContain("insertCollectionFact");
    expect(confirm).not.toContain("paymentCollectionFacts");
    expect(adapter).toContain("commitCollectionFact");
    expect(adapter).toContain("createDrizzleCollectionFactStore");
    expect(writer).toContain("Cashier Confirm is the first certified");
    expect(panel).toContain("paymentIntentId: paymentIntentRef.current");
    expect(panel).toContain("if (!paymentIntentRef.current)");
    expect(panel).toContain("newCashierPaymentIntentId");
    expect(panel).not.toContain("commitCollectionFact");
    expect(panel).not.toContain("computeCheckMoney");
    expect(settle).toContain("paymentIntentId: input.command.paymentIntentId");
    expect(settle).not.toContain("commitCollectionFact");
    expect(check).toContain("productionCollectionCommit");
    expect(check).not.toContain("commitCollectionFact");
    expect(check).not.toContain("paymentCollectionFacts");
    expect(check).toMatch(
      /await input\.productionCollectionCommit\([\s\S]*?finalizeCheckOutcome/
    );
    expect(paymentIndex).not.toContain("commitCollectionFact");
    expect(paymentIndex).toContain("confirmPayment");
    expect(adapter).not.toContain("computeCheckMoney");
    expect(adapter).not.toContain("captureSnapshotsFromBusinessSettings");
    expect(adapter).not.toContain("PaymentTaxEngine");
    expect(confirm).not.toContain("INSERT INTO");
    expect(confirm).not.toContain("payment_collection_facts");
    expect(
      read("client/src/lib/cashier-workspace/cashierIdempotency.ts")
    ).toContain("cpi_");
  });

  it("does not add a payments table, Payment aggregate, or offline queue; 0098 is the certified POS sale endpoint", () => {
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(journal).toContain("0097_payment_collection_facts_production_purpose");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
    expect(journal).not.toContain("0098_payments");
    const sql = readdirSync(join(repoRoot, "drizzle")).filter((name) =>
      name.endsWith(".sql")
    );
    expect(sql.filter((name) => name.startsWith("0098"))).toEqual([
      "0098_pos_sale_idempotency_open_check.sql",
    ]);
    expect(existsSync(join(repoRoot, "drizzle/0098.sql"))).toBe(false);
    const sql0098 = read("drizzle/0098_pos_sale_idempotency_open_check.sql");
    expect(sql0098).toContain("ALTER TABLE `pos_sale_idempotency`");
    expect(sql0098).not.toMatch(/payment_collection_facts/);
    expect(sql0098).not.toMatch(/CREATE TABLE `payments`/);
    expect(confirm).not.toContain("PaymentAggregate");
    expect(confirm).not.toContain("offline financial");
    expect(panel).not.toContain("kind: \"refund\"");
    expect(panel).not.toContain("kind: \"void\"");
    expect(panel).not.toContain("kind: \"complimentary\"");
  });

  it("keeps ST/OS/SR and Revenue Union downstream of Collection Fact", () => {
    const sr = read(
      "server/operational-session/check/settlementRecordRepository.ts"
    );
    const st = read(
      "server/operational-session/check/settlementTransactionRepository.ts"
    );
    const os = read(
      "server/operational-session/check/orderSettlementRepository.ts"
    );
    const metrics = read("server/reporting-platform/BusinessMetricsService.ts");
    const resolver = read(
      "shared/reporting-platform/revenue-union/revenueUnionResolver.ts"
    );
    for (const body of [sr, st, os]) {
      expect(body).not.toContain("commitCollectionFact");
      expect(body).not.toContain("paymentCollectionFacts");
      expect(body).not.toMatch(/\.update\(\s*paymentCollectionFacts/);
      expect(body).not.toMatch(/\.delete\(\s*paymentCollectionFacts/);
    }
    const adapter = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const panel = read(
      "client/src/components/cashier-workspace/CashierWorkspacePanel.tsx"
    );
    expect(metrics).toContain("computeRevenueUnion");
    expect(resolver).toContain("PRODUCTION_OVERLAP");
    expect(adapter).not.toContain('kind: "refund"');
    expect(adapter).not.toContain('kind: "void"');
    expect(adapter).not.toContain('kind: "complimentary"');
    expect(confirm).not.toContain("offline financial");
    expect(panel).not.toContain("local financial queue");
  });
});
