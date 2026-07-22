/**
 * SPLIT-PAYMENT-PRESENTATION-ADOPTION-1 — View Models (labels / formatting / grouping).
 * No money calculations, settlement decisions, or repository access.
 */

import { formatSessionTotalAmount } from "@/lib/diningSessionWorkspaceCopy";
import type {
  SplitPaymentApiDto,
  SplitPaymentApiList,
  SplitPaymentAttemptApiDto,
  SplitPaymentAttemptApiList,
  SplitPaymentOutstandingApiDto,
  SplitPaymentSummaryApiDto,
  SplitPaymentTimelineApiDto,
} from "./splitPaymentApiTypes";
import {
  splitPaymentAttemptStatusLabel,
  splitPaymentStatusLabel,
  type SplitPaymentLang,
} from "./splitPaymentCopy";

export type SplitPaymentTenderBreakdownViewModel = Readonly<{
  tenderId: string;
  method: string;
  amountDisplay: string;
  createdAt: string;
}>;

export type SplitPaymentAllocationViewModel = Readonly<{
  allocationId: string;
  orderId: number;
  amountDisplay: string;
  createdAt: string;
}>;

export type SplitPaymentTimelineEntryViewModel = Readonly<{
  kind: string;
  id: string;
  amountDisplay: string;
  at: string;
  method: string | null;
  orderId: number | null;
  tenderId: string | null;
}>;

export type SplitPaymentTimelineViewModel = Readonly<{
  paymentId: string;
  entries: readonly SplitPaymentTimelineEntryViewModel[];
  projectionId: string;
  projectionSchemaVersion: number;
  projectionRevision: string;
  projectedAt: string;
  apiContractVersion: number;
}>;

export type SplitPaymentAttemptViewModel = Readonly<{
  attemptId: string;
  paymentId: string | null;
  status: string;
  statusLabel: string;
  amountDisplay: string;
  method: string;
  createdAt: string;
  projectionRevision: string;
  apiContractVersion: number;
}>;

export type SplitPaymentOutstandingViewModel = Readonly<{
  financialResponsibilityDisplay: string;
  appliedPaymentValueDisplay: string;
  outstandingBalanceDisplay: string;
  projectionId: string;
  projectionSchemaVersion: number;
  projectionRevision: string;
  projectedAt: string;
  apiContractVersion: number;
}>;

export type ProjectionMetadataViewModel = Readonly<{
  projectionId: string;
  projectionSchemaVersion: number;
  projectionRevision: string;
  projectedAt: string;
  apiContractVersion: number;
}>;

export type SplitPaymentDetailViewModel = Readonly<{
  paymentId: string;
  paymentReference: string;
  status: string;
  statusLabel: string;
  amountDisplay: string;
  allocatedAmountDisplay: string;
  unallocatedAmountDisplay: string;
  lastPaymentActivityAt: string | null;
  tenders: readonly SplitPaymentTenderBreakdownViewModel[];
  allocations: readonly SplitPaymentAllocationViewModel[];
  timeline: readonly SplitPaymentTimelineEntryViewModel[];
  projection: ProjectionMetadataViewModel;
  impliesFinancialSettlement: false;
  isFinanciallyComplete: false;
}>;

export type SplitPaymentSummaryViewModel = Readonly<{
  totalCount: number;
  pendingCount: number;
  authorizedCount: number;
  capturedCount: number;
  partiallyAppliedCount: number;
  appliedCount: number;
  cancelledCount: number;
  voidedCount: number;
  refundedCount: number;
  failedCount: number;
  latestProjectionRevision: string | null;
  projectionId: string;
  projectionSchemaVersion: number;
  apiContractVersion: number;
}>;

export type SplitPaymentPanelViewModel = Readonly<{
  rows: readonly SplitPaymentDetailViewModel[];
  outstanding: SplitPaymentOutstandingViewModel | null;
  summary: SplitPaymentSummaryViewModel | null;
  isEmpty: boolean;
}>;

function formatAmount(
  amount: string,
  currencySymbol: string,
  language: SplitPaymentLang
): string {
  return formatSessionTotalAmount(amount, currencySymbol, language);
}

export function toSplitPaymentDetailViewModel(
  dto: SplitPaymentApiDto,
  language: SplitPaymentLang,
  currencySymbol: string
): SplitPaymentDetailViewModel {
  return {
    paymentId: dto.paymentId,
    paymentReference: dto.paymentReference,
    status: dto.paymentStatus,
    statusLabel: splitPaymentStatusLabel(dto.paymentStatus, language),
    amountDisplay: formatAmount(dto.amount, currencySymbol, language),
    allocatedAmountDisplay: formatAmount(
      dto.allocatedAmount,
      currencySymbol,
      language
    ),
    unallocatedAmountDisplay: formatAmount(
      dto.unallocatedAmount,
      currencySymbol,
      language
    ),
    lastPaymentActivityAt: dto.lastPaymentActivityAt,
    tenders: dto.tenders.map((t) => ({
      tenderId: t.tenderId,
      method: t.method,
      amountDisplay: formatAmount(t.amount, currencySymbol, language),
      createdAt: t.createdAt,
    })),
    allocations: dto.allocations.map((a) => ({
      allocationId: a.allocationId,
      orderId: a.orderId,
      amountDisplay: formatAmount(a.amount, currencySymbol, language),
      createdAt: a.createdAt,
    })),
    timeline: dto.timeline.map((e) => ({
      kind: e.kind,
      id: e.id,
      amountDisplay: formatAmount(e.amount, currencySymbol, language),
      at: e.at,
      method: e.method,
      orderId: e.orderId,
      tenderId: e.tenderId,
    })),
    projection: {
      projectionId: dto.projection.projectionId,
      projectionSchemaVersion: dto.projection.projectionSchemaVersion,
      projectionRevision: dto.projection.projectionRevision,
      projectedAt: dto.projection.projectedAt,
      apiContractVersion: dto.apiContractVersion,
    },
    impliesFinancialSettlement: false,
    isFinanciallyComplete: false,
  };
}

