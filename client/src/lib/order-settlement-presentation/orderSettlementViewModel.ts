/**
 * ORDER-SETTLEMENT-PRESENTATION-ADOPTION-1 — View Models (labels / formatting / grouping).
 * No money calculations, settlement decisions, or repository access.
 */

import { formatSessionTotalAmount } from "@/lib/diningSessionWorkspaceCopy";
import type {
  OrderSettlementApiDto,
  OrderSettlementApiList,
  OrderSettlementSummaryApiDto,
} from "./orderSettlementApiTypes";
import {
  orderSettlementStatusLabel,
  type OrderSettlementLang,
} from "./orderSettlementCopy";

export type OrderSettlementRowViewModel = Readonly<{
  orderId: number;
  checkId: number;
  status: string;
  statusLabel: string;
  settledAmountDisplay: string;
  outstandingAmountDisplay: string;
  lastSettlementAt: string | null;
  projectionId: string;
  projectionSchemaVersion: number;
  projectionRevision: string;
}>;

export type OrderSettlementSummaryViewModel = Readonly<{
  totalCount: number;
  pendingCount: number;
  partiallySettledCount: number;
  settledCount: number;
  complimentaryCount: number;
  cancelledCount: number;
  voidedCount: number;
  refundedCount: number;
  latestProjectionRevision: string | null;
  projectionId: string;
  projectionSchemaVersion: number;
}>;

export type OrderSettlementPanelViewModel = Readonly<{
  rows: readonly OrderSettlementRowViewModel[];
  summary: OrderSettlementSummaryViewModel | null;
  isEmpty: boolean;
}>;

export function toOrderSettlementRowViewModel(
  dto: OrderSettlementApiDto,
  language: OrderSettlementLang,
  currencySymbol: string
): OrderSettlementRowViewModel {
  return {
    orderId: dto.orderId,
    checkId: dto.checkId,
    status: dto.settlementStatus,
    statusLabel: orderSettlementStatusLabel(dto.settlementStatus, language),
    settledAmountDisplay: formatSessionTotalAmount(
      dto.settledAmount,
      currencySymbol,
      language
    ),
    outstandingAmountDisplay: formatSessionTotalAmount(
      dto.outstandingAmount,
      currencySymbol,
      language
    ),
    lastSettlementAt: dto.lastSettlementAt,
    projectionId: dto.projection.projectionId,
    projectionSchemaVersion: dto.projection.projectionSchemaVersion,
    projectionRevision: dto.projection.projectionRevision,
  };
}

export function toOrderSettlementSummaryViewModel(
  dto: OrderSettlementSummaryApiDto
): OrderSettlementSummaryViewModel {
  return {
    totalCount: dto.totalCount,
    pendingCount: dto.pendingCount,
    partiallySettledCount: dto.partiallySettledCount,
    settledCount: dto.settledCount,
    complimentaryCount: dto.complimentaryCount,
    cancelledCount: dto.cancelledCount,
    voidedCount: dto.voidedCount,
    refundedCount: dto.refundedCount,
    latestProjectionRevision: dto.projection.latestProjectionRevision,
    projectionId: dto.projection.projectionId,
    projectionSchemaVersion: dto.projection.projectionSchemaVersion,
  };
}

/** Group API list into panel VM — display only; counts come from summary API when provided. */
export function toOrderSettlementPanelViewModel(input: {
  list: OrderSettlementApiList | undefined;
  summary: OrderSettlementSummaryApiDto | undefined;
  language: OrderSettlementLang;
  currencySymbol: string;
}): OrderSettlementPanelViewModel {
  const rows = (input.list ?? []).map((dto) =>
    toOrderSettlementRowViewModel(dto, input.language, input.currencySymbol)
  );
  return {
    rows,
    summary: input.summary
      ? toOrderSettlementSummaryViewModel(input.summary)
      : null,
    isEmpty: rows.length === 0,
  };
}
