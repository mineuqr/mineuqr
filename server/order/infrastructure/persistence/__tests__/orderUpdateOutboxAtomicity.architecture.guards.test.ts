/**
 * ORDER-UPDATE-LEGACY-FALLBACK-OUTBOX-SAFETY-1 — architecture guards.
 *
 * Forbidden state: a committed Order status change without its required
 * OrderStatusChanged Outbox event. These guards keep the update path
 * transaction-only and keep the Outbox append inside the persist transaction.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

function read(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), "utf8");
}

const REPOSITORY_PATH =
  "server/order/infrastructure/persistence/DrizzleOrderRepository.ts";

describe("order update Outbox atomicity guards", () => {
  it("has no updateLegacy fallback and does not call the leftover db status helper", () => {
    const repo = read(REPOSITORY_PATH);
    expect(repo).not.toContain("updateLegacy");
    expect(repo).not.toContain("insertLegacy");
    expect(repo).not.toContain("updateOrderStatus");
    expect(repo).not.toContain("markOrderReadyAtIfFirstTransition");
  });

  it("fails closed on update instead of falling back", () => {
    const repo = read(REPOSITORY_PATH);
    const save = repo.slice(
      repo.indexOf("async save("),
      repo.indexOf("private async insertTransactional")
    );

    expect(save).not.toContain("this.updateLegacy");
    expect(save).not.toContain("return this.update");
    expect(save).toContain("logOrderUpdatePersistenceFailed");
    expect(save).toContain('reason: "transaction_failed"');
    expect(save).toContain('reason: "database_unavailable"');
    expect(save.match(/logOrderUpdatePersistenceFailed\(\{/g)).toHaveLength(2);
  });

  it("keeps the Outbox append inside the update transaction after the status write", () => {
    const repo = read(REPOSITORY_PATH);
    const update = repo.slice(repo.indexOf("private async updateTransactional"));

    expect(update).toContain("this.outbox.appendInTransaction(tx, outboxInputs)");
    expect(update).not.toContain("appendInTransaction(db");

    const statusUpdateAt = update.indexOf("status: newStatus");
    const outboxAt = update.indexOf("appendInTransaction");
    expect(statusUpdateAt).toBeGreaterThan(-1);
    expect(outboxAt).toBeGreaterThan(statusUpdateAt);
  });

  it("does not compensate a missing status event after commit", () => {
    const repo = read(REPOSITORY_PATH);
    expect(repo).not.toContain("setImmediate");
    expect(repo).not.toMatch(/backfill|compensat|repairOutbox/i);
  });

  it("keeps the update persistence diagnostic free of sensitive fields", () => {
    const observability = read(
      "server/order/observability/orderCreatePersistenceObservability.ts"
    );
    expect(observability).toContain("order_update_persistence_failed");

    const code = observability.replace(/\/\*\*[\s\S]*?\*\//g, "");
    const updateFn = code.slice(code.indexOf("export function logOrderUpdatePersistenceFailed"));
    const emitted = updateFn.slice(updateFn.indexOf("opsLog({"));
    expect(emitted).not.toMatch(
      /sessionToken|customerName|customerPhone|trackingToken|notes/
    );
  });

  it("does not import financial-path writers into the Order repository", () => {
    const repo = read(REPOSITORY_PATH);
    expect(repo).not.toMatch(/cashier|invoice|collectionFact|collection-fact|PAID|crmp/i);
  });
});
