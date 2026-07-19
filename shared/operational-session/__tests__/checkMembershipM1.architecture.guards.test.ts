/**
 * CHECK-GENERALIZATION-M1 / ADR-ARCH-020 — architecture guards.
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

  it("CheckService money path still uses Session order discovery (no cutover)", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).toContain("loadOrdersSubtotal");
    expect(svc).toContain("getOrdersBySessionId");
    expect(svc).toContain("dualWriteSyncSessionOrdersToCheck");
    // Must not use membership list for subtotal in M1
    expect(svc).not.toContain("listActiveOrderIdsForCheck");
  });

  it("dual-write is best-effort and flag-gated", () => {
    const membership = read(
      "server/operational-session/check/checkMembershipService.ts"
    );
    expect(membership).toContain("checkMembershipDualWrite");
    expect(membership).toContain("dualWriteEnrollOrderForSession");
    expect(membership).toContain("Not an aggregate");

    const env = read("server/_core/env.ts");
    expect(env).toContain("CHECK_MEMBERSHIP_DUAL_WRITE");
  });

  it("does not introduce sessionless EnsureCheckForOrder or Order settle façade", () => {
    const svc = read("server/operational-session/check/CheckService.ts");
    expect(svc).not.toContain("EnsureCheckForOrder");
    expect(svc).not.toContain("ensureCheckForOrder");
    expect(svc).not.toContain("settleCheckPaidById");

    const routers = read("server/routers.ts");
    expect(routers).not.toMatch(/order\.settlePaid|check\.settlePaid/);
  });

  it("OrderSessionConsumer passes orderId for dual-write", () => {
    const consumer = read(
      "server/order/infrastructure/events/consumers/OrderSessionConsumer.ts"
    );
    expect(consumer).toContain("orderId: event.orderId");
  });
});
