/**
 * ORDER-SETTLEMENT-API-1 — DTO mapping tests.
 */
import { describe, expect, it } from "vitest";
import {
  ORDER_SETTLEMENT_PROJECTION_ID,
  ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
  type OrderSettlementProjection,
} from "@shared/operational-session";
import {
  toOrderSettlementDto,
  toOrderSettlementSummaryDto,
  toProjectionCatalogDto,
} from "../orderSettlementApiMapper";

function sampleProjection(
  overrides: Partial<OrderSettlementProjection> = {}
): OrderSettlementProjection {
  return {
    restaurantId: 1,
    checkId: 10,
    orderId: 55,
    settlementStatus: "settled",
    allocatedAmount: "20.00",
    settledAmount: "20.00",
    outstandingAmount: "0.00",
    orderTotalSnapshot: "20.00",
    isSettled: true,
    isComplimentary: false,
    isVoided: false,
    isRefunded: false,
    isCancelled: false,
    isPartiallySettled: false,
    lastSettlementAt: "2026-07-22T12:00:00.000Z",
    createdAt: "2026-07-22T11:00:00.000Z",
    updatedAt: "2026-07-22T12:00:00.000Z",
    projectionSchemaVersion: ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "v1|1|10|55|settled|20.00|20.00|20.00|0.00|2026-07-22T12:00:00.000Z",
    ...overrides,
  };
}

describe("ORDER-SETTLEMENT-API-1 DTO mapper", () => {
  it("maps projection fields and version metadata", () => {
    const dto = toOrderSettlementDto(sampleProjection());
    expect(dto.orderId).toBe(55);
    expect(dto.settlementStatus).toBe("settled");
    expect(dto.settledAmount).toBe("20.00");
    expect(dto.projection).toEqual({
      projectionId: ORDER_SETTLEMENT_PROJECTION_ID,
      projectionSchemaVersion: ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION,
      projectionRevision: sampleProjection().projectionRevision,
    });
  });

  it("builds summary counts without summing money", () => {
    const summary = toOrderSettlementSummaryDto({
      restaurantId: 1,
      checkId: 10,
      projections: [
        sampleProjection({ orderId: 1, isSettled: true, settlementStatus: "settled" }),
        sampleProjection({
          orderId: 2,
          isSettled: false,
          isPartiallySettled: true,
          settlementStatus: "partially_settled",
          settledAmount: "5.00",
          outstandingAmount: "15.00",
          updatedAt: "2026-07-22T13:00:00.000Z",
          projectionRevision: "newer",
        }),
        sampleProjection({
          orderId: 3,
          isSettled: false,
          settlementStatus: "pending",
          settledAmount: "0.00",
          outstandingAmount: "20.00",
          lastSettlementAt: null,
        }),
      ],
    });

    expect(summary.totalCount).toBe(3);
    expect(summary.settledCount).toBe(1);
    expect(summary.partiallySettledCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.projection.latestProjectionRevision).toBe("newer");
    expect(summary).not.toHaveProperty("totalSettledAmount");
  });

  it("exposes projection catalog metadata", () => {
    const catalog = toProjectionCatalogDto();
    expect(catalog.projectionId).toBe(ORDER_SETTLEMENT_PROJECTION_ID);
    expect(catalog.projectionSchemaVersion).toBe(
      ORDER_SETTLEMENT_PROJECTION_SCHEMA_VERSION
    );
  });
});
