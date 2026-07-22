/**
 * SPLIT-PAYMENT-API-1 — DTO mapping tests.
 */
import { describe, expect, it } from "vitest";
import {
  SPLIT_PAYMENT_PROJECTION_ID,
  SPLIT_PAYMENT_PROJECTION_PROGRAM_ID,
  SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
  type SplitPaymentAttemptProjection,
  type SplitPaymentOutstandingProjection,
  type SplitPaymentProjection,
} from "@shared/operational-session";
import {
  SPLIT_PAYMENT_API_CONTRACT_ID,
  SPLIT_PAYMENT_API_CONTRACT_VERSION,
} from "../splitPaymentApiDtos";
import {
  toSplitPaymentAttemptDto,
  toSplitPaymentDto,
  toSplitPaymentOutstandingDto,
  toSplitPaymentProjectionCatalogDto,
  toSplitPaymentSummaryDto,
  toSplitPaymentTimelineDto,
} from "../splitPaymentApiMapper";

function samplePayment(
  overrides: Partial<SplitPaymentProjection> = {}
): SplitPaymentProjection {
  return {
    restaurantId: 1,
    checkId: 10,
    paymentId: "pay-1",
    paymentReference: "PREF-1",
    financialReference: "FREF-1",
    paymentStatus: "applied",
    amount: "20.00",
    allocatedAmount: "20.00",
    unallocatedAmount: "0.00",
    isPending: false,
    isAuthorized: false,
    isCaptured: false,
    isPartiallyApplied: false,
    isApplied: true,
    isCancelled: false,
    isVoided: false,
    isRefunded: false,
    isFailed: false,
    isValueReceived: true,
    isTerminal: true,
    isPaymentCompleted: true,
    impliesFinancialSettlement: false,
    isFinanciallyComplete: false,
    tenderMethods: ["cash"],
    tenderCount: 1,
    tenderAllocationCount: 1,
    allocationCount: 1,
    tenders: [
      {
        tenderId: "t-1",
        method: "cash",
        amount: "20.00",
        createdAt: "2026-07-22T11:00:00.000Z",
      },
    ],
    tenderAllocations: [
      {
        tenderAllocationId: "ta-1",
        tenderId: "t-1",
        amount: "20.00",
        createdAt: "2026-07-22T11:00:00.000Z",
      },
    ],
    allocations: [
      {
        allocationId: "a-1",
        orderId: 55,
        amount: "20.00",
        createdAt: "2026-07-22T11:05:00.000Z",
      },
    ],
    timeline: [
      {
        kind: "tender",
        id: "t-1",
        amount: "20.00",
        at: "2026-07-22T11:00:00.000Z",
        method: "cash",
        orderId: null,
        tenderId: null,
      },
      {
        kind: "payment_allocation",
        id: "a-1",
        amount: "20.00",
        at: "2026-07-22T11:05:00.000Z",
        method: null,
        orderId: 55,
        tenderId: "t-1",
      },
    ],
    lastPaymentActivityAt: "2026-07-22T11:05:00.000Z",
    createdAt: "2026-07-22T11:00:00.000Z",
    updatedAt: "2026-07-22T11:05:00.000Z",
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-pay-1",
    projectionTimestamp: "2026-07-22T11:06:00.000Z",
    ...overrides,
  };
}

function sampleAttempt(
  overrides: Partial<SplitPaymentAttemptProjection> = {}
): SplitPaymentAttemptProjection {
  return {
    restaurantId: 1,
    checkId: 10,
    attemptId: "att-1",
    paymentId: "pay-1",
    attemptStatus: "succeeded",
    amount: "20.00",
    method: "cash",
    isStarted: false,
    isSucceeded: true,
    isFailed: false,
    isCancelled: false,
    createdAt: "2026-07-22T11:00:00.000Z",
    updatedAt: "2026-07-22T11:00:00.000Z",
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-att-1",
    projectionTimestamp: "2026-07-22T11:06:00.000Z",
    ...overrides,
  };
}

function sampleOutstanding(
  overrides: Partial<SplitPaymentOutstandingProjection> = {}
): SplitPaymentOutstandingProjection {
  return {
    restaurantId: 1,
    checkId: 10,
    financialResponsibility: "40.00",
    appliedPaymentValue: "20.00",
    outstandingBalance: "20.00",
    projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
    projectionRevision: "rev-out-1",
    projectionTimestamp: "2026-07-22T11:06:00.000Z",
    ...overrides,
  };
}

