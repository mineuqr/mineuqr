/**
 * LIFECYCLE-SETTLEMENT-GUARDS-1 — I/O adapter tests.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getOrdersBySessionId: vi.fn(),
  findProductionCollectionFactByOrderId: vi.fn(),
}));

vi.mock("../../../db", () => ({
  getOrdersBySessionId: (...a: unknown[]) => mocks.getOrdersBySessionId(...a),
}));

vi.mock("../../payment/collection-fact/collectionFactRepository", () => ({
  findProductionCollectionFactByOrderId: (...a: unknown[]) =>
    mocks.findProductionCollectionFactByOrderId(...a),
}));

import {
  assertOrderCompletable,
  assertSessionCloseable,
} from "../lifecycleSettlementGuardService";
import { LifecycleSettlementGuardError } from "@shared/operational-session";

describe("lifecycleSettlementGuardService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("assertSessionCloseable rejects when a session Order has no Collection Fact", async () => {
    mocks.getOrdersBySessionId.mockResolvedValue([
      { id: 2, status: "preparing" },
    ]);
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue(null);
    await expect(
      assertSessionCloseable({ restaurantId: 1, sessionId: 9 })
    ).rejects.toBeInstanceOf(LifecycleSettlementGuardError);
  });

  it("assertSessionCloseable treats complimentary Collection Fact as closable, not auto-closed", async () => {
    mocks.getOrdersBySessionId.mockResolvedValue([
      { id: 2, status: "preparing" },
    ]);
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue({
      collectionFactId: "pcf_comp",
      amount: "0.00",
      discountAmount: "20.00",
    });
    await expect(
      assertSessionCloseable({ restaurantId: 1, sessionId: 9 })
    ).resolves.toEqual({ checkId: 0, outcome: "complimentary" });
  });

  it("assertSessionCloseable accepts when every Order has a production Collection Fact", async () => {
    mocks.getOrdersBySessionId.mockResolvedValue([
      { id: 2, status: "preparing" },
    ]);
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue({
      collectionFactId: "pcf_1",
    });
    await expect(
      assertSessionCloseable({ restaurantId: 1, sessionId: 9 })
    ).resolves.toEqual({ checkId: 0, outcome: "paid" });
  });

  it("assertOrderCompletable skips Waiter sessioned orders", async () => {
    await assertOrderCompletable({
      restaurantId: 1,
      orderId: 2,
      sessionId: 44,
    });
    expect(mocks.findProductionCollectionFactByOrderId).not.toHaveBeenCalled();
  });

  it("assertOrderCompletable blocks unpaid sessionless", async () => {
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue(null);
    await expect(
      assertOrderCompletable({
        restaurantId: 1,
        orderId: 2,
        sessionId: null,
      })
    ).rejects.toMatchObject({ code: "ORDER_REQUIRES_SETTLEMENT" });
  });

  it("assertOrderCompletable allows paid sessionless", async () => {
    mocks.findProductionCollectionFactByOrderId.mockResolvedValue({
      collectionFactId: "pcf_1",
    });
    await expect(
      assertOrderCompletable({
        restaurantId: 1,
        orderId: 2,
        sessionId: null,
      })
    ).resolves.toBeUndefined();
  });
});
