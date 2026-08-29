import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "../../../");

function read(rel: string): string {
  return readFileSync(join(repoRoot, rel), "utf8");
}

describe("POST-CONFIRM OPERATIONAL RECOVERY architecture", () => {
  it("keeps Confirm HTTP off the relay and Check critical path", () => {
    const finalize = read("server/pos/services/finalizeCashierPreparedInvoice.ts");
    const settle = read("server/pos/services/PosSettlementInitiateService.ts");
    const router = read("server/pos/api/posRouter.ts");
    const recovery = read("server/order/postConfirmOperationalRecovery.ts");
    expect(finalize).toContain("awaitRelay: false");
    expect(finalize).not.toContain("awaitRelay: true");
    expect(finalize).toContain("dispatchBestEffortDownstreamDelivery");
    expect(settle).toContain("scheduleCashierPosOperationalSettlementAfterPaid");
    expect(router).toContain("schedulePostConfirmOperationalRecovery()");
    expect(router).not.toContain("await runPostConfirmOperationalRecoveryCycle");
    expect(recovery).toContain("if (process.env.NODE_ENV === \"test\") return");
    expect(recovery).toContain("requeueFailedBatch");
    expect(recovery).toContain("recoverCashierPosDownstreamSettlements");
    expect(recovery).toContain("recoverCollectionFactDrawerAttributions");
  });

  it("recovers failed outbox via existing pending/published/failed states", () => {
    const outbox = read(
      "server/order/infrastructure/events/outbox/DrizzleOutboxRepository.ts"
    );
    const composite = read(
      "server/order/read/infrastructure/registry/CompositeEventDispatchDelegate.ts"
    );
    const recover = read(
      "server/operational-session/payment/recoverCashierPosDownstreamSettlement.ts"
    );
    expect(outbox).toContain("requeueFailedBatch");
    expect(outbox).toContain('status: "pending"');
    expect(outbox).toContain('eq(orderDomainOutbox.status, "failed")');
    expect(composite).toContain("assertProjectionDispatchSucceeded");
    expect(recover).toContain("listCashierPosProductionFactsAwaitingDownstreamSettlement");
    expect(recover).not.toContain("commitCollectionFact");
    expect(recover).not.toContain("paymentCollectionFacts");
  });

  it("starts durable discovery on long-running listen without a new migration", () => {
    const index = read("server/_core/index.ts");
    const journal = read("drizzle/meta/_journal.json");
    expect(index).toContain("startPostConfirmOperationalRecoveryLoop()");
    expect(journal).toContain("0098_pos_sale_idempotency_open_check");
    expect(existsSync(join(repoRoot, "drizzle/0098_pos_sale_idempotency_open_check.sql"))).toBe(
      true
    );
  });

  it("preserves CF OR paid Check operational completion", () => {
    const guard = read(
      "server/order/application/cashierPosOperationalCompletionGuard.ts"
    );
    expect(guard).toContain("paid/complimentary Check OR production Collection Fact");
  });
});
