import { beforeEach, describe, expect, it, vi } from "vitest";

const { requeueFailedBatch, processBatch, recoverCashierPosDownstreamSettlements } =
  vi.hoisted(() => ({
    requeueFailedBatch: vi.fn(async () => 2),
    processBatch: vi.fn(async () => ({
      processed: 2,
      published: 1,
      failed: 1,
      skipped: 0,
    })),
    recoverCashierPosDownstreamSettlements: vi.fn(async () => ({
      attempted: 1,
      failed: 0,
    })),
  }));

vi.mock("../eventInfrastructureComposition", () => ({
  orderOutboxRepository: { requeueFailedBatch },
  orderEventRelay: { processBatch },
}));
vi.mock("../../operational-session/payment/recoverCashierPosDownstreamSettlement", () => ({
  recoverCashierPosDownstreamSettlements,
}));

import { runPostConfirmOperationalRecoveryCycle } from "../postConfirmOperationalRecovery";

describe("runPostConfirmOperationalRecoveryCycle", () => {
  beforeEach(() => {
    requeueFailedBatch.mockClear();
    processBatch.mockClear();
    recoverCashierPosDownstreamSettlements.mockClear();
  });

  it("requeues failed outbox, relays pending, then recovers Check work", async () => {
    await runPostConfirmOperationalRecoveryCycle();
    expect(requeueFailedBatch).toHaveBeenCalledWith(25);
    expect(processBatch).toHaveBeenCalledWith(50);
    expect(recoverCashierPosDownstreamSettlements).toHaveBeenCalledWith(25);
    expect(requeueFailedBatch.mock.invocationCallOrder[0]).toBeLessThan(
      processBatch.mock.invocationCallOrder[0]!
    );
    expect(processBatch.mock.invocationCallOrder[0]).toBeLessThan(
      recoverCashierPosDownstreamSettlements.mock.invocationCallOrder[0]!
    );
  });
});
