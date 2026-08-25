/**
 * CASHIER-COLLECTION-FACT-CRITICAL-PATH-2
 * Guards the approved Cashier contract: Collection Fact create/replay is PAID;
 * all Check/ST/OS/SR work is downstream and recovery infrastructure is absent.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function sliceCompletePayment(panel: string): string {
  const start = panel.indexOf("async function completePayment()");
  const end = panel.indexOf("function returnToDashboard()", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return panel.slice(start, end);
}

function sliceCashierSettle(check: string): string {
  const start = check.indexOf("export async function settleCashierPosOrderPaidByIdDetailed");
  const end = check.indexOf("export async function settleCheckComplimentaryById", start);
  expect(start).toBeGreaterThan(-1);
  expect(end).toBeGreaterThan(start);
  return check.slice(start, end);
}

describe("CASHIER-COLLECTION-FACT-CRITICAL-PATH-2", () => {
  it("keeps Collection Fact before non-blocking operational delivery", () => {
    const confirm = read("server/operational-session/payment/PaymentConfirmService.ts");
    const check = read("server/operational-session/check/CheckService.ts");
    const cashier = sliceCashierSettle(check);
    expect(confirm).toContain("deferOperationalSettlementAfterCollectionFact: true");
    expect(cashier).toContain("dispatchBestEffortDownstreamDelivery");
    expect(cashier).toContain("deliverCashierPosOperationalSettlementAfterPaid");
    expect(cashier).not.toContain("await completeCashierOperationalSettlementAfterCollectionFact");
    expect(cashier).not.toContain("ensureRemainingCashierDownstreamSettlement");
    expect(cashier).not.toContain("materializeOrLoadCashierPosOpenCheck");
  });

  it("uses the HTTP mutation response as the only Cashier success signal", () => {
    const panel = read("client/src/components/cashier-workspace/CashierWorkspacePanel.tsx");
    const complete = sliceCompletePayment(panel);
    const successAt = complete.indexOf("toast.success");
    expect(complete).toContain("await settleMutation.mutateAsync");
    expect(successAt).toBeGreaterThan(complete.indexOf("await settleMutation.mutateAsync"));
    expect(complete).not.toContain("recoverCashierUnknownSettlement");
    expect(complete).not.toContain("getByOrder.fetch");
    expect(complete).not.toContain("settlementRecord.getByCheck.fetch");
    expect(complete).not.toContain("rediscoverSettlementRecordId");
  });

  it("keeps auxiliary POS idempotency persistence outside the financial response gate", () => {
    const pos = read("server/pos/services/PosSettlementInitiateService.ts");
    const settleAt = pos.indexOf("settled = await this.settlePaid");
    const postSettle = pos.slice(settleAt);
    expect(settleAt).toBeGreaterThan(-1);
    expect(postSettle).toContain("void this.idempotency.put");
    expect(postSettle).not.toContain("await this.idempotency.put");
    expect(pos).toContain("Collection Fact is the authoritative replay source");
  });

  it("contains no Cashier recovery endpoint, worker, cron, or client recovery module", () => {
    const vercel = read("vercel.json");
    const app = read("server/_core/createApiApp.ts");
    const boot = read("server/_core/index.ts");
    expect(vercel).not.toContain("cashier-downstream-recovery");
    expect(vercel).not.toContain("\"crons\"");
    expect(app).not.toContain("CashierDownstreamSettlementRecovery");
    expect(boot).not.toContain("CashierDownstreamSettlementRecovery");
    expect(existsSync(join(repoRoot, "server/operational-session/payment/cashier-downstream-recovery"))).toBe(false);
    expect(existsSync(join(repoRoot, "client/src/lib/cashier-workspace/cashierSettlementRecovery.ts"))).toBe(false);
  });

  it("does not introduce a payments table or second financial authority; 0098 is the certified POS sale endpoint", () => {
    const journal = read("drizzle/meta/_journal.json");
    const schema = read("drizzle/schema.ts");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
    expect(journal).not.toContain("0098_payments");
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(schema).toContain("export const paymentCollectionFacts");
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
  });
});
