/**
 * BILL-FINANCIAL-LIFECYCLE-HARDENING-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("BILL-FINANCIAL-LIFECYCLE-HARDENING-1 architecture guards", () => {
  it("terminal Check money writes stay WHERE outcome='open'", () => {
    const repo = read("server/operational-session/check/checkRepository.ts");
    expect(repo).toContain("export async function touchOpenCheck");
    expect(repo).toContain("export async function finalizeCheckOutcome");
    expect(repo).toContain("export async function updateCheckMoney");
    expect(repo.match(/eq\(operationalChecks\.outcome, "open"\)/g)?.length).toBeGreaterThanOrEqual(
      3
    );
    expect(repo).toContain('outcome: "open"');
  });

  it("does not introduce a reopen command", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).not.toMatch(/reopenCheck|reopenBill|outcome:\s*"open"/);
    expect(svc).toContain("touchOpenCheck");
    expect(svc).toContain("Cannot mutate charges on a terminal check");
  });

  it("Bill calculation cannot load live Order totals", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("loadChargesSubtotal");
    expect(svc).not.toContain("loadOrdersSubtotal");
    expect(svc).not.toContain("getOrdersByIds");
    expect(svc).not.toContain("computeOrdersTotalAmount");
    expect(svc).not.toMatch(/ordersTotalAmount/);
  });

  it("check_order_membership is not Bill money authority", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    const refreshStart = svc.indexOf(
      "async function refreshOpenCheckMoneyFromDiscovery"
    );
    const refreshEnd = svc.indexOf(
      "async function captureSnapshotsFromBusinessSettings"
    );
    const refresh = svc.slice(refreshStart, refreshEnd);
    expect(refresh).toContain("loadChargesSubtotal");
    expect(refresh).not.toContain("listActiveOrderIdsForCheck");
    expect(refresh).not.toContain("check_order_membership");
  });

  it("Order lifecycle does not pay the Bill", () => {
    const orderPolicy = read(
      "server/order/domain/policies/OrderLifecyclePolicy.ts"
    );
    expect(orderPolicy).not.toContain("settleCheckPaid");
    expect(orderPolicy).not.toContain("CheckService");
    const orderAgg = read("server/order/domain/aggregate/Order.ts");
    expect(orderAgg).not.toContain("settleCheckPaid");
    expect(orderAgg).not.toContain("outcome");
  });

  it("does not introduce Payment, Refund, Settlement, or lifecycle engines", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).not.toContain("BillLifecycleEngine");
    expect(svc).not.toContain("BillStateMachineService");
    expect(svc).not.toContain("BillFinancialCoordinator");
    expect(svc).not.toContain("BillCompletionOrchestrator");
    expect(svc).not.toContain("FinancialLifecycleManager");
    expect(svc).not.toContain("class PaymentAggregate");
    expect(svc).not.toContain("class RefundAggregate");
    const composition = read(
      "server/operational-session/check/checkChargeComposition.ts"
    );
    expect(composition).toContain("touchOpenCheck");
    expect(composition).not.toContain("PaymentAggregate");
  });

  it("does not add migration 0096", () => {
    const journal = read("drizzle/meta/_journal.json");
    expect(journal).toContain("0095_check_charges");
    expect(journal).not.toContain("0096_");
  });
});
