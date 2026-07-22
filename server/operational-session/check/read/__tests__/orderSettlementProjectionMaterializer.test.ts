/**
 * ORDER-SETTLEMENT-PROJECTION-1 — materializer consistency + idempotent replay.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  applyComplimentary,
  applyFullSettlement,
  applyPartialSettlement,
  cancelOrderSettlement,
  createOrderSettlement,
  refundOrderSettlement,
  voidOrderSettlement,
  type OrderSettlement,
  type OrderSettlementDomainEvent,
} from "@shared/operational-session";
import {
  InMemoryOrderSettlementProjectionStore,
  materializeOrderSettlementProjections,
  tryMaterializeOrderSettlementProjections,
} from "../index";

const AT = "2026-07-22T12:00:00.000Z";

function createPending(orderId = 55, total = "20.00"): {
  settlement: OrderSettlement;
  events: readonly OrderSettlementDomainEvent[];
} {
  const result = createOrderSettlement({
    restaurantId: 1,
    checkId: 100,
    orderId,
    orderTotalSnapshot: total,
    membershipExists: true,
    checkRestaurantId: 1,
    orderRestaurantId: 1,
    at: AT,
  });
  return { settlement: result.settlement, events: result.events };
}

describe("ORDER-SETTLEMENT-PROJECTION-1 materializer", () => {
  let store: InMemoryOrderSettlementProjectionStore;

  beforeEach(() => {
    store = new InMemoryOrderSettlementProjectionStore();
  });

  it("materializes committed create into Read Model", async () => {
    const { settlement, events } = createPending();
    const result = await materializeOrderSettlementProjections(store, {
      committedSettlements: [settlement],
      events,
    });

    expect(result.projections).toHaveLength(1);
    expect(result.appliedEventClaims).toBe(1);
    const loaded = await store.findByIdentity({
      restaurantId: 1,
      checkId: 100,
      orderId: 55,
    });
    expect(loaded?.settlementStatus).toBe("pending");
    expect(loaded?.projectionRevision).toBe(
      result.projections[0]?.projectionRevision
    );
  });

  it("updates projection across partial → full settle", async () => {
    const created = createPending();
    await materializeOrderSettlementProjections(store, {
      committedSettlements: [created.settlement],
      events: created.events,
    });

    const partial = applyPartialSettlement({
      settlement: created.settlement,
      coverageAmount: "5.00",
      at: "2026-07-22T12:10:00.000Z",
    });
    await materializeOrderSettlementProjections(store, {
      committedSettlements: [partial.settlement],
      events: partial.events,
    });

    let loaded = await store.findByIdentity({
      restaurantId: 1,
      checkId: 100,
      orderId: 55,
    });
    expect(loaded?.settlementStatus).toBe("partially_settled");
    expect(loaded?.settledAmount).toBe("5.00");

    const full = applyFullSettlement({
      settlement: partial.settlement,
      at: "2026-07-22T12:11:00.000Z",
    });
    await materializeOrderSettlementProjections(store, {
      committedSettlements: [full.settlement],
      events: full.events,
    });

    loaded = await store.findByIdentity({
      restaurantId: 1,
      checkId: 100,
      orderId: 55,
    });
    expect(loaded?.settlementStatus).toBe("settled");
    expect(loaded?.isSettled).toBe(true);
    expect(loaded?.outstandingAmount).toBe("0.00");
  });

  it("projects complimentary / cancel / void / refund paths", async () => {
    const comp = applyComplimentary({
      settlement: createPending(1).settlement,
      at: "2026-07-22T12:12:00.000Z",
    });
    await materializeOrderSettlementProjections(store, {
      committedSettlements: [comp.settlement],
      events: comp.events,
    });
    expect(
      (await store.findByIdentity({ restaurantId: 1, checkId: 100, orderId: 1 }))
        ?.isComplimentary
    ).toBe(true);

    const cancelled = cancelOrderSettlement({
      settlement: createPending(2).settlement,
      at: "2026-07-22T12:13:00.000Z",
    });
    await materializeOrderSettlementProjections(store, {
      committedSettlements: [cancelled.settlement],
      events: cancelled.events,
    });
    expect(
      (await store.findByIdentity({ restaurantId: 1, checkId: 100, orderId: 2 }))
        ?.isCancelled
    ).toBe(true);

    const voided = voidOrderSettlement({
      settlement: createPending(3).settlement,
      at: "2026-07-22T12:14:00.000Z",
    });
    await materializeOrderSettlementProjections(store, {
      committedSettlements: [voided.settlement],
      events: voided.events,
    });
    expect(
      (await store.findByIdentity({ restaurantId: 1, checkId: 100, orderId: 3 }))
        ?.isVoided
    ).toBe(true);

    const settled = applyFullSettlement({
      settlement: createPending(4).settlement,
      at: "2026-07-22T12:15:00.000Z",
    });
    const refunded = refundOrderSettlement({
      settlement: settled.settlement,
      at: "2026-07-22T12:16:00.000Z",
    });
    await materializeOrderSettlementProjections(store, {
      committedSettlements: [refunded.settlement],
      events: [...settled.events, ...refunded.events],
    });
    expect(
      (await store.findByIdentity({ restaurantId: 1, checkId: 100, orderId: 4 }))
        ?.isRefunded
    ).toBe(true);
  });

  it("idempotent replay skips duplicate event claims and keeps same revision", async () => {
    const created = createPending();
    const first = await materializeOrderSettlementProjections(store, {
      committedSettlements: [created.settlement],
      events: created.events,
    });
    const second = await materializeOrderSettlementProjections(store, {
      committedSettlements: [created.settlement],
      events: created.events,
    });

    expect(first.appliedEventClaims).toBe(1);
    expect(second.appliedEventClaims).toBe(0);
    expect(second.skippedDuplicateEventClaims).toBe(1);
    expect(first.projections[0]?.projectionRevision).toBe(
      second.projections[0]?.projectionRevision
    );

    const listed = await store.listByCheck({ restaurantId: 1, checkId: 100 });
    expect(listed).toHaveLength(1);
  });

  it("tryMaterialize isolates projection failures from Write Model callers", async () => {
    const created = createPending();
    const failingStore = {
      upsert: async () => {
        throw new Error("projection store unavailable");
      },
      findByIdentity: async () => null,
      listByCheck: async () => [],
      listByRestaurant: async () => [],
      hasEventClaim: async () => false,
      recordEventClaim: async () => undefined,
    };

    const soft = await tryMaterializeOrderSettlementProjections(failingStore, {
      committedSettlements: [created.settlement],
      events: created.events,
    });
    expect(soft).toBeNull();

    await expect(
      materializeOrderSettlementProjections(failingStore, {
        committedSettlements: [created.settlement],
      })
    ).rejects.toThrow(/projection store unavailable/);
  });

  it("lists projections for restaurant with stable ordering", async () => {
    const a = createPending(10, "1.00");
    const b = createPending(11, "2.00");
    await materializeOrderSettlementProjections(store, {
      committedSettlements: [b.settlement, a.settlement],
    });
    const listed = await store.listByRestaurant({ restaurantId: 1 });
    expect(listed.map((p) => p.orderId)).toEqual([10, 11]);
  });
});
