/**
 * ORDER-SETTLEMENT-PROJECTION-1 — builder + versioning tests.
 */
import { describe, expect, it } from "vitest";
import type { OrderSettlement } from "../../orderSettlementContract";
import {
  applyComplimentary,
  applyFullSettlement,
  applyPartialSettlement,
  cancelOrderSettlement,
  createOrderSettlement,
  refundOrderSettlement,
  voidOrderSettlement,
} from "../../orderSettlementCommands";
import {
  ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
  buildOrderSettlementProjection,
  buildOrderSettlementProjectionEventClaimKey,
  buildOrderSettlementProjectionRevision,
  buildOrderSettlementProjections,
} from "../index";

const AT = "2026-07-22T12:00:00.000Z";

function createPending(total = "100.00"): OrderSettlement {
  return createOrderSettlement({
    restaurantId: 1,
    checkId: 10,
    orderId: 55,
    orderTotalSnapshot: total,
    membershipExists: true,
    checkRestaurantId: 1,
    orderRestaurantId: 1,
    at: AT,
  }).settlement;
}

describe("ORDER-SETTLEMENT-PROJECTION-1 builders", () => {
  it("creates projection from committed pending settlement", () => {
    const settlement = createPending("20.00");
    const projection = buildOrderSettlementProjection(settlement);

    expect(projection.restaurantId).toBe(1);
    expect(projection.checkId).toBe(10);
    expect(projection.orderId).toBe(55);
    expect(projection.settlementStatus).toBe("pending");
    expect(projection.allocatedAmount).toBe("20.00");
    expect(projection.settledAmount).toBe("0.00");
    expect(projection.outstandingAmount).toBe("20.00");
    expect(projection.isSettled).toBe(false);
    expect(projection.isComplimentary).toBe(false);
    expect(projection.isVoided).toBe(false);
    expect(projection.isRefunded).toBe(false);
    expect(projection.isCancelled).toBe(false);
    expect(projection.isPartiallySettled).toBe(false);
    expect(projection.lastSettlementAt).toBeNull();
    expect(projection.projectionSchemaVersion).toBe(
      ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION
    );
    expect(projection.projectionRevision).toBe(
      buildOrderSettlementProjectionRevision(settlement)
    );
  });

  it("projects partial settlement", () => {
    const pending = createPending("20.00");
    const settlement = applyPartialSettlement({
      settlement: pending,
      coverageAmount: "8.00",
      at: "2026-07-22T12:01:00.000Z",
    }).settlement;
    const projection = buildOrderSettlementProjection(settlement);

    expect(projection.settlementStatus).toBe("partially_settled");
    expect(projection.settledAmount).toBe("8.00");
    expect(projection.outstandingAmount).toBe("12.00");
    expect(projection.isPartiallySettled).toBe(true);
    expect(projection.lastSettlementAt).toBe("2026-07-22T12:01:00.000Z");
  });

  it("projects full settlement", () => {
    const settlement = applyFullSettlement({
      settlement: createPending("20.00"),
      at: "2026-07-22T12:02:00.000Z",
    }).settlement;
    const projection = buildOrderSettlementProjection(settlement);

    expect(projection.settlementStatus).toBe("settled");
    expect(projection.isSettled).toBe(true);
    expect(projection.outstandingAmount).toBe("0.00");
    expect(projection.lastSettlementAt).toBe("2026-07-22T12:02:00.000Z");
  });

  it("projects complimentary", () => {
    const settlement = applyComplimentary({
      settlement: createPending("15.00"),
      at: "2026-07-22T12:03:00.000Z",
    }).settlement;
    const projection = buildOrderSettlementProjection(settlement);

    expect(projection.settlementStatus).toBe("complimentary");
    expect(projection.isComplimentary).toBe(true);
    expect(projection.settledAmount).toBe("15.00");
  });

  it("projects cancellation", () => {
    const settlement = cancelOrderSettlement({
      settlement: createPending("10.00"),
      at: "2026-07-22T12:04:00.000Z",
    }).settlement;
    const projection = buildOrderSettlementProjection(settlement);

    expect(projection.settlementStatus).toBe("cancelled");
    expect(projection.isCancelled).toBe(true);
    expect(projection.settledAmount).toBe("0.00");
    expect(projection.outstandingAmount).toBe("0.00");
  });

  it("projects void", () => {
    const settlement = voidOrderSettlement({
      settlement: createPending("10.00"),
      at: "2026-07-22T12:05:00.000Z",
    }).settlement;
    const projection = buildOrderSettlementProjection(settlement);

    expect(projection.settlementStatus).toBe("voided");
    expect(projection.isVoided).toBe(true);
  });

  it("projects refund", () => {
    const settled = applyFullSettlement({
      settlement: createPending("10.00"),
      at: "2026-07-22T12:06:00.000Z",
    }).settlement;
    const settlement = refundOrderSettlement({
      settlement: settled,
      at: "2026-07-22T12:07:00.000Z",
    }).settlement;
    const projection = buildOrderSettlementProjection(settlement);

    expect(projection.settlementStatus).toBe("refunded");
    expect(projection.isRefunded).toBe(true);
    expect(projection.settledAmount).toBe("0.00");
  });

  it("duplicate projection execution is identical (idempotent)", () => {
    const settlement = applyFullSettlement({
      settlement: createPending("20.00"),
      at: "2026-07-22T12:08:00.000Z",
    }).settlement;
    const a = buildOrderSettlementProjection(settlement);
    const b = buildOrderSettlementProjection(settlement);
    expect(a).toEqual(b);
    expect(a.projectionRevision).toBe(b.projectionRevision);
  });

  it("revision changes when Write Model updates", () => {
    const pending = createPending("20.00");
    const settled = applyFullSettlement({
      settlement: pending,
      at: "2026-07-22T12:09:00.000Z",
    }).settlement;
    expect(buildOrderSettlementProjectionRevision(pending)).not.toBe(
      buildOrderSettlementProjectionRevision(settled)
    );
  });

  it("event claim keys are deterministic for duplicate delivery", () => {
    const created = createOrderSettlement({
      restaurantId: 1,
      checkId: 10,
      orderId: 55,
      orderTotalSnapshot: "20.00",
      membershipExists: true,
      checkRestaurantId: 1,
      orderRestaurantId: 1,
      at: AT,
    });
    const event = created.events[0]!;
    expect(buildOrderSettlementProjectionEventClaimKey(event)).toBe(
      buildOrderSettlementProjectionEventClaimKey(event)
    );
  });

  it("sorts multi-settlement projections by check then order", () => {
    const a = createOrderSettlement({
      restaurantId: 1,
      checkId: 2,
      orderId: 9,
      orderTotalSnapshot: "1.00",
      membershipExists: true,
      checkRestaurantId: 1,
      orderRestaurantId: 1,
      at: AT,
    }).settlement;
    const b = createOrderSettlement({
      restaurantId: 1,
      checkId: 1,
      orderId: 8,
      orderTotalSnapshot: "1.00",
      membershipExists: true,
      checkRestaurantId: 1,
      orderRestaurantId: 1,
      at: AT,
    }).settlement;
    const projections = buildOrderSettlementProjections([a, b]);
    expect(projections.map((p) => [p.checkId, p.orderId])).toEqual([
      [1, 8],
      [2, 9],
    ]);
  });
});
