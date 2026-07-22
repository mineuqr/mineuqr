/**
 * SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 — View Model mapping tests.
 */
import { describe, expect, it } from "vitest";
import { TRPCClientError } from "@trpc/client";
import type {
  SplitPaymentApiDto,
  SplitPaymentOutstandingApiDto,
  SplitPaymentSummaryApiDto,
  SplitPaymentTimelineApiDto,
} from "../splitPaymentApiTypes";
import {
  toSplitPaymentAttemptViewModel,
  toSplitPaymentDetailViewModel,
  toSplitPaymentOutstandingViewModel,
  toSplitPaymentPanelViewModel,
  toSplitPaymentSummaryViewModel,
  toSplitPaymentTimelineViewModel,
} from "../splitPaymentViewModel";
import {
  mapSplitPaymentApiError,
  splitPaymentErrorMessage,
} from "../splitPaymentErrorPresentation";
import {
  splitPaymentAttemptStatusLabel,
  splitPaymentStatusLabel,
} from "../splitPaymentCopy";

function samplePayment(
  overrides: Partial<SplitPaymentApiDto> = {}
): SplitPaymentApiDto {
  return {
    apiContractVersion: 1,
    restaurantId: 1,
    checkId: 10,
    paymentId: "pay-1",
    paymentReference: "PREF-1",
    financialReference: null,
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
    tenderAllocationCount: 0,
    allocationCount: 1,
    tenders: [
      {
        tenderId: "t-1",
        method: "cash",
        amount: "20.00",
        createdAt: "2026-07-22T11:00:00.000Z",
      },
    ],
    tenderAllocations: [],
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
    ],
    lastPaymentActivityAt: "2026-07-22T11:05:00.000Z",
    createdAt: "2026-07-22T11:00:00.000Z",
    updatedAt: "2026-07-22T11:05:00.000Z",
    projection: {
      projectionId: "SP-P-01-split-payment",
      projectionSchemaVersion: 1,
      projectionRevision: "rev-1",
      projectedAt: "2026-07-22T12:00:00.000Z",
    },
    ...overrides,
  };
}

function sampleOutstanding(): SplitPaymentOutstandingApiDto {
  return {
    apiContractVersion: 1,
    restaurantId: 1,
    checkId: 10,
    financialResponsibility: "40.00",
    appliedPaymentValue: "20.00",
    outstandingBalance: "20.00",
    projection: {
      projectionId: "SP-P-01-split-payment",
      projectionSchemaVersion: 1,
      projectionRevision: "rev-out",
      projectedAt: "2026-07-22T12:00:00.000Z",
    },
  };
}

function sampleSummary(): SplitPaymentSummaryApiDto {
  return {
    apiContractVersion: 1,
    restaurantId: 1,
    checkId: 10,
    totalCount: 2,
    pendingCount: 1,
    authorizedCount: 0,
    capturedCount: 0,
    partiallyAppliedCount: 0,
    appliedCount: 1,
    cancelledCount: 0,
    voidedCount: 0,
    refundedCount: 0,
    failedCount: 0,
    projection: {
      projectionId: "SP-P-01-split-payment",
      projectionSchemaVersion: 1,
      latestProjectionRevision: "rev-1",
    },
  };
}

describe("SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 view models", () => {
  it("maps payment DTO to detail view model with labels and formatting", () => {
    const detail = toSplitPaymentDetailViewModel(samplePayment(), "en", "ر.س");
    expect(detail.statusLabel).toBe("Applied");
    expect(detail.amountDisplay).toContain("20.00");
    expect(detail.tenders).toHaveLength(1);
    expect(detail.allocations[0]?.orderId).toBe(55);
    expect(detail.timeline).toHaveLength(1);
    expect(detail.projection.projectionRevision).toBe("rev-1");
    expect(detail.impliesFinancialSettlement).toBe(false);
  });

  it("maps outstanding, summary, timeline, and attempt view models", () => {
    const outstanding = toSplitPaymentOutstandingViewModel(
      sampleOutstanding(),
      "en",
      "ر.س"
    );
    expect(outstanding.outstandingBalanceDisplay).toContain("20.00");

    const summary = toSplitPaymentSummaryViewModel(sampleSummary());
    expect(summary.appliedCount).toBe(1);
    expect(summary.apiContractVersion).toBe(1);

    const timelineDto: SplitPaymentTimelineApiDto = {
      apiContractVersion: 1,
      restaurantId: 1,
      checkId: 10,
      paymentId: "pay-1",
      entries: samplePayment().timeline,
      projection: samplePayment().projection,
    };
    const timeline = toSplitPaymentTimelineViewModel(timelineDto, "en", "ر.س");
    expect(timeline.entries).toHaveLength(1);

    const attempt = toSplitPaymentAttemptViewModel(
      {
        apiContractVersion: 1,
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
        projection: samplePayment().projection,
      },
      "en",
      "ر.س"
    );
    expect(attempt.statusLabel).toBe("Succeeded");
  });

  it("renders canonical status labels without inference", () => {
    expect(splitPaymentStatusLabel("partially_applied", "en")).toBe(
      "Partially Applied"
    );
    expect(splitPaymentStatusLabel("voided", "ar")).toBe("ملغى مالياً");
    expect(splitPaymentAttemptStatusLabel("started", "en")).toBe("Started");
  });

  it("builds empty panel when payment list is empty", () => {
    const panel = toSplitPaymentPanelViewModel({
      list: [],
      outstanding: undefined,
      summary: undefined,
      language: "en",
      currencySymbol: "ر.س",
    });
    expect(panel.isEmpty).toBe(true);
    expect(panel.rows).toHaveLength(0);
  });

  it("maps API error kinds for display", () => {
    const forbidden = Object.assign(new TRPCClientError("forbidden"), {
      data: { code: "FORBIDDEN" },
    });
    expect(mapSplitPaymentApiError(forbidden)).toBe("forbidden");
    expect(mapSplitPaymentApiError(new Error("x"))).toBe("unexpected");
    expect(splitPaymentErrorMessage("projectionUnavailable", "en")).toMatch(
      /unavailable/i
    );
  });
});
