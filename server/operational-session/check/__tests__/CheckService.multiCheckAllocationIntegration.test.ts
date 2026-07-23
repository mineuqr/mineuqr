/**
 * MULTI-CHECK-ALLOCATION-INTEGRATION-1 — CheckService transaction ownership.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  getDb: vi.fn(),
  createAllocationOnCheck: vi.fn(),
  applyAllocationOnCheck: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getDb: (...a: unknown[]) => mocks.getDb(...a),
  getOrdersByIds: vi.fn(),
  getRestaurantById: vi.fn(),
}));

vi.mock("../checkMultiCheckAllocationIntegration", async () => {
  const actual = await vi.importActual<
    typeof import("../checkMultiCheckAllocationIntegration")
  >("../checkMultiCheckAllocationIntegration");
  return {
    ...actual,
    createAllocationOnCheck: (...a: unknown[]) =>
      mocks.createAllocationOnCheck(...a),
    applyAllocationOnCheck: (...a: unknown[]) =>
      mocks.applyAllocationOnCheck(...a),
  };
});

vi.mock("../../../_core/opsLog", () => ({ opsLog: vi.fn() }));

import {
  applyMultiCheckAllocationOnCheck,
  createMultiCheckAllocationOnCheck,
} from "../CheckService";

describe("MULTI-CHECK-ALLOCATION-INTEGRATION-1 CheckService ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const tx = { tag: "tx" };
    mocks.transaction.mockImplementation(async (fn: (t: unknown) => unknown) =>
      fn(tx)
    );
    mocks.getDb.mockResolvedValue({ transaction: mocks.transaction });
    mocks.createAllocationOnCheck.mockResolvedValue({
      outcome: "applied",
      allocation: { allocationId: "alloc_1" },
      version: 1,
      events: [],
    });
    mocks.applyAllocationOnCheck.mockResolvedValue({
      outcome: "applied",
      allocation: { allocationId: "alloc_1", status: "applied" },
      version: 2,
      events: [],
    });
  });

  it("createMultiCheckAllocationOnCheck uses Check-owned transaction", async () => {
    await createMultiCheckAllocationOnCheck({
      restaurantId: 1,
      checkId: 10,
      allocationId: "alloc_1",
      allocationReference: "aref_1",
      financialResponsibility: "50.00",
      portions: [
        {
          portionId: "por_1",
          sequence: 1,
          targetCheckId: 20,
          amount: "50.00",
        },
      ],
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.createAllocationOnCheck).toHaveBeenCalledWith(
      expect.objectContaining({ allocationId: "alloc_1" }),
      { tag: "tx" }
    );
  });

  it("applyMultiCheckAllocationOnCheck participates in same Check transaction", async () => {
    await applyMultiCheckAllocationOnCheck({
      restaurantId: 1,
      checkId: 10,
      allocationId: "alloc_1",
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.applyAllocationOnCheck).toHaveBeenCalledWith(
      expect.objectContaining({ allocationId: "alloc_1" }),
      { tag: "tx" }
    );
  });

  it("rolls back when integration throws (transaction rejects)", async () => {
    mocks.applyAllocationOnCheck.mockRejectedValue(
      new Error("allocation persist failed")
    );
    await expect(
      applyMultiCheckAllocationOnCheck({
        restaurantId: 1,
        checkId: 10,
        allocationId: "alloc_1",
      })
    ).rejects.toThrow("allocation persist failed");
    expect(mocks.transaction).toHaveBeenCalled();
  });
});
