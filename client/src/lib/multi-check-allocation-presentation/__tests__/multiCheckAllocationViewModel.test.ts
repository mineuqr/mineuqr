/**
 * MULTI-CHECK-ALLOCATION-PRESENTATION-1 — view model / error / copy tests.
 */
import { describe, expect, it } from "vitest";
import type { MultiCheckAllocationApiDto } from "../multiCheckAllocationApiTypes";
import {
  toMultiCheckAllocationDetailViewModel,
  toMultiCheckAllocationPanelViewModel,
} from "../multiCheckAllocationViewModel";
import {
  mapMultiCheckAllocationApiError,
  multiCheckAllocationErrorMessage,
} from "../multiCheckAllocationErrorPresentation";
import {
  multiCheckAllocationStatusLabel,
  multiCheckAllocationUiLabel,
} from "../multiCheckAllocationCopy";
import { TRPCClientError } from "@trpc/client";

function sampleAllocation(
  overrides: Partial<MultiCheckAllocationApiDto> = {}
): MultiCheckAllocationApiDto {
  return {
    apiContractVersion: 1,
    restaurantId: 1,
    allocationId: "alloc-1",
    allocationReference: "AREF-1",
    financialReference: "FREF-1",
    sourceCheckId: 10,
    sourcePaymentId: null,
    allocationStatus: "applied",
    financialResponsibility: "50.00",
    allocatedAmount: "50.00",
    remainingAmount: "0.00",
    paymentValueCap: null,
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
    sources: [],
    targets: [],
    portions: [
      {
        portionId: "p1",
        sequence: 1,
        targetCheckId: 20,
        amount: "50.00",
        applied: true,
        createdAt: "2026-07-23T12:00:00.000Z",
      },
    ],
    adjustments: [],
    reversals: [],
    responsibility: {
      apiContractVersion: 1,
      restaurantId: 1,
      allocationId: "alloc-1",
      financialResponsibility: "50.00",
      allocatedAmount: "50.00",
      remainingAmount: "0.00",
      financialReference: "FREF-1",
      projection: {
        projectionId: "MCA-P-01-multi-check-allocation",
        projectionSchemaVersion: 2,
        projectionRevision: "rev",
        projectedAt: "2026-07-23T12:00:00.000Z",
      },
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
    projection: {
      projectionId: "MCA-P-01-multi-check-allocation",
      projectionSchemaVersion: 2,
      projectionRevision: "rev",
      projectedAt: "2026-07-23T12:00:00.000Z",
    },
    ...overrides,
  };
}

describe("MULTI-CHECK-ALLOCATION-PRESENTATION-1 view model", () => {
  it("formats API amounts and preserves constitutional finality flags", () => {
    const detail = toMultiCheckAllocationDetailViewModel(
      sampleAllocation(),
      "en",
      "ر.س"
    );
    expect(detail.allocationId).toBe("alloc-1");
    expect(detail.statusLabel).toBe("Applied");
    expect(detail.allocatedAmountDisplay).toContain("50");
    expect(detail.impliesCheckSettlement).toBe(false);
    expect(detail.impliesPaymentCompletion).toBe(false);
    expect(detail.actions.canAdjust).toBe(true);
    expect(detail.actions.canReserve).toBe(false);
  });

  it("maps pending actions for create workflow follow-up", () => {
    const detail = toMultiCheckAllocationDetailViewModel(
      sampleAllocation({
        allocationStatus: "pending",
        isPending: true,
        isApplied: false,
        allocatedAmount: "0.00",
        remainingAmount: "50.00",
      }),
      "en",
      "$"
    );
    expect(detail.actions.canReserve).toBe(true);
    expect(detail.actions.canCancel).toBe(true);
    expect(detail.actions.canApply).toBe(false);
  });

  it("builds empty panel when list is empty", () => {
    const panel = toMultiCheckAllocationPanelViewModel({
      list: [],
      language: "en",
      currencySymbol: "$",
    });
    expect(panel.isEmpty).toBe(true);
    expect(panel.rows).toHaveLength(0);
  });

  it("labels statuses and maps API errors without leaking internals", () => {
    expect(multiCheckAllocationStatusLabel("reserved", "en")).toBe("Reserved");
    expect(multiCheckAllocationStatusLabel("completed", "ar")).toBe("مكتمل");
    expect(multiCheckAllocationUiLabel("sectionTitle", "en")).toMatch(
      /Allocation/
    );

    const forbidden = Object.assign(new TRPCClientError("forbidden"), {
      data: { code: "FORBIDDEN" },
    });
    expect(mapMultiCheckAllocationApiError(forbidden)).toBe("forbidden");
    expect(mapMultiCheckAllocationApiError(new Error("db boom"))).toBe(
      "unexpected"
    );
    expect(
      multiCheckAllocationErrorMessage("projectionUnavailable", "en")
    ).toMatch(/unavailable/i);
  });
});
