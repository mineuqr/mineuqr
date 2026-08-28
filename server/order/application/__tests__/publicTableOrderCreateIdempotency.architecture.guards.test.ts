/**
 * ORDER-CREATE-SUBMISSION-IDEMPOTENCY-SCHEMA-AND-HARDENING-1 — architecture guards.
 */
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(__dirname, "../../../../");

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

describe("order.create submission idempotency architecture", () => {
  it("requires a durable restaurant-scoped submission map, not in-memory locks", () => {
    const sql = read("drizzle/0102_order_create_idempotency.sql");
    expect(sql).toContain("CREATE TABLE IF NOT EXISTS `order_create_idempotency`");
    expect(sql).toContain("PRIMARY KEY (`restaurantId`, `submissionId`)");
    expect(sql).not.toMatch(/FOREIGN KEY/i);

    const store = read(
      "server/order/infrastructure/persistence/orderCreateIdempotencyStore.ts"
    );
    expect(store).toContain("orderCreateIdempotency");
    expect(store).toContain("OrderCreateIdempotencyUniqueCollisionError");
    expect(store).not.toContain("new Map(");
    expect(store).not.toContain("Promise cache");
    expect(store).not.toContain("runExclusive");
  });

  it("wires order.create to look up, persist in the Order TX, and replay on unique collision", () => {
    const createFn = orderCreateMutation();
    expect(createFn).toContain("submissionId");
    expect(createFn).toContain("replayPublicTableOrderCreate");
    expect(createFn).toContain("afterPersistInTransaction");
    expect(createFn).toContain("replayAfterOrderCreateUniqueCollision");
    expect(createFn.indexOf("replayPublicTableOrderCreate")).toBeLessThan(
      createFn.indexOf("resolveOperationalSession")
    );
    expect(createFn).toContain("{ awaitRelay: false }");
    expect(createFn).not.toContain("allocateCashierInvoiceForOrder");
    expect(createFn).not.toContain("commitCashierProductionCollectionFact");
    expect(createFn).not.toContain("confirmPayment");
    expect(createFn).not.toContain("finalizeCashierPreparedInvoice");
  });

  it("does not treat Session or trackingToken as the submission identity", () => {
    const fingerprint = read(
      "server/order/application/orderCreateSubmissionFingerprint.ts"
    );
    expect(fingerprint).toContain("restaurantId");
    expect(fingerprint).toContain("tableId");
    expect(fingerprint).not.toContain("sessionToken");
    expect(fingerprint).not.toContain("trackingToken");
    expect(fingerprint).not.toContain("sessionId");
    expect(fingerprint).not.toMatch(/\bprice\b/);
  });

  it("Table checkout reuses one submissionId for retries of the same Submit", () => {
    const provider = read(
      "client/src/lib/ordering-client/checkout/OrderingCheckoutProvider.tsx"
    );
    expect(provider).toContain("retainOrderCreateSubmissionId");
    expect(provider).toContain("submissionId: tableSubmissionIdRef.current");
    expect(provider).toContain("tableSubmissionIdRef.current = null");
  });

  it("keeps Cashier financial writers on the approved Confirm path only", () => {
    expect(existsSync(join(repoRoot, "drizzle/0102_order_create_idempotency.sql"))).toBe(
      true
    );
    const confirm = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    expect(confirm).toContain("allocateCashierInvoiceForOrder");
    expect(confirm).toContain("commitCashierProductionCollectionFact");
    expect(orderCreateMutation()).not.toContain("allocateCashierInvoiceForOrder");
  });
});
