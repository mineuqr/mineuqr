/**
 * MULTI-CHECK-ALLOCATION-PRESENTATION-1 — View Models (labels / formatting).
 * No money calculations, settlement decisions, or repository access.
 */

import { formatSessionTotalAmount } from "@/lib/diningSessionWorkspaceCopy";
import type {
  MultiCheckAllocationApiDto,
  MultiCheckAllocationApiList,
  MultiCheckAllocationResponsibilityApiDto,
  MultiCheckAllocationSummaryApiDto,
  MultiCheckAllocationTimelineApiDto,
} from "./multiCheckAllocationApiTypes";
import {
  multiCheckAllocationStatusLabel,
  type MultiCheckAllocationLang,
} from "./multiCheckAllocationCopy";

export type MultiCheckAllocationProjectionMetaViewModel = Readonly<{
  projectionId: string;
  projectionSchemaVersion: number;
  projectionRevision: string;
  projectedAt: string;
  apiContractVersion: number;
}>;

export type MultiCheckAllocationPortionViewModel = Readonly<{
  portionId: string;
  sequence: number;
  targetCheckId: number;
  amountDisplay: string;
  applied: boolean;
  createdAt: string;
}>;

export type MultiCheckAllocationAdjustmentViewModel = Readonly<{
  adjustmentId: string;
  portionId: string | null;
  amountDisplay: string;
  direction: "increase" | "decrease";
  createdAt: string;
}>;

export type MultiCheckAllocationReversalViewModel = Readonly<{
  reversalId: string;
  reversedAmountDisplay: string;
  createdAt: string;
}>;

export type MultiCheckAllocationTimelineEntryViewModel = Readonly<{
  kind: string;
  id: string;
  amountDisplay: string;
  at: string;
  sourceCheckId: number | null;
  targetCheckId: number | null;
  portionId: string | null;
  direction: "increase" | "decrease" | null;
}>;

export type MultiCheckAllocationResponsibilityViewModel = Readonly<{
  financialResponsibilityDisplay: string;
  allocatedAmountDisplay: string;
  remainingAmountDisplay: string;
  financialReference: string | null;
  projection: MultiCheckAllocationProjectionMetaViewModel;
}>;

export type MultiCheckAllocationSummaryViewModel = Readonly<{
  allocationId: string;
  allocationReference: string;
  status: string;
  statusLabel: string;
  financialResponsibilityDisplay: string;
  allocatedAmountDisplay: string;
  remainingAmountDisplay: string;
  portionCount: number;
  adjustmentCount: number;
  reversalCount: number;
  isTerminal: boolean;
  isCompleted: boolean;
  projection: MultiCheckAllocationProjectionMetaViewModel;
}>;

export type MultiCheckAllocationDetailViewModel = Readonly<{
  allocationId: string;
  allocationReference: string;
  financialReference: string | null;
  sourceCheckId: number;
  sourcePaymentId: string | null;
  status: string;
  statusLabel: string;
  financialResponsibilityDisplay: string;
  allocatedAmountDisplay: string;
  remainingAmountDisplay: string;
  paymentValueCapDisplay: string | null;
  isPending: boolean;
  isReserved: boolean;
  isApplied: boolean;
  isAdjusted: boolean;
  isReversed: boolean;
  isCompleted: boolean;
  isCancelled: boolean;
  isTerminal: boolean;
  isSuccessTerminal: boolean;
  impliesCheckSettlement: false;
  impliesPaymentCompletion: false;
  targetCheckIds: readonly number[];
  portions: readonly MultiCheckAllocationPortionViewModel[];
  adjustments: readonly MultiCheckAllocationAdjustmentViewModel[];
  reversals: readonly MultiCheckAllocationReversalViewModel[];
  responsibility: MultiCheckAllocationResponsibilityViewModel;
  timeline: readonly MultiCheckAllocationTimelineEntryViewModel[];
  projection: MultiCheckAllocationProjectionMetaViewModel;
  /** UI action affordances derived from API status flags only. */
  actions: Readonly<{
    canReserve: boolean;
    canApply: boolean;
    canAdjust: boolean;
    canReverse: boolean;
    canComplete: boolean;
    canCancel: boolean;
  }>;
}>;

export type MultiCheckAllocationPanelViewModel = Readonly<{
  rows: readonly MultiCheckAllocationDetailViewModel[];
  isEmpty: boolean;
}>;