describe("SPLIT-PAYMENT-API-1 DTO mapper", () => {
  it("maps payment projection fields and version metadata", () => {
    const dto = toSplitPaymentDto(samplePayment());
    expect(dto.apiContractVersion).toBe(SPLIT_PAYMENT_API_CONTRACT_VERSION);
    expect(dto.paymentId).toBe("pay-1");
    expect(dto.paymentStatus).toBe("applied");
    expect(dto.amount).toBe("20.00");
    expect(dto.impliesFinancialSettlement).toBe(false);
    expect(dto.isFinanciallyComplete).toBe(false);
    expect(dto.tenders).toHaveLength(1);
    expect(dto.allocations[0]?.orderId).toBe(55);
    expect(dto.projection).toEqual({
      projectionId: SPLIT_PAYMENT_PROJECTION_ID,
      projectionSchemaVersion: SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION,
      projectionRevision: "rev-pay-1",
      projectedAt: "2026-07-22T11:06:00.000Z",
    });
    // Contract version is a top-level API field, not nested under projection.
    expect(dto).toHaveProperty("apiContractVersion");
    expect(dto.projection).not.toHaveProperty("apiContractVersion");
  });

  it("maps attempt and outstanding projections", () => {
    const attempt = toSplitPaymentAttemptDto(sampleAttempt());
    expect(attempt.apiContractVersion).toBe(SPLIT_PAYMENT_API_CONTRACT_VERSION);
    expect(attempt.attemptId).toBe("att-1");
    expect(attempt.isSucceeded).toBe(true);
    expect(attempt.projection.projectionRevision).toBe("rev-att-1");

    const outstanding = toSplitPaymentOutstandingDto(sampleOutstanding());
    expect(outstanding.apiContractVersion).toBe(
      SPLIT_PAYMENT_API_CONTRACT_VERSION
    );
    expect(outstanding.outstandingBalance).toBe("20.00");
    expect(outstanding.projection.projectedAt).toBe(
      "2026-07-22T11:06:00.000Z"
    );
  });

  it("exposes versioned timeline envelope without recalculation", () => {
    const timeline = toSplitPaymentTimelineDto(samplePayment());
    expect(timeline.apiContractVersion).toBe(SPLIT_PAYMENT_API_CONTRACT_VERSION);
    expect(timeline.entries).toHaveLength(2);
    expect(timeline.entries[0]?.kind).toBe("tender");
    expect(timeline.entries[1]?.orderId).toBe(55);
    expect(timeline.projection.projectionRevision).toBe("rev-pay-1");
  });

  it("builds status-count summary without summing money", () => {
    const summary = toSplitPaymentSummaryDto({
      restaurantId: 1,
      checkId: 10,
      projections: [
        samplePayment({
          paymentId: "p1",
          isApplied: true,
          paymentStatus: "applied",
        }),
        samplePayment({
          paymentId: "p2",
          isApplied: false,
          isPending: true,
          paymentStatus: "pending",
          updatedAt: "2026-07-22T12:00:00.000Z",
          projectionRevision: "newer",
        }),
        samplePayment({
          paymentId: "p3",
          isApplied: false,
          isFailed: true,
          paymentStatus: "failed",
        }),
      ],
    });

    expect(summary.apiContractVersion).toBe(SPLIT_PAYMENT_API_CONTRACT_VERSION);
    expect(summary.totalCount).toBe(3);
    expect(summary.appliedCount).toBe(1);
    expect(summary.pendingCount).toBe(1);
    expect(summary.failedCount).toBe(1);
    expect(summary.projection.latestProjectionRevision).toBe("newer");
    expect(summary).not.toHaveProperty("totalAppliedAmount");
  });

  it("exposes independent API contract and Projection catalog metadata", () => {
    const catalog = toSplitPaymentProjectionCatalogDto();
    expect(catalog.apiContractVersion).toBe(SPLIT_PAYMENT_API_CONTRACT_VERSION);
    expect(catalog.apiContractId).toBe(SPLIT_PAYMENT_API_CONTRACT_ID);
    expect(catalog.projectionId).toBe(SPLIT_PAYMENT_PROJECTION_ID);
    expect(catalog.projectionSchemaVersion).toBe(
      SPLIT_PAYMENT_PROJECTION_SCHEMA_VERSION
    );
    expect(catalog.programId).toBe(SPLIT_PAYMENT_PROJECTION_PROGRAM_ID);
    expect(catalog).toHaveProperty("apiContractVersion");
    expect(catalog).toHaveProperty("projectionSchemaVersion");
  });
});
