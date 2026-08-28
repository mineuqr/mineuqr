/**
 * ORDER-CREATE-LEGACY-FALLBACK-OUTBOX-SAFETY-1 — architecture guards.
 *
 * Forbidden state: a committed Order without its required OrderCreated Outbox
 * event. These guards keep the create path transaction-only and keep the Outbox
 * append inside the persist transaction.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const REPOSITORY_PATH =
  "server/order/infrastructure/persistence/DrizzleOrderRepository.ts";

describe("order create Outbox atomicity guards", () => {
  it("has no non-transactional Order create path in the repository", () => {
    const repo = read(REPOSITORY_PATH);
    expect(repo).not.toContain("insertLegacy");
    expect(repo).not.toContain("createOrderItems");
    expect(repo.includes("createOrder,")).toBe(false);
  });

  it("fails closed on create instead of falling back", () => {
    const repo = read(REPOSITORY_PATH);
    const save = repo.slice(repo.indexOf("async save("), repo.indexOf("private async insertTransactional"));

    expect(save).toContain("const isNewOrder = order.isNew();");
    // The only remaining fallback is the pre-existing update path.
    expect(save).toContain("return this.updateLegacy(order, options);");
    expect(save).not.toContain("this.insertLegacy");

    // Both create failure modes fail closed and are observable.
    expect(save).toContain('reason: "transaction_failed"');
    expect(save).toContain('reason: "database_unavailable"');
    expect(save.match(/logOrderCreatePersistenceFailed\(\{/g)).toHaveLength(2);
  });

  it("keeps the Outbox append inside the create transaction", () => {
    const repo = read(REPOSITORY_PATH);
    const insert = repo.slice(
      repo.indexOf("private async insertTransactional"),
      repo.indexOf("private async updateTransactional")
    );

    expect(insert).toContain("this.outbox.appendInTransaction(tx, outboxInputs)");
    // Outbox must be appended with the transaction handle, never a bare db handle.
    expect(insert).not.toContain("appendInTransaction(db");
    const orderInsertAt = insert.indexOf("tx.insert(orders)");
    const lineInsertAt = insert.indexOf("tx.insert(orderItems)");
    const outboxAt = insert.indexOf("appendInTransaction");
    expect(orderInsertAt).toBeGreaterThan(-1);
    expect(lineInsertAt).toBeGreaterThan(orderInsertAt);
    expect(outboxAt).toBeGreaterThan(lineInsertAt);
  });

  it("does not compensate a missing creation event after commit", () => {
    const repo = read(REPOSITORY_PATH);
    expect(repo).not.toContain("setImmediate");
    expect(repo).not.toMatch(/backfill|compensat|repairOutbox/i);
  });

  it("keeps the create persistence diagnostic free of sensitive fields", () => {
    const observability = read(
      "server/order/observability/orderCreatePersistenceObservability.ts"
    );
    expect(observability).toContain("order_create_persistence_failed");

    const emitted = observability.slice(observability.indexOf("opsLog({"));
    expect(emitted).not.toMatch(
      /sessionToken|customerName|customerPhone|trackingToken|notes/
    );
  });
});