function formatAmount(
  amount: string,
  currencySymbol: string,
  language: MultiCheckAllocationLang
): string {
  return formatSessionTotalAmount(amount, currencySymbol, language);
}

function toProjectionMeta(
  dto: MultiCheckAllocationApiDto
): MultiCheckAllocationProjectionMetaViewModel {
  return {
    projectionId: dto.projection.projectionId,
    projectionSchemaVersion: dto.projection.projectionSchemaVersion,
    projectionRevision: dto.projection.projectionRevision,
    projectedAt: dto.projection.projectedAt,
    apiContractVersion: dto.apiContractVersion,
  };
}

function actionsFromFlags(dto: MultiCheckAllocationApiDto) {
  if (dto.isTerminal) {
    return {
      canReserve: false,
      canApply: false,
      canAdjust: false,
      canReverse: false,
      canComplete: false,
      canCancel: false,
    };
  }
  return {
    canReserve: dto.isPending,
    canApply: dto.isReserved,
    canAdjust: dto.isApplied || dto.isAdjusted,
    canReverse: dto.isApplied || dto.isAdjusted,
    canComplete: dto.isApplied || dto.isAdjusted,
    canCancel: dto.isPending || dto.isReserved,
  };
}

export function toMultiCheckAllocationDetailViewModel(
  dto: MultiCheckAllocationApiDto,
  language: MultiCheckAllocationLang,
  currencySymbol: string
): MultiCheckAllocationDetailViewModel {
  const projection = toProjectionMeta(dto);
  return {
    allocationId: dto.allocationId,
    allocationReference: dto.allocationReference,
    financialReference: dto.financialReference,
    sourceCheckId: dto.sourceCheckId,
    sourcePaymentId: dto.sourcePaymentId,
    status: dto.allocationStatus,
    statusLabel: multiCheckAllocationStatusLabel(
      dto.allocationStatus,
      language
    ),
    financialResponsibilityDisplay: formatAmount(
      dto.financialResponsibility,
      currencySymbol,
      language
    ),
    allocatedAmountDisplay: formatAmount(
      dto.allocatedAmount,
      currencySymbol,
      language
    ),
    remainingAmountDisplay: formatAmount(
      dto.remainingAmount,
      currencySymbol,
      language
    ),
    paymentValueCapDisplay: dto.paymentValueCap
      ? formatAmount(dto.paymentValueCap, currencySymbol, language)
      : null,
    isPending: dto.isPending,
    isReserved: dto.isReserved,
    isApplied: dto.isApplied,
    isAdjusted: dto.isAdjusted,
    isReversed: dto.isReversed,
    isCompleted: dto.isCompleted,
    isCancelled: dto.isCancelled,
    isTerminal: dto.isTerminal,
    isSuccessTerminal: dto.isSuccessTerminal,
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    targetCheckIds: dto.targetCheckIds,
    portions: dto.portions.map((p) => ({
      portionId: p.portionId,
      sequence: p.sequence,
      targetCheckId: p.targetCheckId,
      amountDisplay: formatAmount(p.amount, currencySymbol, language),
      applied: p.applied,
      createdAt: p.createdAt,
    })),
    adjustments: dto.adjustments.map((a) => ({
      adjustmentId: a.adjustmentId,
      portionId: a.portionId,
      amountDisplay: formatAmount(a.amount, currencySymbol, language),
      direction: a.direction,
      createdAt: a.createdAt,
    })),
    reversals: dto.reversals.map((r) => ({
      reversalId: r.reversalId,
      reversedAmountDisplay: formatAmount(
        r.reversedAmount,
        currencySymbol,
        language
      ),
      createdAt: r.createdAt,
    })),
    responsibility: {
      financialResponsibilityDisplay: formatAmount(
        dto.responsibility.financialResponsibility,
        currencySymbol,
        language
      ),
      allocatedAmountDisplay: formatAmount(
        dto.responsibility.allocatedAmount,
        currencySymbol,
        language
      ),
      remainingAmountDisplay: formatAmount(
        dto.responsibility.remainingAmount,
        currencySymbol,
        language
      ),
      financialReference: dto.responsibility.financialReference,
      projection: {
        projectionId: dto.responsibility.projection.projectionId,
        projectionSchemaVersion:
          dto.responsibility.projection.projectionSchemaVersion,
        projectionRevision: dto.responsibility.projection.projectionRevision,
        projectedAt: dto.responsibility.projection.projectedAt,
        apiContractVersion: dto.responsibility.apiContractVersion,
      },
    },
    timeline: dto.timeline.map((e) => ({
      kind: e.kind,
      id: e.id,
      amountDisplay: formatAmount(e.amount, currencySymbol, language),
      at: e.at,
      sourceCheckId: e.sourceCheckId,
      targetCheckId: e.targetCheckId,
      portionId: e.portionId,
      direction: e.direction,
    })),
    projection,
    actions: actionsFromFlags(dto),
  };
}

