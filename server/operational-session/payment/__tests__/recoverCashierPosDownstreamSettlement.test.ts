import { beforeEach, describe, expect, it, vi } from "vitest";
import { CheckOrderNotFoundError } from "../../check/checkRecoveryErrors";
import { DiningSessionUnavailableError } from "../../../diningSession/sessionTypes";
import { resetDrawerAttributionDiscoveryParkForTests } from "../recoveryDiscoveryPark";
import {
  InMemoryRecoveryParkStore,
  resetRecoveryParkStoreForTests,
  setRecoveryParkStoreForTests,
} from "../recoveryParkStore";

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
    resetDrawerAttributionDiscoveryParkForTests();
    resetRecoveryParkStoreForTests();
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
      25,
      expect.objectContaining({ excludeOrderIds: [] })
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
    expect(result).toEqual({
      attempted: 2,
      failed: 1,
      recovered: 1,
      parked: 1,
    });
  });

  it("parks a retryable Check failure so the next immediate cycle does not re-deliver", async () => {
    listCashierPosProductionFactsAwaitingDownstreamSettlement.mockImplementation(
      async (
        limit: number,
        options?: { excludeOrderIds?: readonly number[] }
      ) => {
        const exclude = new Set(options?.excludeOrderIds ?? []);
        if (exclude.has(88)) return [];
        return [{ restaurantId: 4, orderId: 88 }].slice(0, limit);
      }
    );
    deliverCashierPosOperationalSettlementAfterPaid.mockRejectedValue(
      new DiningSessionUnavailableError()
    );

    expect(await recoverCashierPosDownstreamSettlements(25)).toEqual({
      attempted: 1,
      failed: 1,
      recovered: 0,
      parked: 1,
    });
    expect(await recoverCashierPosDownstreamSettlements(25)).toEqual({
      attempted: 0,
      failed: 0,
      recovered: 0,
      parked: 0,
    });
    expect(deliverCashierPosOperationalSettlementAfterPaid).toHaveBeenCalledTimes(1);
  });

  it("retries a Check item after the retryable park expires", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-08-30T12:00:00.000Z"));
    listCashierPosProductionFactsAwaitingDownstreamSettlement.mockImplementation(
      async (
        limit: number,
        options?: { excludeOrderIds?: readonly number[] }
      ) => {
        const exclude = new Set(options?.excludeOrderIds ?? []);
        if (exclude.has(88)) return [];
        return [{ restaurantId: 4, orderId: 88 }].slice(0, limit);
      }
    );
    deliverCashierPosOperationalSettlementAfterPaid
      .mockRejectedValueOnce(new DiningSessionUnavailableError())
      .mockResolvedValueOnce(undefined);

    expect((await recoverCashierPosDownstreamSettlements(25)).failed).toBe(1);
    vi.advanceTimersByTime(60_000);
    expect(await recoverCashierPosDownstreamSettlements(25)).toEqual({
      attempted: 1,
      failed: 0,
      recovered: 1,
      parked: 0,
    });
    vi.useRealTimers();
  });

  it("does not treat a missing Order as a retryable infrastructure failure", async () => {
    listCashierPosProductionFactsAwaitingDownstreamSettlement.mockImplementation(
      async (
        limit: number,
        options?: { excludeOrderIds?: readonly number[] }
      ) => {
        const exclude = new Set(options?.excludeOrderIds ?? []);
        if (exclude.has(9)) return [];
        return [{ restaurantId: 1, orderId: 9 }].slice(0, limit);
      }
    );
    deliverCashierPosOperationalSettlementAfterPaid.mockRejectedValue(
      new CheckOrderNotFoundError("Order not found")
    );

    expect(await recoverCashierPosDownstreamSettlements(25)).toEqual({
      attempted: 1,
      failed: 0,
      recovered: 0,
      parked: 1,
    });
    expect(await recoverCashierPosDownstreamSettlements(25)).toEqual({
      attempted: 0,
      failed: 0,
      recovered: 0,
      parked: 0,
    });
    expect(deliverCashierPosOperationalSettlementAfterPaid).toHaveBeenCalledTimes(1);
  });

  it("processes a newer recoverable Check after 25 permanently missing Orders", async () => {
    const permanent = Array.from({ length: 25 }, (_, i) => ({
      restaurantId: 1,
      orderId: i + 1,
    }));
    const newer = { restaurantId: 1, orderId: 99 };
    const pool = [...permanent, newer];
    listCashierPosProductionFactsAwaitingDownstreamSettlement.mockImplementation(
      async (
        limit: number,
        options?: { excludeOrderIds?: readonly number[] }
      ) => {
        const exclude = new Set(options?.excludeOrderIds ?? []);
        return pool.filter((row) => !exclude.has(row.orderId)).slice(0, limit);
      }
    );
    deliverCashierPosOperationalSettlementAfterPaid.mockImplementation(
      async (input: { orderId: number }) => {
        if (input.orderId === 99) return;
        throw new CheckOrderNotFoundError("Order not found");
      }
    );

    const result = await recoverCashierPosDownstreamSettlements(25);
    expect(result.recovered).toBe(1);
    expect(result.parked).toBe(25);
    expect(result.failed).toBe(0);
    expect(deliverCashierPosOperationalSettlementAfterPaid).toHaveBeenCalledWith({
      restaurantId: 1,
      orderId: 99,
    });
  });

  it("recovers Direct and Incoming facts independently without Confirm, Invoice, or extra args", async () => {
    listCashierPosProductionFactsAwaitingDownstreamSettlement.mockResolvedValue([
      { restaurantId: 1, orderId: 501 },
      { restaurantId: 2, orderId: 502 },
    ]);
    deliverCashierPosOperationalSettlementAfterPaid.mockResolvedValue(undefined);

    const result = await recoverCashierPosDownstreamSettlements(25);

    expect(result).toEqual({
      attempted: 2,
      failed: 0,
      recovered: 2,
      parked: 0,
    });
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

  it("keeps a missing-Order park after an in-memory restart", async () => {
    const durable = new InMemoryRecoveryParkStore();
    setRecoveryParkStoreForTests(durable);
    listCashierPosProductionFactsAwaitingDownstreamSettlement.mockImplementation(
      async (
        limit: number,
        options?: { excludeOrderIds?: readonly number[] }
      ) => {
        const exclude = new Set(options?.excludeOrderIds ?? []);
        if (exclude.has(9)) return [];
        return [{ restaurantId: 1, orderId: 9 }].slice(0, limit);
      }
    );
    deliverCashierPosOperationalSettlementAfterPaid.mockRejectedValue(
      new CheckOrderNotFoundError("Order not found")
    );
    await recoverCashierPosDownstreamSettlements(25);
    resetDrawerAttributionDiscoveryParkForTests();
    expect(await recoverCashierPosDownstreamSettlements(25)).toEqual({
      attempted: 1,
      failed: 0,
      recovered: 0,
      parked: 0,
    });
    expect(deliverCashierPosOperationalSettlementAfterPaid).toHaveBeenCalledTimes(1);
    expect(await durable.hasCheck(1, 9)).toBe(true);
  });
});
