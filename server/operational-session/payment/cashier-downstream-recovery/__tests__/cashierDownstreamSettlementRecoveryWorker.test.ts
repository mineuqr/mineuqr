/**
 * CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1 — worker / crash resume.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  completeCashierOperationalSettlementAfterCollectionFact: vi.fn(),
  listIncompleteCashierDownstreamObligations: vi.fn(),
  findCollectionFactByFactId: vi.fn(),
  findProductionCollectionFactByCheckId: vi.fn(),
  opsLog: vi.fn(),
}));

vi.mock("../../../../_core/opsLog", () => ({
  opsLog: (...a: unknown[]) => mocks.opsLog(...a),
}));

vi.mock("../../../check/CheckService", () => ({
  completeCashierOperationalSettlementAfterCollectionFact: (...a: unknown[]) =>
    mocks.completeCashierOperationalSettlementAfterCollectionFact(...a),
}));

vi.mock("../cashierDownstreamSettlementRecoveryRepository", () => ({
  listIncompleteCashierDownstreamObligations: (...a: unknown[]) =>
    mocks.listIncompleteCashierDownstreamObligations(...a),
}));

vi.mock("../../collection-fact/collectionFactRepository", () => ({
  findCollectionFactByFactId: (...a: unknown[]) =>
    mocks.findCollectionFactByFactId(...a),
  findProductionCollectionFactByCheckId: (...a: unknown[]) =>
    mocks.findProductionCollectionFactByCheckId(...a),
  updateCollectionFact: () => {
    throw new Error("Collection Fact UPDATE is forbidden");
  },
  deleteCollectionFact: () => {
    throw new Error("Collection Fact DELETE is forbidden");
  },
}));

import {
  recoverCashierDownstreamSettlementObligation,
  resetCashierDownstreamSettlementRecoveryWorkerForTests,
  sweepIncompleteCashierDownstreamSettlements,
} from "../cashierDownstreamSettlementRecoveryWorker";

describe("cashier downstream recovery worker", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetCashierDownstreamSettlementRecoveryWorkerForTests();
    mocks.completeCashierOperationalSettlementAfterCollectionFact.mockResolvedValue(
      undefined
    );
    mocks.findCollectionFactByFactId.mockResolvedValue({
      collectionFactId: "pcf_1",
      paymentIntentId: "cpi_1",
      orderId: 55,
      tenders: [{ paymentMethod: "card", amount: "10.00" }],
    });
    mocks.findProductionCollectionFactByCheckId.mockResolvedValue({
      collectionFactId: "pcf_1",
      paymentIntentId: "cpi_1",
      orderId: 55,
      tenders: [{ paymentMethod: "card", amount: "10.00" }],
    });
  });

  it("resumes incomplete obligations after a simulated process crash", async () => {
    mocks.listIncompleteCashierDownstreamObligations.mockResolvedValue([
      {
        restaurantId: 1,
        paymentIntentId: "cpi_1",
        collectionFactId: "pcf_1",
        orderId: 55,
        checkId: 200,
        committedAt: "2026-08-20 10:00:00",
        checkOutcome: "open",
      },
    ]);
    const n = await sweepIncompleteCashierDownstreamSettlements();
    expect(n).toBe(1);
    expect(
      mocks.completeCashierOperationalSettlementAfterCollectionFact
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        restaurantId: 1,
        checkId: 200,
        settlements: [{ paymentMethod: "card", amount: "10.00" }],
      })
    );
  });

  it("does not call Collection Fact write APIs while recovering", async () => {
    mocks.listIncompleteCashierDownstreamObligations.mockResolvedValue([]);
    await sweepIncompleteCashierDownstreamSettlements();
    expect(
      mocks.completeCashierOperationalSettlementAfterCollectionFact
    ).not.toHaveBeenCalled();
  });

  it("retries a transient failure without duplicating in-flight work", async () => {
    let started = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    mocks.completeCashierOperationalSettlementAfterCollectionFact.mockImplementation(
      async () => {
        started += 1;
        await gate;
      }
    );
    const first = recoverCashierDownstreamSettlementObligation({
      restaurantId: 1,
      checkId: 200,
      collectionFactId: "pcf_1",
    });
    const second = recoverCashierDownstreamSettlementObligation({
      restaurantId: 1,
      checkId: 200,
      collectionFactId: "pcf_1",
    });
    await Promise.resolve();
    expect(started).toBe(1);
    release();
    await Promise.all([first, second]);
    expect(
      mocks.completeCashierOperationalSettlementAfterCollectionFact
    ).toHaveBeenCalledTimes(1);
  });

  it("retries after ST-equivalent completeCashier failure", async () => {
    mocks.completeCashierOperationalSettlementAfterCollectionFact
      .mockRejectedValueOnce(new Error("st down"))
      .mockResolvedValueOnce(undefined);
    await expect(
      recoverCashierDownstreamSettlementObligation({
        restaurantId: 1,
        checkId: 200,
        collectionFactId: "pcf_1",
      })
    ).rejects.toThrow("st down");
    await recoverCashierDownstreamSettlementObligation({
      restaurantId: 1,
      checkId: 200,
      collectionFactId: "pcf_1",
    });
    expect(
      mocks.completeCashierOperationalSettlementAfterCollectionFact
    ).toHaveBeenCalledTimes(2);
  });
});
