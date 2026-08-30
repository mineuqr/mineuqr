import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  requeueFailedBatch,
  processBatch,
  recoverCashierPosDownstreamSettlements,
  recoverCollectionFactDrawerAttributions,
  opsLog,
} = vi.hoisted(() => ({
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
  recoverCollectionFactDrawerAttributions: vi.fn(async () => ({
    attempted: 1,
    failed: 0,
    created: 1,
    parked: 0,
  })),
  opsLog: vi.fn(),
}));

vi.mock("../eventInfrastructureComposition", () => ({
  orderOutboxRepository: { requeueFailedBatch },
  orderEventRelay: { processBatch },
}));
vi.mock("../../operational-session/payment/recoverCashierPosDownstreamSettlement", () => ({
  recoverCashierPosDownstreamSettlements,
}));
vi.mock("../../operational-session/payment/recoverCollectionFactDrawerAttribution", () => ({
  recoverCollectionFactDrawerAttributions,
}));
vi.mock("../../_core/opsLog", () => ({
  opsLog,
}));

import { runPostConfirmOperationalRecoveryCycle } from "../postConfirmOperationalRecovery";

describe("runPostConfirmOperationalRecoveryCycle", () => {
  beforeEach(() => {
    requeueFailedBatch.mockClear();
    processBatch.mockClear();
    recoverCashierPosDownstreamSettlements.mockClear();
    recoverCollectionFactDrawerAttributions.mockClear();
    opsLog.mockClear();
    requeueFailedBatch.mockResolvedValue(2);
    processBatch.mockResolvedValue({
      processed: 2,
      published: 1,
      failed: 1,
      skipped: 0,
    });
    recoverCashierPosDownstreamSettlements.mockResolvedValue({
      attempted: 1,
      failed: 0,
    });
    recoverCollectionFactDrawerAttributions.mockResolvedValue({
      attempted: 1,
      failed: 0,
      created: 1,
      parked: 0,
    });
  });

  it("requeues failed outbox, relays pending, then recovers Check and Drawer work", async () => {
    const result = await runPostConfirmOperationalRecoveryCycle();
    expect(requeueFailedBatch).toHaveBeenCalledWith(25);
    expect(processBatch).toHaveBeenCalledWith(50);
    expect(recoverCashierPosDownstreamSettlements).toHaveBeenCalledWith(25);
    expect(recoverCollectionFactDrawerAttributions).toHaveBeenCalledWith(25);
    expect(requeueFailedBatch.mock.invocationCallOrder[0]).toBeLessThan(
      processBatch.mock.invocationCallOrder[0]!
    );
    expect(processBatch.mock.invocationCallOrder[0]).toBeLessThan(
      recoverCashierPosDownstreamSettlements.mock.invocationCallOrder[0]!
    );
    expect(recoverCashierPosDownstreamSettlements.mock.invocationCallOrder[0]).toBeLessThan(
      recoverCollectionFactDrawerAttributions.mock.invocationCallOrder[0]!
    );
    expect(result.tasks.map((row) => row.task)).toEqual([
      "requeueFailedBatch",
      "processBatch",
      "recoverCashierPosDownstreamSettlements",
      "recoverCollectionFactDrawerAttributions",
    ]);
    expect(result.tasks.every((row) => row.status === "succeeded")).toBe(true);
    expect(requeueFailedBatch).toHaveBeenCalledTimes(1);
    expect(processBatch).toHaveBeenCalledTimes(1);
  });

  it("continues later families when requeueFailedBatch throws", async () => {
    requeueFailedBatch.mockRejectedValue(new Error("outbox down"));
    const result = await runPostConfirmOperationalRecoveryCycle();
    expect(processBatch).toHaveBeenCalledTimes(1);
    expect(recoverCashierPosDownstreamSettlements).toHaveBeenCalledTimes(1);
    expect(recoverCollectionFactDrawerAttributions).toHaveBeenCalledTimes(1);
    expect(result.tasks[0]).toEqual({
      task: "requeueFailedBatch",
      status: "failed",
      error: "outbox down",
    });
    expect(result.tasks.slice(1).every((row) => row.status === "succeeded")).toBe(
      true
    );
    expect(opsLog).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "recovery_cycle_task_failed",
        metadata: expect.objectContaining({
          task: "requeueFailedBatch",
          error: "outbox down",
        }),
      })
    );
  });

  it("continues Check and Drawer when processBatch throws", async () => {
    processBatch.mockRejectedValue(new Error("relay exploded"));
    const result = await runPostConfirmOperationalRecoveryCycle();
    expect(requeueFailedBatch).toHaveBeenCalledTimes(1);
    expect(recoverCashierPosDownstreamSettlements).toHaveBeenCalledTimes(1);
    expect(recoverCollectionFactDrawerAttributions).toHaveBeenCalledTimes(1);
    expect(result.tasks.find((row) => row.task === "processBatch")?.status).toBe(
      "failed"
    );
    expect(
      result.tasks.find((row) => row.task === "recoverCashierPosDownstreamSettlements")
        ?.status
    ).toBe("succeeded");
  });

  it("keeps a failed task retryable on the next cycle", async () => {
    recoverCashierPosDownstreamSettlements
      .mockRejectedValueOnce(new Error("check sweeper"))
      .mockResolvedValueOnce({ attempted: 1, failed: 0 });
    const first = await runPostConfirmOperationalRecoveryCycle();
    const second = await runPostConfirmOperationalRecoveryCycle();
    expect(first.tasks[2]?.status).toBe("failed");
    expect(second.tasks[2]?.status).toBe("succeeded");
    expect(recoverCashierPosDownstreamSettlements).toHaveBeenCalledTimes(2);
    expect(recoverCollectionFactDrawerAttributions).toHaveBeenCalledTimes(2);
  });
});