export function toMultiCheckAllocationSummaryViewModel(
  dto: MultiCheckAllocationSummaryApiDto,
  language: MultiCheckAllocationLang,
  currencySymbol: string
): MultiCheckAllocationSummaryViewModel {
  return {
    allocationId: dto.allocationId,
    allocationReference: dto.allocationReference,
    status: dto.allocationStatus,
    statusLabel: multiCheckAllocationStatusLabel(
      dto.allocationStatus,
      language
    ),
    financialResponsibilityDisplay: formatAmount(
      dto.financialResponsibility,
      currencySymbol,
      language
    ),
    allocatedAmountDisplay: formatAmount(
      dto.allocatedAmount,
      currencySymbol,
      language
    ),
    remainingAmountDisplay: formatAmount(
      dto.remainingAmount,
      currencySymbol,
      language
    ),
    portionCount: dto.portionCount,
    adjustmentCount: dto.adjustmentCount,
    reversalCount: dto.reversalCount,
    isTerminal: dto.isTerminal,
    isCompleted: dto.isCompleted,
    projection: {
      projectionId: dto.projection.projectionId,
      projectionSchemaVersion: dto.projection.projectionSchemaVersion,
      projectionRevision: dto.projection.projectionRevision,
      projectedAt: dto.projection.projectedAt,
      apiContractVersion: dto.apiContractVersion,
    },
  };
}

export function toMultiCheckAllocationTimelineViewModel(
  dto: MultiCheckAllocationTimelineApiDto,
  language: MultiCheckAllocationLang,
  currencySymbol: string
): {
  allocationId: string;
  entries: readonly MultiCheckAllocationTimelineEntryViewModel[];
  projection: MultiCheckAllocationProjectionMetaViewModel;
} {
  return {
    allocationId: dto.allocationId,
    entries: dto.entries.map((e) => ({
      kind: e.kind,
      id: e.id,
      amountDisplay: formatAmount(e.amount, currencySymbol, language),
      at: e.at,
      sourceCheckId: e.sourceCheckId,
      targetCheckId: e.targetCheckId,
      portionId: e.portionId,
      direction: e.direction,
    })),
    projection: {
      projectionId: dto.projection.projectionId,
      projectionSchemaVersion: dto.projection.projectionSchemaVersion,
      projectionRevision: dto.projection.projectionRevision,
      projectedAt: dto.projection.projectedAt,
      apiContractVersion: dto.apiContractVersion,
    },
  };
}

export function toMultiCheckAllocationResponsibilityViewModel(
  dto: MultiCheckAllocationResponsibilityApiDto,
  language: MultiCheckAllocationLang,
  currencySymbol: string
): MultiCheckAllocationResponsibilityViewModel {
  return {
    financialResponsibilityDisplay: formatAmount(
      dto.financialResponsibility,
      currencySymbol,
      language
    ),
    allocatedAmountDisplay: formatAmount(
      dto.allocatedAmount,
      currencySymbol,
      language
    ),
    remainingAmountDisplay: formatAmount(
      dto.remainingAmount,
      currencySymbol,
      language
    ),
    financialReference: dto.financialReference,
    projection: {
      projectionId: dto.projection.projectionId,
      projectionSchemaVersion: dto.projection.projectionSchemaVersion,
      projectionRevision: dto.projection.projectionRevision,
      projectedAt: dto.projection.projectedAt,
      apiContractVersion: dto.apiContractVersion,
    },
  };
}

export function toMultiCheckAllocationPanelViewModel(input: {
  list: MultiCheckAllocationApiList | undefined;
  language: MultiCheckAllocationLang;
  currencySymbol: string;
}): MultiCheckAllocationPanelViewModel {
  const rows = (input.list ?? []).map((dto) =>
    toMultiCheckAllocationDetailViewModel(
      dto,
      input.language,
      input.currencySymbol
    )
  );
  return {
    rows,
    isEmpty: rows.length === 0,
  };
}
