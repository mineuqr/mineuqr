/**
 * CHECK-GENERALIZATION-M1 / ADR-ARCH-020 — architecture guards.
 * COMPATIBILITY-CLEANUP-1 — dual-write / Session-scan compatibility removed.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CHECK-GENERALIZATION-M1 architecture guards", () => {
  it("membership table exists and is Check-owned (not aggregate root module)", () => {
    const sql = read("drizzle/0071_check_order_membership.sql");
    expect(sql).toContain("check_order_membership");
    expect(sql).toContain("CHECK-GENERALIZATION-M1");
    expect(sql).toContain("checkId");
    expect(sql).toContain("orderId");

    const schema = read("drizzle/schema.ts");
    expect(schema).toContain("checkOrderMembership");
  });

  it("CheckService money path uses Charge composition, not live Order totals", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("loadChargesSubtotal");
    expect(svc).toContain("ensureOpenCheckChargeComposition");
    expect(svc).toContain("syncSessionOrdersToCheck");
    expect(svc).not.toContain("loadOrdersSubtotal");
    expect(svc).not.toContain("loadOrdersSubtotalCompatibilitySessionScan");
    expect(svc).not.toContain("getOrdersBySessionId");
    expect(svc).not.toContain("getOrdersByIds");
  });

  it("membership service is authoritative (no dual-write helpers)", () => {
    const membership = read(
      "server/operational-session/check/checkMembershipService.ts"
    );
    expect(membership).toContain("enrollOrderForSessionCheck");
    expect(membership).toContain("syncSessionOrdersToCheck");
    expect(membership).toContain("Not an aggregate");
    expect(membership).not.toContain("dualWrite");
    expect(membership).not.toContain("checkMembershipDualWrite");

    const env = read("server/_core/env.ts");
    expect(env).not.toContain("CHECK_MEMBERSHIP_DUAL_WRITE");
    expect(env).not.toContain("CHECK_MEMBERSHIP_AUTHORITATIVE_READ");
  });

  it("does not introduce Order settle façade (M6)", () => {
    const routers = read("server/routers.ts");
    expect(routers).not.toMatch(/order\.settlePaid/);
  });

  it("OrderSessionConsumer passes orderId for membership enroll", () => {
    const consumer = read(
      "server/order/infrastructure/events/consumers/OrderSessionConsumer.ts"
    );
    expect(consumer).toContain("orderId: event.orderId");
  });
});
