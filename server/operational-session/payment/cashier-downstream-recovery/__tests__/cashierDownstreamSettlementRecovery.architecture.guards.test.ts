/**
 * CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1 — architecture guards.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

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

describe("CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1 architecture", () => {
  it("recovery begins after financial commit and does not block HTTP", () => {
    const check = read("server/operational-session/check/CheckService.ts");
    const cashier = sliceSettleCashier(check);
    expect(cashier).toContain("continueAfterCashierHttp");
    expect(cashier).toContain("completeCashierOperationalSettlementAfterCollectionFact");
    expect(cashier).not.toContain(
      "await completeCashierOperationalSettlementAfterCollectionFact"
    );
    expect(cashier).not.toContain("sweepIncompleteCashierDownstreamSettlements");
    expect(check).toContain("ensureRemainingCashierDownstreamSettlement");
  });

  it("recovery cannot write Collection Fact and introduces no payments table or 0098", () => {
    const recovery = read(
      "server/operational-session/payment/cashier-downstream-recovery/cashierDownstreamSettlementRecovery.ts"
    );
    const worker = read(
      "server/operational-session/payment/cashier-downstream-recovery/cashierDownstreamSettlementRecoveryWorker.ts"
    );
    const repo = read(
      "server/operational-session/payment/collection-fact/collectionFactRepository.ts"
    );
    const schema = read("drizzle/schema.ts");
    const journal = read("drizzle/meta/_journal.json");
    for (const body of [recovery, worker]) {
      expect(body).not.toContain("commitCollectionFact");
      expect(body).not.toContain("insertCollectionFact");
      expect(body).not.toContain("updateCollectionFact(");
      expect(body).not.toContain("deleteCollectionFact(");
    }
    expect(repo).not.toMatch(/\.update\(\s*paymentCollectionFacts/);
    expect(repo).not.toMatch(/\.delete\(\s*paymentCollectionFacts/);
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(journal).not.toContain("0098");
    expect(readdirSync(join(repoRoot, "drizzle")).some((name) =>
      name.startsWith("0098")
    )).toBe(false);
    expect(existsSync(join(repoRoot, "drizzle/0098.sql"))).toBe(false);
  });

  it("keeps ST OS SR downstream and other channels unchanged", () => {
    const session = read("server/diningSession/sessionService.ts");
    const waiter = read(
      "server/operational-device/services/WaiterDeviceOrderingService.ts"
    );
    const settleOrder = read("server/order/application/SettleOrderPaidService.ts");
    const counter = read(
      "server/order/application/StaffCounterPickupSettlementService.ts"
    );
    expect(session).not.toContain("scheduleCashierDownstreamSettlementRecovery");
    expect(waiter).not.toContain("scheduleCashierDownstreamSettlementRecovery");
    expect(settleOrder).not.toContain("scheduleCashierDownstreamSettlementRecovery");
    expect(counter).not.toContain("scheduleCashierDownstreamSettlementRecovery");
    expect(session).not.toContain("deferOperationalSettlementAfterCollectionFact");
  });

  it("keeps Revenue Union overlap and PAID after Collection Fact", () => {
    const confirm = read(
      "server/operational-session/payment/PaymentConfirmService.ts"
    );
    const resolver = read(
      "shared/reporting-platform/revenue-union/revenueUnionResolver.ts"
    );
    expect(confirm).toContain("collectionFactOutcome != null ? \"paid\"");
    expect(resolver).toContain("PRODUCTION_OVERLAP");
    expect(confirm).not.toContain("sweepIncompleteCashierDownstreamSettlements");
  });

  it("POS replay schedules recovery without awaiting it", () => {
    const pos = read("server/pos/services/PosSettlementInitiateService.ts");
    expect(pos).toContain("scheduleCashierDownstreamSettlementRecovery");
    expect(pos).not.toContain("await recoverCashierDownstreamSettlementObligation");
    expect(pos).not.toContain("await sweepIncompleteCashierDownstreamSettlements");
  });
});

describe("CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-2 architecture", () => {
  it("Production Vercel cron invokes the durable sweep without awaiting ST on Confirm", () => {
    const vercelJson = read("vercel.json");
    const app = read("server/_core/createApiApp.ts");
    const http = read(
      "server/operational-session/payment/cashier-downstream-recovery/cashierDownstreamSettlementRecoveryHttp.ts"
    );
    const pos = read("server/pos/services/PosSettlementInitiateService.ts");
    const recovery = read(
      "client/src/lib/cashier-workspace/cashierSettlementRecovery.ts"
    );
    expect(vercelJson).toContain("/api/internal/cashier-downstream-recovery/sweep");
    expect(vercelJson).toContain("* * * * *");
    expect(app).toContain("registerCashierDownstreamSettlementRecoveryHttp");
    expect(http).toContain("CRON_SECRET");
    expect(http).toContain("sweepIncompleteCashierDownstreamSettlements");
    expect(pos).toContain("findProductionCollectionFactByOrderId");
    expect(pos).toContain("existingFact?.checkId");
    expect(recovery).toContain("check.financiallyPaid === true");
  });

  it("does not restore HTTP awaiting of ST OS SR or add migration 0098", () => {
    const check = read("server/operational-session/check/CheckService.ts");
    const cashier = sliceSettleCashier(check);
    const journal = read("drizzle/meta/_journal.json");
    expect(cashier).not.toContain(
      "await completeCashierOperationalSettlementAfterCollectionFact"
    );
    expect(cashier).not.toContain("await insertSettlementTransactions");
    expect(journal).not.toContain("0098");
  });
});