export function toSplitPaymentOutstandingViewModel(
  dto: SplitPaymentOutstandingApiDto,
  language: SplitPaymentLang,
  currencySymbol: string
): SplitPaymentOutstandingViewModel {
  return {
    financialResponsibilityDisplay: formatAmount(
      dto.financialResponsibility,
      currencySymbol,
      language
    ),
    appliedPaymentValueDisplay: formatAmount(
      dto.appliedPaymentValue,
      currencySymbol,
      language
    ),
    outstandingBalanceDisplay: formatAmount(
      dto.outstandingBalance,
      currencySymbol,
      language
    ),
    projectionId: dto.projection.projectionId,
    projectionSchemaVersion: dto.projection.projectionSchemaVersion,
    projectionRevision: dto.projection.projectionRevision,
    projectedAt: dto.projection.projectedAt,
    apiContractVersion: dto.apiContractVersion,
  };
}

export function toSplitPaymentSummaryViewModel(
  dto: SplitPaymentSummaryApiDto
): SplitPaymentSummaryViewModel {
  return {
    totalCount: dto.totalCount,
    pendingCount: dto.pendingCount,
    authorizedCount: dto.authorizedCount,
    capturedCount: dto.capturedCount,
    partiallyAppliedCount: dto.partiallyAppliedCount,
    appliedCount: dto.appliedCount,
    cancelledCount: dto.cancelledCount,
    voidedCount: dto.voidedCount,
    refundedCount: dto.refundedCount,
    failedCount: dto.failedCount,
    latestProjectionRevision: dto.projection.latestProjectionRevision,
    projectionId: dto.projection.projectionId,
    projectionSchemaVersion: dto.projection.projectionSchemaVersion,
    apiContractVersion: dto.apiContractVersion,
  };
}

export function toSplitPaymentTimelineViewModel(
  dto: SplitPaymentTimelineApiDto,
  language: SplitPaymentLang,
  currencySymbol: string
): SplitPaymentTimelineViewModel {
  return {
    paymentId: dto.paymentId,
    entries: dto.entries.map((e) => ({
      kind: e.kind,
      id: e.id,
      amountDisplay: formatAmount(e.amount, currencySymbol, language),
      at: e.at,
      method: e.method,
      orderId: e.orderId,
      tenderId: e.tenderId,
    })),
    projectionId: dto.projection.projectionId,
    projectionSchemaVersion: dto.projection.projectionSchemaVersion,
    projectionRevision: dto.projection.projectionRevision,
    projectedAt: dto.projection.projectedAt,
    apiContractVersion: dto.apiContractVersion,
  };
}

export function toSplitPaymentAttemptViewModel(
  dto: SplitPaymentAttemptApiDto,
  language: SplitPaymentLang,
  currencySymbol: string
): SplitPaymentAttemptViewModel {
  return {
    attemptId: dto.attemptId,
    paymentId: dto.paymentId,
    status: dto.attemptStatus,
    statusLabel: splitPaymentAttemptStatusLabel(dto.attemptStatus, language),
    amountDisplay: formatAmount(dto.amount, currencySymbol, language),
    method: dto.method,
    createdAt: dto.createdAt,
    projectionRevision: dto.projection.projectionRevision,
    apiContractVersion: dto.apiContractVersion,
  };
}

export function toSplitPaymentAttemptViewModelList(
  list: SplitPaymentAttemptApiList | undefined,
  language: SplitPaymentLang,
  currencySymbol: string
): readonly SplitPaymentAttemptViewModel[] {
  return (list ?? []).map((dto) =>
    toSplitPaymentAttemptViewModel(dto, language, currencySymbol)
  );
}

/** Group API payloads into panel VM — display only; no client-side aggregation. */
export function toSplitPaymentPanelViewModel(input: {
  list: SplitPaymentApiList | undefined;
  outstanding: SplitPaymentOutstandingApiDto | undefined | null;
  summary: SplitPaymentSummaryApiDto | undefined;
  language: SplitPaymentLang;
  currencySymbol: string;
}): SplitPaymentPanelViewModel {
  const rows = (input.list ?? []).map((dto) =>
    toSplitPaymentDetailViewModel(dto, input.language, input.currencySymbol)
  );
  return {
    rows,
    outstanding: input.outstanding
      ? toSplitPaymentOutstandingViewModel(
          input.outstanding,
          input.language,
          input.currencySymbol
        )
      : null,
    summary: input.summary
      ? toSplitPaymentSummaryViewModel(input.summary)
      : null,
    isEmpty: rows.length === 0,
  };
}
