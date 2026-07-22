/**
 * SPLIT-PAYMENT-INTEGRATION-1 — CheckService transaction ownership.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  transaction: vi.fn(),
  getDb: vi.fn(),
  createPaymentOnCheck: vi.fn(),
  applyPaymentOnCheck: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getDb: (...a: unknown[]) => mocks.getDb(...a),
  getOrdersByIds: vi.fn(),
  getRestaurantById: vi.fn(),
}));

vi.mock("../checkSplitPaymentIntegration", async () => {
  const actual = await vi.importActual<
    typeof import("../checkSplitPaymentIntegration")
  >("../checkSplitPaymentIntegration");
  return {
    ...actual,
    createPaymentOnCheck: (...a: unknown[]) => mocks.createPaymentOnCheck(...a),
    applyPaymentOnCheck: (...a: unknown[]) => mocks.applyPaymentOnCheck(...a),
  };
});

vi.mock("../../../_core/opsLog", () => ({ opsLog: vi.fn() }));

import {
  applySplitPaymentOnCheck,
  createSplitPaymentOnCheck,
} from "../CheckService";

describe("SPLIT-PAYMENT-INTEGRATION-1 CheckService ownership", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const tx = { tag: "tx" };
    mocks.transaction.mockImplementation(async (fn: (t: unknown) => unknown) =>
      fn(tx)
    );
    mocks.getDb.mockResolvedValue({ transaction: mocks.transaction });
    mocks.createPaymentOnCheck.mockResolvedValue({
      outcome: "applied",
      payment: { paymentId: "pay_1" },
      events: [],
      orderSettlement: { settlements: [], events: [], outcomes: [] },
    });
    mocks.applyPaymentOnCheck.mockResolvedValue({
      outcome: "applied",
      payment: { paymentId: "pay_1", status: "applied" },
      events: [],
      orderSettlement: { settlements: [], events: [], outcomes: ["applied"] },
    });
  });

  it("createSplitPaymentOnCheck uses Check-owned transaction", async () => {
    await createSplitPaymentOnCheck({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay_1",
      paymentReference: "pref_1",
      amount: "10.00",
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.createPaymentOnCheck).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pay_1" }),
      { tag: "tx" }
    );
  });

  it("applySplitPaymentOnCheck participates in same Check transaction", async () => {
    await applySplitPaymentOnCheck({
      restaurantId: 1,
      checkId: 100,
      paymentId: "pay_1",
      portions: [
        { portionId: "p", paymentId: "pay_1", amount: "10.00", orderId: 1 },
      ],
      allocationIds: ["a1"],
    });
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
    expect(mocks.applyPaymentOnCheck).toHaveBeenCalledWith(
      expect.objectContaining({ paymentId: "pay_1" }),
      { tag: "tx" }
    );
  });

  it("rolls back when integration throws (transaction rejects)", async () => {
    mocks.applyPaymentOnCheck.mockRejectedValue(new Error("OS allocate failed"));
    await expect(
      applySplitPaymentOnCheck({
        restaurantId: 1,
        checkId: 100,
        paymentId: "pay_1",
        portions: [
          { portionId: "p", paymentId: "pay_1", amount: "10.00", orderId: 1 },
        ],
        allocationIds: ["a1"],
      })
    ).rejects.toThrow("OS allocate failed");
    expect(mocks.transaction).toHaveBeenCalled();
  });
});
