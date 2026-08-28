import { beforeEach, describe, expect, it, vi } from "vitest";

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
  beforeEach(() => {
    listCashierPosProductionFactsAwaitingDownstreamSettlement.mockReset();
    deliverCashierPosOperationalSettlementAfterPaid.mockReset();
  });

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

  it("retries an Incoming CF after the first Check finalize fails, then stops when the sweeper is empty", async () => {
    listCashierPosProductionFactsAwaitingDownstreamSettlement
      .mockResolvedValueOnce([{ restaurantId: 4, orderId: 88 }])
      .mockResolvedValueOnce([{ restaurantId: 4, orderId: 88 }])
      .mockResolvedValueOnce([]);
    deliverCashierPosOperationalSettlementAfterPaid
      .mockRejectedValueOnce(new Error("check failed"))
      .mockResolvedValueOnce(undefined);

    expect(await recoverCashierPosDownstreamSettlements(25)).toEqual({
      attempted: 1,
      failed: 1,
    });
    expect(await recoverCashierPosDownstreamSettlements(25)).toEqual({
      attempted: 1,
      failed: 0,
    });
    expect(await recoverCashierPosDownstreamSettlements(25)).toEqual({
      attempted: 0,
      failed: 0,
    });
    expect(deliverCashierPosOperationalSettlementAfterPaid).toHaveBeenCalledTimes(2);
    expect(deliverCashierPosOperationalSettlementAfterPaid).toHaveBeenCalledWith({
      restaurantId: 4,
      orderId: 88,
    });
  });

  it("recovers Direct and Incoming facts independently without Confirm, Invoice, or extra args", async () => {
    listCashierPosProductionFactsAwaitingDownstreamSettlement.mockResolvedValue([
      { restaurantId: 1, orderId: 501 },
      { restaurantId: 2, orderId: 502 },
    ]);
    deliverCashierPosOperationalSettlementAfterPaid.mockResolvedValue(undefined);

    const result = await recoverCashierPosDownstreamSettlements(25);

    expect(result).toEqual({ attempted: 2, failed: 0 });
    expect(deliverCashierPosOperationalSettlementAfterPaid).toHaveBeenNthCalledWith(1, {
      restaurantId: 1,
      orderId: 501,
    });
    expect(deliverCashierPosOperationalSettlementAfterPaid).toHaveBeenNthCalledWith(2, {
      restaurantId: 2,
      orderId: 502,
    });
    for (const call of deliverCashierPosOperationalSettlementAfterPaid.mock.calls) {
      expect(Object.keys(call[0] as object).sort()).toEqual(["orderId", "restaurantId"]);
    }
  });
});
