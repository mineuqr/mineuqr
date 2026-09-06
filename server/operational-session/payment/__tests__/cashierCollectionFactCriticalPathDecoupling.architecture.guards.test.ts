/**
 * CASHIER-COLLECTION-FACT-CRITICAL-PATH-DECOUPLING-1 — architecture guards.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function sliceSettleCashier(src: string): string {
  const start = src.indexOf(
    "export async function settleCashierPosOrderPaidByIdDetailed"
  );
  const end = src.indexOf(
    "export async function settleCheckComplimentaryById",
    start
  );
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return src.slice(start, end);
}

describe("CASHIER-COLLECTION-FACT-CRITICAL-PATH-DECOUPLING-1 architecture", () => {
  it("Cashier HTTP does not await ST / OS / SR after Collection Fact", () => {
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const check = read("server/operational-session/check/CheckService.ts");
    const cashier = sliceSettleCashier(check);
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(confirm).toContain("deferOperationalSettlementAfterCollectionFact: true");
    expect(confirm).not.toContain("insertSettlementTransactions");
    expect(confirm).not.toContain("createSettlementRecordForCheckFinalize");
    expect(confirm).not.toContain("applyFullSettlementToCheckOrders");
    expect(cashier).toContain("dispatchComplianceAfterProductionCollectionFact");
    expect(cashier).toContain("afterCompliance");
    expect(cashier).not.toContain("cashier-downstream-recovery");
    expect(cashier).toContain("freezeCashierPosPayableFromOrder");
    expect(cashier).toContain("deliverCashierPosOperationalSettlementAfterPaid");
    expect(cashier).not.toContain("materializeOrLoadCashierPosOpenCheck");
    expect(cashier).not.toContain(
      "await completeCashierOperationalSettlementAfterCollectionFact"
    );
    expect(confirm).toContain("commitCashierProductionCollectionFactInTransaction");
    expect(check).toMatch(
      /if \(input\.deferOperationalSettlementAfterCollectionFact\)[\s\S]*?finalizeCheckOutcome/
    );
  });

  it("does not silently migrate Session / other Confirm callers onto Cashier defer", () => {
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const session = read("server/diningSession/sessionService.ts");
    const settleOrder = read("server/order/application/SettleOrderPaidService.ts");
    const counter = read(
      "server/order/application/StaffCounterPickupSettlementService.ts"
    );
    expect(confirm).not.toContain("settleCheckPaidByIdDetailed");
    expect(session).not.toContain("deferOperationalSettlementAfterCollectionFact");
    expect(settleOrder).not.toContain("deferOperationalSettlementAfterCollectionFact");
    expect(counter).not.toContain("deferOperationalSettlementAfterCollectionFact");
    const waiter = read(
      "server/operational-device/services/WaiterDeviceOrderingService.ts"
    );
    const kioskRuntime = read(
      "server/ordering-platform/OrderingRuntimeMaterializer.ts"
    );
    const qrRuntime = read("server/ordering-platform/getQrOrderingRuntime.ts");
    expect(waiter).not.toContain("deferOperationalSettlementAfterCollectionFact");
    expect(kioskRuntime).not.toContain(
      "deferOperationalSettlementAfterCollectionFact"
    );
    expect(qrRuntime).not.toContain("deferOperationalSettlementAfterCollectionFact");
  });

  it("does not treat Check PAID as the Cashier HTTP success gate after Collection Fact", () => {
    const pos = read("server/pos/services/PosSettlementInitiateService.ts");
    expect(pos).toContain('outcome: "paid"');
    expect(pos).toContain("existingFact");
    expect(pos).not.toContain("check_already_terminal");
    expect(pos).toContain("posCheckIdFromFact");
  });

  it("keeps Collection Fact as the sole Cashier financial commit and insert-only", () => {
    const adapter = read(
      "server/operational-session/payment/collection-fact/commitCashierProductionCollectionFact.ts"
    );
    const repo = read(
      "server/operational-session/payment/collection-fact/collectionFactRepository.ts"
    );
    const sr = read(
      "server/operational-session/check/settlementRecordRepository.ts"
    );
    const st = read(
      "server/operational-session/check/settlementTransactionRepository.ts"
    );
    const os = read(
      "server/operational-session/check/orderSettlementRepository.ts"
    );
    expect(adapter).toContain("commitCollectionFact");
    expect(repo).not.toMatch(/\.update\(\s*paymentCollectionFacts/);
    expect(repo).not.toMatch(/\.delete\(\s*paymentCollectionFacts/);
    for (const body of [sr, st, os]) {
      expect(body).not.toContain("commitCollectionFact");
      expect(body).not.toContain("paymentCollectionFacts");
      expect(body).not.toMatch(/\.update\(\s*paymentCollectionFacts/);
      expect(body).not.toMatch(/\.delete\(\s*paymentCollectionFacts/);
    }
  });

  it("keeps Check / ST / OS / SR and forbids a payments table; 0098 is the certified POS sale endpoint", () => {
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    const check = read("server/operational-session/check/CheckService.ts");
    expect(schema).toContain("export const operationalChecks");
    expect(schema).toContain("export const checkSettlementTransactions");
    expect(schema).toContain("export const checkOrderSettlements");
    expect(schema).toContain("export const settlementRecords");
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
    expect(check).toContain("finalizeCheckOutcome");
    expect(check).toContain("insertSettlementTransactions");
    expect(check).toContain("applyFullSettlementToCheckOrders");
    expect(check).toContain("createSettlementRecordForCheckFinalize");
  });

  it("keeps Revenue Union production overlap authority unchanged", () => {
    const metrics = read("server/reporting-platform/BusinessMetricsService.ts");
    const resolver = read(
      "shared/reporting-platform/revenue-union/revenueUnionResolver.ts"
    );
    expect(metrics).toContain("computeRevenueUnion");
    expect(resolver).toContain("PRODUCTION_OVERLAP");
    expect(metrics).not.toContain("commitCollectionFact");
  });
});
