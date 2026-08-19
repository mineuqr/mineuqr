/**
 * CHECK-GENERALIZATION-M5 / ADR-ARCH-020 — channel adoption architecture guards.
 * COMPATIBILITY-CLEANUP-1 — dual-write remnants must not remain.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("CHECK-GENERALIZATION-M5 architecture guards", () => {
  it("Dashboard Session settle uses Check-centric ById APIs", () => {
    const svc = read("server/diningSession/sessionService.ts");
    expect(svc).toContain("confirmPayment");
    expect(svc).toContain("settleCheckComplimentaryById");
    expect(svc).not.toMatch(/settleCheckPaid\(/);
    expect(svc).not.toMatch(/getOrdersBySessionId/);
  });

  it("IdentityPlaceOrder enrolls sessionless orders into Check", () => {
    const place = read("server/order/application/IdentityPlaceOrderService.ts");
    expect(place).toContain("ensureCheckForOrder");
    expect(place).toContain('persistence === "ephemeral"');
  });

  it("OrderSessionConsumer enrolls sessionless OrderCreated", () => {
    const consumer = read(
      "server/order/infrastructure/events/consumers/OrderSessionConsumer.ts"
    );
    expect(consumer).toContain("ensureCheckForOrder");
    expect(consumer).toContain("event.sessionId == null");
  });

  it("session aggregate writers recalc Check by activeCheckId", () => {
    const writers = read("server/diningSession/sessionAggregateWriters.ts");
    expect(writers).toContain("recalculateOpenCheck");
    expect(writers).toContain("activeCheckId");
    expect(writers).toContain("enrollOrderForSessionCheck");
    expect(writers).not.toContain("dualWriteEnrollOrderForSession");
  });

  it("Session aggregate remains; dual-write helpers are gone", () => {
    const membership = read(
      "server/operational-session/check/checkMembershipService.ts"
    );
    expect(membership).not.toContain("dualWriteEnabled()");
    expect(membership).not.toContain("dualWrite");
    const sessionSvc = read("server/diningSession/sessionService.ts");
    expect(sessionSvc).toContain("export async function markPaid");
    expect(sessionSvc).toContain("export async function getOrCreateSession");
  });
});
