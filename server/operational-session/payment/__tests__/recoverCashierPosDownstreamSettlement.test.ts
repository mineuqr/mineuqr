import { describe, expect, it, vi } from "vitest";

const {
  listCashierPosProductionFactsAwaitingDownstreamSettlement,
  deliverCashierPosOperationalSettlementAfterPaid,
} = vi.hoisted(() => ({
  listCashierPosProductionFactsAwaitingDownstreamSettlement: vi.fn(),
  deliverCashierPosOperationalSettlementAfterPaid: vi.fn(),
}));

vi.mock("../collection-fact/collectionFactRepository", () => ({
  listCashierPosProductionFactsAwaitingDownstreamSettlement,
}));
vi.mock("../../check/CheckService", () => ({
  deliverCashierPosOperationalSettlementAfterPaid,
}));
vi.mock("../../../_core/opsLog", () => ({
  opsLog: vi.fn(),
}));

import { recoverCashierPosDownstreamSettlements } from "../recoverCashierPosDownstreamSettlement";

describe("recoverCashierPosDownstreamSettlements", () => {
  it("delivers missing Check work per Collection Fact and isolates failures", async () => {
    listCashierPosProductionFactsAwaitingDownstreamSettlement.mockResolvedValue([
      { restaurantId: 1, orderId: 10 },
      { restaurantId: 1, orderId: 11 },
    ]);
    deliverCashierPosOperationalSettlementAfterPaid
      .mockRejectedValueOnce(new Error("check failed"))
      .mockResolvedValueOnce(undefined);

    const result = await recoverCashierPosDownstreamSettlements(25);

    expect(listCashierPosProductionFactsAwaitingDownstreamSettlement).toHaveBeenCalledWith(
      25
    );
    expect(deliverCashierPosOperationalSettlementAfterPaid).toHaveBeenCalledTimes(2);
    expect(deliverCashierPosOperationalSettlementAfterPaid).toHaveBeenNthCalledWith(1, {
      restaurantId: 1,
      orderId: 10,
    });
    expect(deliverCashierPosOperationalSettlementAfterPaid).toHaveBeenNthCalledWith(2, {
      restaurantId: 1,
      orderId: 11,
    });
    expect(result).toEqual({ attempted: 2, failed: 1 });
  });
});
