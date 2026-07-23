/**
 * MULTI-CHECK-ALLOCATION-API-1 — Projection-only read service.
 */
import { beforeEach, describe, expect, it } from "vitest";
import {
  MULTI_CHECK_ALLOCATION_PROJECTION_ID,
  MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
  type MultiCheckAllocationProjection,
} from "@shared/operational-session";
import { InMemoryMultiCheckAllocationProjectionStore } from "../../read/multiCheckAllocationProjectionStore";
import { MultiCheckAllocationReadService } from "../multiCheckAllocationReadService";
import { MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION } from "../multiCheckAllocationApiDtos";

function sampleProjection(): MultiCheckAllocationProjection {
  return {
    restaurantId: 7,
    allocationId: "alloc-read-1",
    allocationReference: "AREF",
    financialReference: null,
    sourceCheckId: 11,
    sourcePaymentId: null,
    allocationStatus: "applied",
    financialResponsibility: "10.00",
    allocatedAmount: "10.00",
    remainingAmount: "0.00",
    paymentValueCap: null,
    allocationRevision: 1,
    isPending: false,
    isReserved: false,
    isApplied: true,
    isAdjusted: false,
    isReversed: false,
    isCompleted: false,
    isCancelled: false,
    isTerminal: false,
    isSuccessTerminal: false,
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    cardinality: "one_to_one",
    sourceCount: 1,
    portionCount: 1,
    adjustmentCount: 0,
    reversalCount: 0,
    targetCheckIds: [22],
    sources: [
      {
        sourceCheckId: 11,
        sourcePaymentId: null,
        financialReference: null,
        responsibilityAmount: "10.00",
      },
    ],
    targets: [
      {
        targetCheckId: 22,
        portionId: "p1",
        amount: "10.00",
        applied: true,
      },
    ],
    portions: [
      {
        restaurantId: 7,
        allocationId: "alloc-read-1",
        portionId: "p1",
        sequence: 1,
        targetCheckId: 22,
        amount: "10.00",
        applied: true,
        createdAt: "2026-07-23T12:00:00.000Z",
        allocationRevision: 1,
        financialReference: null,
        projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
        projectionRevision: "rev|p",
        projectionTimestamp: "2026-07-23T12:00:00.000Z",
      },
    ],
    adjustments: [],
    reversals: [],
    responsibility: {
      restaurantId: 7,
      allocationId: "alloc-read-1",
      financialResponsibility: "10.00",
      allocatedAmount: "10.00",
      remainingAmount: "0.00",
      allocationRevision: 1,
      financialReference: null,
      projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
      projectionRevision: "rev|r",
      projectionTimestamp: "2026-07-23T12:00:00.000Z",
    },
    timeline: [],
    createdAt: "2026-07-23T11:00:00.000Z",
    updatedAt: "2026-07-23T12:00:00.000Z",
    projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-read",
    projectionTimestamp: "2026-07-23T12:00:00.000Z",
    metadata: {
      projectionId: MULTI_CHECK_ALLOCATION_PROJECTION_ID,
      projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
      projectionRevision: "rev-read",
      projectionTimestamp: "2026-07-23T12:00:00.000Z",
      allocationRevision: 1,
      financialReference: null,
      projectedAt: "2026-07-23T12:00:00.000Z",
    },
  };
}

describe("MULTI-CHECK-ALLOCATION-API-1 read service", () => {
  let store: InMemoryMultiCheckAllocationProjectionStore;
  let service: MultiCheckAllocationReadService;

  beforeEach(() => {
    store = new InMemoryMultiCheckAllocationProjectionStore();
    service = new MultiCheckAllocationReadService(store);
  });

  it("reads allocations from Projection store only", async () => {
    const projection = sampleProjection();
    await store.upsertAllocation(projection);
    await store.upsertSummary({
      restaurantId: projection.restaurantId,
      allocationId: projection.allocationId,
      allocationReference: projection.allocationReference,
      financialReference: projection.financialReference,
      sourceCheckId: projection.sourceCheckId,
      sourcePaymentId: projection.sourcePaymentId,
      allocationStatus: projection.allocationStatus,
      financialResponsibility: projection.financialResponsibility,
      allocatedAmount: projection.allocatedAmount,
      remainingAmount: projection.remainingAmount,
      portionCount: projection.portionCount,
      adjustmentCount: projection.adjustmentCount,
      reversalCount: projection.reversalCount,
      cardinality: projection.cardinality,
      isTerminal: projection.isTerminal,
      isCompleted: projection.isCompleted,
      impliesCheckSettlement: false,
      impliesPaymentCompletion: false,
      createdAt: projection.createdAt,
      updatedAt: projection.updatedAt,
      allocationRevision: projection.allocationRevision,
      projectionSchemaVersion: projection.projectionSchemaVersion,
      projectionRevision: projection.projectionRevision,
      projectionTimestamp: projection.projectionTimestamp,
    });

    const dto = await service.getAllocation({
      restaurantId: 7,
      allocationId: "alloc-read-1",
    });
    expect(dto?.apiContractVersion).toBe(
      MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION
    );
    expect(dto?.allocatedAmount).toBe("10.00");

    const list = await service.listAllocationsBySourceCheck({
      restaurantId: 7,
      sourceCheckId: 11,
    });
    expect(list).toHaveLength(1);

    const timeline = await service.getAllocationTimeline({
      restaurantId: 7,
      allocationId: "alloc-read-1",
    });
    expect(timeline?.allocationId).toBe("alloc-read-1");

    const responsibility = await service.getAllocationResponsibility({
      restaurantId: 7,
      allocationId: "alloc-read-1",
    });
    expect(responsibility?.remainingAmount).toBe("0.00");

    const summary = await service.getAllocationSummary({
      restaurantId: 7,
      allocationId: "alloc-read-1",
    });
    expect(summary?.portionCount).toBe(1);
  });

  it("returns null when Projection row is absent", async () => {
    expect(
      await service.getAllocation({ restaurantId: 7, allocationId: "missing" })
    ).toBeNull();
  });
});
