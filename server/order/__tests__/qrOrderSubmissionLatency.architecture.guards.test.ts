/**
 * QR-ORDER-SUBMISSION-PERFORMANCE-FIX-1 — architecture guards.
 * Performance only. Must not change Cashier / CF / PAID / relay / identity.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

function orderCreateMutation(): string {
  const routers = read("server/routers.ts");
  const createStart = routers.indexOf("  create: publicProcedure");
  return routers.slice(
    createStart,
    routers.indexOf("  list: verifiedProcedure", createStart)
  );
}

describe("QR-ORDER-SUBMISSION-PERFORMANCE-FIX-1 architecture guards", () => {
  it("QR order.create remains non-financial and defers relay", () => {
    const createFn = orderCreateMutation();
    expect(createFn).toContain("{ awaitRelay: false }");
    expect(createFn).not.toContain("awaitRelay: true");
    expect(createFn).not.toContain("confirmPayment");
    expect(createFn).not.toContain("createCollectionFact");
    expect(createFn).not.toContain("PAID");
    expect(createFn).not.toContain("finalizeCashierPreparedInvoice");
    expect(createFn).toContain("placeOrderService.execute");
    expect(createFn).toContain("resolveOperationalSession");
    expect(createFn).toContain("tableContext: { restaurant, table }");
  });

  it("reuses authorized restaurant for guest ordering without dropping hasFeature", () => {
    const authority = read("server/commercial/guestOrderingAuthority.ts");
    expect(authority).toContain("hasFeature");
    expect(authority).toContain('"ordering"');
    expect(authority).toContain("restaurantRow");
    expect(authority).not.toContain("if (isOwner) return true");
    expect(authority).not.toContain('plan === "basic"');

    const routers = read("server/routers.ts");
    const assertStart = routers.indexOf(
      "async function assertPublicOrderingRestaurant"
    );
    const assertFn = routers.slice(
      assertStart,
      routers.indexOf("function generateSlug", assertStart)
    );
    expect(assertFn).toContain("resolveGuestOrderingAllowed(");
    expect(assertFn).toContain("restaurant");
  });

  it("validates table/session once and skips empty Check bill work on new Session", () => {
    const session = read("server/diningSession/sessionService.ts");
    expect(session).toContain("tableContextAlreadyValidated: true");
    expect(session).not.toContain("return getOrCreateSession(input)");
    expect(session).toContain("skipEmptyBillPreparation: true");
    expect(session).toContain("newSessionInSameTransaction: true");
    expect(session).toContain("DiningSessionValidationError(\"Table does not belong to restaurant\")");
    expect(session).toContain("DiningSessionValidationError(\"Table is not active\")");

    const createSessionStart = session.indexOf("async function createSession(");
    const createSessionFn = session.slice(
      createSessionStart,
      session.indexOf("export async function getActiveSession", createSessionStart)
    );
    expect(createSessionFn).toContain("skipEmptyBillPreparation: true");
    expect(createSessionFn).not.toContain("syncSessionOrdersToCheck");
    expect(createSessionFn).not.toContain("recalculateOrderSettlementsForCheck");
  });

  it("keeps Open Check row and defers empty money/charge/OS until first Order enroll", () => {
    const check = read("server/operational-session/check/CheckService.ts");
    expect(check).toContain("skipEmptyBillPreparation");
    expect(check).toContain("insertOperationalCheck");
    expect(check).toContain("updateSessionActiveCheckId");

    const writers = read("server/diningSession/sessionAggregateWriters.ts");
    expect(writers).toContain("enrollOrderForSessionCheck");
    expect(writers).toContain("recalculateCheckMoneyForSession");
  });

  it("does not introduce a migration or touch Cashier financial identity", () => {
    expect(existsSync(join(repoRoot, "drizzle/0102_qr_order_submission.sql"))).toBe(
      false
    );
    const cashier = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    expect(cashier).toContain("captureSnapshotsFromBusinessSettings");
  });
});
