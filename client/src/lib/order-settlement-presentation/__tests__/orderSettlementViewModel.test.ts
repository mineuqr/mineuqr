/**
 * ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1 — View Model mapping tests.
 */
import { describe, expect, it } from "vitest";
import type { OrderSettlementApiDto } from "../orderSettlementApiTypes";
import {
  toOrderSettlementPanelViewModel,
  toOrderSettlementRowViewModel,
} from "../orderSettlementViewModel";
import {
  mapOrderSettlementApiError,
  orderSettlementErrorMessage,
} from "../orderSettlementErrorPresentation";
import { TRPCClientError } from "@trpc/client";
import { orderSettlementStatusLabel } from "../orderSettlementCopy";

function sampleDto(
  overrides: Partial<OrderSettlementApiDto> = {}
): OrderSettlementApiDto {
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
    projection: {
      projectionId: "OS-P-01-order-settlement",
      projectionSchemaVersion: 1,
      projectionRevision: "rev-1",
    },
    ...overrides,
  };
}

describe("ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1 view models", () => {
  it("maps API DTO to row view model with status labels", () => {
    const row = toOrderSettlementRowViewModel(sampleDto(), "en", "ر.س");
    expect(row.statusLabel).toBe("Settled");
    expect(row.settledAmountDisplay).toContain("20.00");
    expect(row.projectionRevision).toBe("rev-1");
  });

  it("renders canonical status labels without inference", () => {
    expect(orderSettlementStatusLabel("partially_settled", "en")).toBe(
      "Partially Settled"
    );
    expect(orderSettlementStatusLabel("voided", "ar")).toBe("ملغى مالياً");
  });

  it("builds empty panel when list is empty", () => {
    const panel = toOrderSettlementPanelViewModel({
      list: [],
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
    expect(mapOrderSettlementApiError(forbidden)).toBe("forbidden");
    expect(mapOrderSettlementApiError(new Error("x"))).toBe("unexpected");
    expect(orderSettlementErrorMessage("projectionUnavailable", "en")).toMatch(
      /unavailable/i
    );
  });
});
