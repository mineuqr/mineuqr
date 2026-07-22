/**
 * ORDER-SETTLEMENT-API-1 — read service over Projection store.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
  type OrderSettlementProjection,
} from "@shared/operational-session";
import { InMemoryOrderSettlementProjectionStore } from "../../read/orderSettlementProjectionStore";
import { OrderSettlementReadService } from "../orderSettlementReadService";
import { OrderSettlementProjectionUnavailableError } from "../mapOrderSettlementApiError";

function sample(
  overrides: Partial<OrderSettlementProjection> = {}
): OrderSettlementProjection {
  return {
    restaurantId: 1,
    checkId: 100,
    orderId: 55,
    settlementStatus: "pending",
    allocatedAmount: "10.00",
    settledAmount: "0.00",
    outstandingAmount: "10.00",
    orderTotalSnapshot: "10.00",
    isSettled: false,
    isComplimentary: false,
    isVoided: false,
    isRefunded: false,
    isCancelled: false,
    isPartiallySettled: false,
    lastSettlementAt: null,
    createdAt: "2026-07-22T10:00:00.000Z",
    updatedAt: "2026-07-22T10:00:00.000Z",
    projectionSchemaVersion: ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-1",
    ...overrides,
  };
}

describe("ORDER-SETTLEMENT-API-1 read service", () => {
  let store: InMemoryOrderSettlementProjectionStore;
  let service: OrderSettlementReadService;

  beforeEach(() => {
    store = new InMemoryOrderSettlementProjectionStore();
    service = new OrderSettlementReadService(store);
  });

  it("retrieves settlement by identity from projection store", async () => {
    await store.upsert(sample());
    const dto = await service.getByOrder({
      restaurantId: 1,
      checkId: 100,
      orderId: 55,
    });
    expect(dto?.orderId).toBe(55);
    expect(dto?.projection.projectionRevision).toBe("rev-1");
  });

  it("lists by check / restaurant / order", async () => {
    await store.upsert(sample({ orderId: 55 }));
    await store.upsert(sample({ orderId: 56, projectionRevision: "rev-2" }));
    await store.upsert(
      sample({ restaurantId: 2, checkId: 200, orderId: 55, projectionRevision: "other" })
    );

    const byCheck = await service.listByCheck({ restaurantId: 1, checkId: 100 });
    expect(byCheck.map((d) => d.orderId)).toEqual([55, 56]);

    const byRestaurant = await service.listByRestaurant({ restaurantId: 1 });
    expect(byRestaurant).toHaveLength(2);

    const byOrder = await service.listByOrder({ restaurantId: 1, orderId: 55 });
    expect(byOrder).toHaveLength(1);
    expect(byOrder[0]?.checkId).toBe(100);
  });

  it("builds check summary from projected rows", async () => {
    await store.upsert(sample({ orderId: 1, settlementStatus: "pending" }));
    await store.upsert(
      sample({
        orderId: 2,
        settlementStatus: "settled",
        isSettled: true,
        settledAmount: "10.00",
        outstandingAmount: "0.00",
        lastSettlementAt: "2026-07-22T11:00:00.000Z",
        updatedAt: "2026-07-22T11:00:00.000Z",
        projectionRevision: "rev-settled",
      })
    );

    const summary = await service.getSummaryByCheck({
      restaurantId: 1,
      checkId: 100,
    });
    expect(summary.totalCount).toBe(2);
    expect(summary.pendingCount).toBe(1);
    expect(summary.settledCount).toBe(1);
    expect(summary.projection.latestProjectionRevision).toBe("rev-settled");
  });

  it("maps store failures to ProjectionUnavailable", async () => {
    const failing: InMemoryOrderSettlementProjectionStore = Object.assign(
      new InMemoryOrderSettlementProjectionStore(),
      {
        findByIdentity: async () => {
          throw new Error("disk gone");
        },
      }
    );
    const svc = new OrderSettlementReadService(failing);
    await expect(
      svc.getByOrder({ restaurantId: 1, checkId: 1, orderId: 1 })
    ).rejects.toBeInstanceOf(OrderSettlementProjectionUnavailableError);
  });
});
