import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("RECOVERY-DISCOVERY-STARVATION-HARDENING-1 architecture", () => {
  it("parks permanent Drawer items out of active discovery without schema", () => {
    const recover = read(
      "server/operational-session/payment/recoverCollectionFactDrawerAttribution.ts"
    );
    const list = read(
      "server/operational-session/payment/collection-fact/collectionFactRepository.ts"
    );
    const classify = read(
      "server/operational-session/payment/recoveryDiscoveryClassification.ts"
    );
    const journal = read("drizzle/meta/_journal.json");
    expect(recover).toContain("listActiveParkedDrawerAttributionFactIds");
    expect(recover).toContain("classifyDrawerAttributionRecovery");
    expect(recover).toContain("committedAt: fact.committedAt");
    expect(recover).not.toContain("resolveSettlementContextForSettle");
    expect(recover).not.toContain("commitCollectionFact");
    expect(recover).not.toContain("allocateCashierInvoiceForOrder");
    expect(recover).not.toContain("advanceStatus");
    expect(list).toContain("excludeCollectionFactIds");
    expect(list).toContain("notInArray");
    expect(classify).toContain("no_shift_at_commit_time");
    expect(classify).toContain("permanently_unrecoverable");
    expect(classify).toContain("attribution_create_failed");
    const parkStore = read("server/operational-session/payment/recoveryParkStore.ts");
    expect(parkStore).toContain("orderDomainConsumerProcessed");
    expect(parkStore).toContain("rcv.park.drawer");
    expect(journal).not.toContain("0102_");
    expect(existsSync(join(repoRoot, "drizzle/0102.sql"))).toBe(false);
  });

  it("does not reset Outbox attempts on requeue and prefers low-attempt pending work", () => {
    const outbox = read(
      "server/order/infrastructure/events/outbox/DrizzleOutboxRepository.ts"
    );
    const fairness = read(
      "server/order/infrastructure/events/outbox/outboxRecoveryFairness.ts"
    );
    const requeueStart = outbox.indexOf("async requeueFailedBatch");
    const requeue = outbox.slice(requeueStart, requeueStart + 1200);
    expect(requeue).toContain("nextOutboxRequeueRetryAt");
    expect(requeue).toContain("OUTBOX_POISON_LAST_ERROR_PREFIX");
    expect(requeue).not.toContain("publishAttempts: 0");
    expect(requeue).not.toContain("nextRetryAt: null");
    expect(outbox).toContain("asc(orderDomainOutbox.publishAttempts)");
    expect(fairness).toContain("comparePendingOutboxForRelay");
  });

  it("keeps Recovery downstream of Financial Core and Order lifecycle", () => {
    const cycle = read("server/order/postConfirmOperationalRecovery.ts");
    expect(cycle).toContain("requeueFailedBatch");
    expect(cycle).toContain("recoverCashierPosDownstreamSettlements");
    expect(cycle).toContain("recoverCollectionFactDrawerAttributions");
    expect(cycle).not.toContain("commitCollectionFact");
    expect(cycle).not.toContain("advanceOrderStatus");
  });
});
