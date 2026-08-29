/**
 * SELF-ORDER-CHECK-IN-ORDER-TRANSACTION-HARDENING-1 — architecture guards.
 *
 * Self-Order Check enrollment must use the Order persist transaction.
 * No Dining Session. No post-commit ensureCheckForOrder. No financial writers.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

describe("Self-Order Check in-order-transaction guards", () => {
  it("IdentityPlaceOrder enrolls sessionless Check on afterPersistInTransaction", () => {
    const identity = read(
      "server/order/application/IdentityPlaceOrderService.ts"
    );
    expect(identity).toContain("ensureSessionlessCheckForOrderInTransaction");
    expect(identity).toContain("shouldEnrollSessionlessCheck");
    expect(identity).toContain("afterPersistInTransaction");
    expect(identity).not.toContain("createSession");
    expect(identity).not.toContain("dining_sessions");

    const executeAt = identity.lastIndexOf("await this.placeOrder.execute");
    expect(executeAt).toBeGreaterThan(-1);
    expect(identity.indexOf("ensureCheckForOrder", executeAt)).toBe(-1);
  });

  it("sessionless Check helper requires the Order transaction and stays sessionless", () => {
    const check = read("server/operational-session/check/CheckService.ts");
    const start = check.indexOf(
      "export async function ensureSessionlessCheckForOrderInTransaction"
    );
    expect(start).toBeGreaterThan(-1);
    const end = check.indexOf(
      "export async function createAndEnrollCashierPosOpenCheckInTransaction",
      start
    );
    const body = check.slice(start, end);
    expect(body).toContain("sessionId: null");
    expect(body).toContain("client: tx");
    expect(body).toContain("Order transaction client");
    expect(body).not.toMatch(/await getDb\(/);
    expect(body).not.toContain("createSession");
    expect(body).not.toContain("createInvoice");
    expect(body).not.toContain("confirmPayment");
    expect(body).not.toContain("collectionFact");
  });

  it("placeWithIdentity does not open a Dining Session or own a second Check writer", () => {
    const routers = read("server/routers.ts");
    const start = routers.indexOf("placeWithIdentity: publicProcedure");
    expect(start).toBeGreaterThan(-1);
    const place = routers.slice(
      start,
      routers.indexOf("settlePaid: publicProcedure", start)
    );
    expect(place).toContain("identityPlaceOrderService.execute");
    expect(place).not.toContain("resolveTableSessionInTransaction");
    expect(place).not.toContain("ensureCheckForOrder");
    expect(place).not.toContain("createSession");
    expect(place).not.toContain("submissionId");
  });

  it("does not add financial or idempotency coupling", () => {
    const identity = read(
      "server/order/application/IdentityPlaceOrderService.ts"
    );
    expect(identity).not.toContain("createInvoice");
    expect(identity).not.toContain("confirmPayment");
    expect(identity).not.toContain("collectionFact");
    expect(identity).not.toContain("settleCheckPaid");
    expect(identity).not.toContain("submissionId");
    expect(identity).not.toContain("order_create_idempotency");
  });
});
