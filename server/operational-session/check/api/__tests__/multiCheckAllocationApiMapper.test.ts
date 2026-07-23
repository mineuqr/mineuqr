/**
 * MULTI-CHECK-ALLOCATION-API-1 — DTO mapping tests.
 */
import { describe, expect, it } from "vitest";
import {
  MULTI_CHECK_ALLOCATION_PROJECTION_ID,
  MULTI_CHECK_ALLOCATION_PROJECTION_PROGRAM_ID,
  MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
  type MultiCheckAllocationProjection,
} from "@shared/operational-session";
import {
  MULTI_CHECK_ALLOCATION_API_CONTRACT_ID,
  MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION,
} from "../multiCheckAllocationApiDtos";
import {
  toMultiCheckAllocationDto,
  toMultiCheckAllocationProjectionCatalogDto,
  toMultiCheckAllocationSummaryDto,
  toMultiCheckAllocationTimelineDto,
} from "../multiCheckAllocationApiMapper";

function sampleProjection(
  overrides: Partial<MultiCheckAllocationProjection> = {}
): MultiCheckAllocationProjection {
  return {
    restaurantId: 1,
    allocationId: "alloc-1",
    allocationReference: "AREF-1",
    financialReference: "FREF-1",
    sourceCheckId: 10,
    sourcePaymentId: "pay-1",
    allocationStatus: "applied",
    financialResponsibility: "50.00",
    allocatedAmount: "50.00",
    remainingAmount: "0.00",
    paymentValueCap: "50.00",
    allocationRevision: 2,
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
    targetCheckIds: [20],
    sources: [
      {
        sourceCheckId: 10,
        sourcePaymentId: "pay-1",
        financialReference: "FREF-1",
        responsibilityAmount: "50.00",
      },
    ],
    targets: [
      {
        targetCheckId: 20,
        portionId: "p1",
        amount: "50.00",
        applied: true,
      },
    ],
    portions: [
      {
        restaurantId: 1,
        allocationId: "alloc-1",
        portionId: "p1",
        sequence: 1,
        targetCheckId: 20,
        amount: "50.00",
        applied: true,
        createdAt: "2026-07-23T12:00:00.000Z",
        allocationRevision: 2,
        financialReference: "FREF-1",
        projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
        projectionRevision: "rev|portion",
        projectionTimestamp: "2026-07-23T12:00:00.000Z",
      },
    ],
    adjustments: [],
    reversals: [],
    responsibility: {
      restaurantId: 1,
      allocationId: "alloc-1",
      financialResponsibility: "50.00",
      allocatedAmount: "50.00",
      remainingAmount: "0.00",
      allocationRevision: 2,
      financialReference: "FREF-1",
      projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
      projectionRevision: "rev|responsibility",
      projectionTimestamp: "2026-07-23T12:00:00.000Z",
    },
    timeline: [
      {
        kind: "portion",
        id: "p1",
        amount: "50.00",
        at: "2026-07-23T12:00:00.000Z",
        sourceCheckId: 10,
        targetCheckId: 20,
        portionId: "p1",
        direction: null,
      },
    ],
    createdAt: "2026-07-23T11:00:00.000Z",
    updatedAt: "2026-07-23T12:00:00.000Z",
    projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-root",
    projectionTimestamp: "2026-07-23T12:00:00.000Z",
    metadata: {
      projectionId: MULTI_CHECK_ALLOCATION_PROJECTION_ID,
      projectionSchemaVersion: MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION,
      projectionRevision: "rev-root",
      projectionTimestamp: "2026-07-23T12:00:00.000Z",
      allocationRevision: 2,
      financialReference: "FREF-1",
      projectedAt: "2026-07-23T12:00:00.000Z",
    },
    ...overrides,
  };
}

describe("MULTI-CHECK-ALLOCATION-API-1 mapper", () => {
  it("maps projection fields and stamps API contract version", () => {
    const dto = toMultiCheckAllocationDto(sampleProjection());
    expect(dto.apiContractVersion).toBe(
      MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION
    );
    expect(dto.allocationId).toBe("alloc-1");
    expect(dto.financialReference).toBe("FREF-1");
    expect(dto.allocatedAmount).toBe("50.00");
    expect(dto.impliesCheckSettlement).toBe(false);
    expect(dto.projection.projectionId).toBe(
      MULTI_CHECK_ALLOCATION_PROJECTION_ID
    );
    expect(dto.projection.projectionRevision).toBe("rev-root");
  });

  it("hides internal allocationRevision from DTOs", () => {
    const dto = toMultiCheckAllocationDto(sampleProjection());
    expect(JSON.stringify(dto)).not.toContain("allocationRevision");
    expect(
      Object.prototype.hasOwnProperty.call(dto, "allocationRevision")
    ).toBe(false);
  });

  it("maps summary and timeline without inventing money", () => {
    const projection = sampleProjection();
    const summary = toMultiCheckAllocationSummaryDto({
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
    expect(summary.remainingAmount).toBe("0.00");
    expect(JSON.stringify(summary)).not.toContain("allocationRevision");

    const timeline = toMultiCheckAllocationTimelineDto(projection);
    expect(timeline.entries).toHaveLength(1);
    expect(timeline.entries[0]?.amount).toBe("50.00");
  });

  it("exposes independent API and Projection catalog identities", () => {
    const catalog = toMultiCheckAllocationProjectionCatalogDto();
    expect(catalog.apiContractId).toBe(MULTI_CHECK_ALLOCATION_API_CONTRACT_ID);
    expect(catalog.apiContractVersion).toBe(
      MULTI_CHECK_ALLOCATION_API_CONTRACT_VERSION
    );
    expect(catalog.projectionProgramId).toBe(
      MULTI_CHECK_ALLOCATION_PROJECTION_PROGRAM_ID
    );
    expect(catalog.projectionSchemaVersion).toBe(
      MULTI_CHECK_ALLOCATION_PROJECTION_SCHEMA_VERSION
    );
  });
});
