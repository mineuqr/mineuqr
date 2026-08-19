/**
 * BILL-SIMPLIFICATION-1 — architecture guards.
 * Boundary only. Not implementation trivia.
 */
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("BILL-SIMPLIFICATION-1 architecture guards", () => {
  it("Bill calculation does not load live Order or Session totals", () => {
    const money = read("shared/operational-session/check/checkMoney.ts");
    expect(money).toContain("chargesSubtotal");
    expect(money).not.toMatch(/ordersSubtotal/);
    expect(money).not.toMatch(/ordersTotalAmount/);

    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("loadChargesSubtotal");
    expect(svc).toContain("computeCheckMoney");
    expect(svc).not.toContain("getOrdersByIds");
    expect(svc).not.toContain("loadOrdersSubtotal");
    expect(svc).not.toContain("computeOrdersTotalAmount");
    expect(svc).not.toMatch(/ordersTotalAmount/);
  });

  it("Bill does not own a second Payment store or Payment engine", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0095_check_charges");
    expect(journal).not.toContain("0096_");

    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("checkSettlementTransactions");
    expect(schema).not.toMatch(/mysqlTable\(\s*"payments"/);
    expect(schema).not.toContain("check_payments");

    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("insertSettlementTransactions");
    expect(svc).toContain("billAmountDueFromCollection");
    expect(svc).not.toContain("PaymentEngine");
    expect(svc).not.toContain("PaymentOrchestrator");
    expect(svc).not.toContain("class PaymentAggregate");
    expect(svc).not.toMatch(/paymentsRepository/);
  });

  it("Bill does not use Order Settlement or membership as amount authority", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    const moneyStart = svc.indexOf("async function refreshOpenCheckMoneyFromDiscovery");
    const moneyEnd = svc.indexOf("async function captureSnapshotsFromBusinessSettings");
    const refresh = svc.slice(moneyStart, moneyEnd);
    expect(refresh).toContain("loadChargesSubtotal");
    expect(refresh).not.toContain("orderTotalSnapshot");
    expect(refresh).not.toContain("listActiveOrderIdsForCheck");
    expect(refresh).not.toContain("findBlockingMembershipForOrder");

    const paidStart = svc.indexOf("async function finalizeOpenCheckById");
    const paid = svc.slice(paidStart, paidStart + 9000);
    expect(paid).toContain("resolvePaidCollectionLines");
    expect(paid).toContain("loadChargesSubtotal");
    expect(paid).not.toContain("orderTotalSnapshot");
    expect(paid).not.toContain("listActiveOrderIdsForCheck");
  });

  it("Bill remains Charge-based with terminal lifecycle and Complimentary as a Bill outcome", () => {
    const contract = read("shared/operational-session/check/checkContract.ts");
    expect(contract).toContain('"open"');
    expect(contract).toContain('"paid"');
    expect(contract).toContain('"complimentary"');
    expect(contract).toContain('"voided"');
    expect(contract).not.toContain("reopened");
    expect(contract).not.toContain("refunded");

    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("complimentarySettlementLine");
    expect(svc).not.toMatch(/reopenCheck|reopenBill/);

    const composition = read(
      "server/operational-session/check/checkChargeComposition.ts"
    );
    expect(composition).toContain("snapshotChargesForEnrolledOrder");
    expect(composition).not.toContain("PaymentEngine");
  });

  it("does not redesign Refund, Settlement Record, or add a Bill engine / new financial root", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).not.toContain("BillEngine");
    expect(svc).not.toContain("BillManager");
    expect(svc).not.toContain("BillLifecycleManager");
    expect(svc).not.toContain("FinancialBillEngine");
    expect(svc).not.toContain("BillCalculationEngine");
    expect(svc).not.toContain("BillCoordinator");
    expect(svc).not.toContain("ObligationEngine");
    expect(svc).not.toContain("FinancialDomainFacade");

    const refund = read(
      "shared/operational-session/check/refund/refundBudget.ts"
    );
    expect(refund).toContain("Settlement Record history only");

    const sr = read(
      "server/operational-session/check/checkSettlementRecordIntegration.ts"
    );
    expect(sr).toContain("createSettlementRecordForCheckFinalize");
  });

  it("does not add migration 0096 or a payments table file", () => {
    const drizzleFiles = readdirSync(join(repoRoot, "drizzle"));
    expect(drizzleFiles.some((name) => name.startsWith("0096"))).toBe(false);
    expect(existsSync(join(repoRoot, "drizzle/0096_payments.sql"))).toBe(false);
  });

  it("removes dead CheckService collection-read wrappers without deleting mutation façades", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).not.toContain("export async function getSplitPaymentsForCheck");
    expect(svc).not.toContain(
      "export async function getSplitPaymentAttemptsForCheck"
    );
    expect(svc).not.toContain(
      "export async function getCheckOutstandingBalance"
    );
    expect(svc).not.toContain(
      "export async function getMultiCheckAllocationsForSourceCheck"
    );
    expect(svc).not.toContain(
      "export async function getMultiCheckAllocationByIdentity"
    );
    expect(svc).toContain("createSplitPaymentOnCheck");
    expect(svc).toContain("createMultiCheckAllocationOnCheck");
    expect(svc).toContain("settleCheckPaidByIdDetailed");
  });
});
