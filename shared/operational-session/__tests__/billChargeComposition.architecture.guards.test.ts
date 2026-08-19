/**
 * BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — architecture guards.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 architecture guards", () => {
  it("adds check_charges without replacing membership under another name", () => {
    const sql = read("drizzle/0095_check_charges.sql");
    expect(sql).toContain("CREATE TABLE `check_charges`");
    expect(sql).toContain("originOrderId");
    expect(sql).toContain("originOrderItemId");
    expect(sql).not.toContain("bill_orders");
    expect(sql).not.toContain("ticket_members");
    expect(sql).not.toContain("orderBillMembership");

    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("checkCharges");
    expect(schema).not.toContain("bill_orders");
    expect(schema).not.toContain("ticket_members");
  });

  it("CheckService Bill calculation does not load live Order totals", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("loadChargesSubtotal");
    expect(svc).toContain("ensureOpenCheckChargeComposition");
    expect(svc).not.toContain("loadOrdersSubtotal");
    expect(svc).not.toContain("getOrdersByIds");
    expect(svc).not.toContain("computeOrdersTotalAmount");
    expect(svc).not.toMatch(/listActiveOrderIdsForCheck/);
  });

  it("Charge repository is insert-only for money", () => {
    const repo = read(
      "server/operational-session/check/checkChargeRepository.ts"
    );
    expect(repo).toContain("insertCheckCharge");
    expect(repo).toContain("listCheckCharges");
    expect(repo).not.toMatch(/\.update\(/);
    expect(repo).not.toMatch(/\.set\(/);
    expect(repo).not.toContain("updateCheckCharge");
  });

  it("does not introduce Payment aggregate or membership rename", () => {
    const composition = read(
      "server/operational-session/check/checkChargeComposition.ts"
    );
    expect(composition).toContain("snapshotChargesForEnrolledOrder");
    expect(composition).toContain("compensateChargesForCancelledOrder");
    expect(composition).not.toContain("PaymentAggregate");
    expect(composition).not.toContain("bill_orders");
    expect(composition).not.toContain("Order.checkId");
  });

  it("membership table remains until Charge composition is adopted", () => {
    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("checkOrderMembership");
    const membershipSql = read("drizzle/0071_check_order_membership.sql");
    expect(membershipSql).toContain("check_order_membership");
  });
});
