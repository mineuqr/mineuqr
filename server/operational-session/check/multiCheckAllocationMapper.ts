/**
 * MULTI-CHECK-ALLOCATION-PERSISTENCE-1 — deterministic DB ↔ Domain mapping.
 * No lifecycle evaluation, money calculation, or invariant enforcement.
 */

import type {
  SelectMultiCheckAllocation,
  SelectMultiCheckAllocationAdjustment,
  SelectMultiCheckAllocationHistory,
  SelectMultiCheckAllocationPortion,
  SelectMultiCheckAllocationReversal,
  SelectMultiCheckAllocationSource,
} from "../../../drizzle/schema";
import {
  assertAllocationStatus,
  type AllocationAdjustment,
  type AllocationPortion,
  type AllocationReversal,
  type AllocationSource,
  type AllocationStatus,
  type MultiCheckAllocation,
} from "@shared/operational-session";

export const MULTI_CHECK_ALLOCATION_SCHEMA_VERSION = 1 as const;

export type AllocationMutationType =
  | "create"
  | "reserve"
  | "apply"
  | "adjust"
  | "reverse"
  | "complete"
  | "cancel"
  | "update";

export type MultiCheckAllocationPersistenceRow = SelectMultiCheckAllocation;
export type MultiCheckAllocationSourcePersistenceRow =
  SelectMultiCheckAllocationSource;
export type MultiCheckAllocationPortionPersistenceRow =
  SelectMultiCheckAllocationPortion;
export type MultiCheckAllocationAdjustmentPersistenceRow =
  SelectMultiCheckAllocationAdjustment;
export type MultiCheckAllocationReversalPersistenceRow =
  SelectMultiCheckAllocationReversal;
export type MultiCheckAllocationHistoryPersistenceRow =
  SelectMultiCheckAllocationHistory;

export type MultiCheckAllocationInsertValues = Readonly<{
  restaurantId: number;
  allocationId: string;
  allocationReference: string;
  financialReference: string | null;
  sourceCheckId: number;
  sourcePaymentId: string | null;
  status: AllocationStatus;
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
  paymentValueCap: string | null;
  schemaVersion: number;
  version: number;
  allocationReason: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type MultiCheckAllocationUpdateValues = Readonly<{
  status: AllocationStatus;
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
  paymentValueCap: string | null;
  version: number;
  allocationReason: string | null;
  updatedAt: string;
}>;

export type AllocationSourceInsertValues = Readonly<{
  restaurantId: number;
  allocationId: string;
  sourceCheckId: number;
  sourcePaymentId: string | null;
  financialReference: string | null;
  responsibilityAmount: string;
  createdAt: string;
}>;

export type AllocationPortionInsertValues = Readonly<{
  restaurantId: number;
  allocationId: string;
  portionId: string;
  allocationSequence: number;
  targetCheckId: number;
  amount: string;
  applied: boolean;
  createdAt: string;
}>;

export type AllocationAdjustmentInsertValues = Readonly<{
  restaurantId: number;
  allocationId: string;
  adjustmentId: string;
  portionId: string | null;
  amount: string;
  direction: "increase" | "decrease";
  createdAt: string;
}>;

export type AllocationReversalInsertValues = Readonly<{
  restaurantId: number;
  allocationId: string;
  reversalId: string;
  reversedAmount: string;
  createdAt: string;
}>;

export type AllocationHistoryInsertValues = Readonly<{
  restaurantId: number;
  allocationId: string;
  allocationReference: string;
  financialReference: string | null;
  sourceCheckId: number;
  targetCheckId: number | null;
  sourcePaymentId: string | null;
  previousRevision: number;
  newRevision: number;
  mutationType: AllocationMutationType;
  status: AllocationStatus;
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
  allocationReason: string | null;
  schemaVersion: number;
  createdAt: string;
}>;

/** Persistence audit record (not a Domain entity). */
export type AllocationHistoryRecord = Readonly<{
  sequence: number;
  restaurantId: number;
  allocationId: string;
  allocationReference: string;
  financialReference: string | null;
  sourceCheckId: number;
  targetCheckId: number | null;
  sourcePaymentId: string | null;
  previousRevision: number;
  newRevision: number;
  mutationType: AllocationMutationType;
  status: AllocationStatus;
  financialResponsibility: string;
  allocatedAmount: string;
  remainingAmount: string;
  allocationReason: string | null;
  schemaVersion: number;
  createdAt: string;
}>;

function moneyString(value: string | number): string {
  return String(value);
}

function mapStatus(value: string): AllocationStatus {
  assertAllocationStatus(value);
  return value;
}

function mapDirection(value: string): "increase" | "decrease" {
  if (value !== "increase" && value !== "decrease") {
    throw new Error(`Invalid adjustment direction: ${value}`);
  }
  return value;
}

function mapMutationType(value: string): AllocationMutationType {
  const allowed: readonly AllocationMutationType[] = [
    "create",
    "reserve",
    "apply",
    "adjust",
    "reverse",
    "complete",
    "cancel",
    "update",
  ];
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`Invalid AllocationMutationType: ${value}`);
  }
  return value as AllocationMutationType;
}

export function mapRowToAllocationSource(
  row: MultiCheckAllocationSourcePersistenceRow
): AllocationSource {
  return {
    sourceCheckId: row.sourceCheckId,
    sourcePaymentId: row.sourcePaymentId ?? null,
    financialReference: row.financialReference ?? null,
    responsibilityAmount: moneyString(row.responsibilityAmount),
  };
}

export function mapRowToAllocationPortion(
  row: MultiCheckAllocationPortionPersistenceRow
): AllocationPortion {
  return {
    portionId: row.portionId,
    allocationId: row.allocationId,
    sequence: row.allocationSequence,
    targetCheckId: row.targetCheckId,
    amount: moneyString(row.amount),
    applied: Boolean(row.applied),
    createdAt: row.createdAt,
  };
}

export function mapRowToAllocationAdjustment(
  row: MultiCheckAllocationAdjustmentPersistenceRow
): AllocationAdjustment {
  return {
    adjustmentId: row.adjustmentId,
    allocationId: row.allocationId,
    portionId: row.portionId ?? null,
    amount: moneyString(row.amount),
    direction: mapDirection(row.direction),
    createdAt: row.createdAt,
  };
}

export function mapRowToAllocationReversal(
  row: MultiCheckAllocationReversalPersistenceRow
): AllocationReversal {
  return {
    reversalId: row.reversalId,
    allocationId: row.allocationId,
    reversedAmount: moneyString(row.reversedAmount),
    createdAt: row.createdAt,
  };
}

export function mapRowsToMultiCheckAllocation(
  header: MultiCheckAllocationPersistenceRow,
  sources: readonly MultiCheckAllocationSourcePersistenceRow[],
  portions: readonly MultiCheckAllocationPortionPersistenceRow[],
  adjustments: readonly MultiCheckAllocationAdjustmentPersistenceRow[],
  reversals: readonly MultiCheckAllocationReversalPersistenceRow[]
): MultiCheckAllocation {
  return {
    restaurantId: header.restaurantId,
    allocationId: header.allocationId,
    allocationReference: header.allocationReference,
    financialReference: header.financialReference ?? null,
    sourceCheckId: header.sourceCheckId,
    sourcePaymentId: header.sourcePaymentId ?? null,
    status: mapStatus(header.status),
    financialResponsibility: moneyString(header.financialResponsibility),
    allocatedAmount: moneyString(header.allocatedAmount),
    remainingAmount: moneyString(header.remainingAmount),
    paymentValueCap:
      header.paymentValueCap == null
        ? null
        : moneyString(header.paymentValueCap),
    sources: sources.map(mapRowToAllocationSource),
    portions: portions
      .slice()
      .sort((a, b) => a.allocationSequence - b.allocationSequence)
      .map(mapRowToAllocationPortion),
    adjustments: adjustments.map(mapRowToAllocationAdjustment),
    reversals: reversals.map(mapRowToAllocationReversal),
    impliesCheckSettlement: false,
    impliesPaymentCompletion: false,
    createdAt: header.createdAt,
    updatedAt: header.updatedAt,
  };
}

export function toMultiCheckAllocationInsertValues(
  allocation: MultiCheckAllocation,
  options?: {
    version?: number;
    schemaVersion?: number;
    allocationReason?: string | null;
  }
): MultiCheckAllocationInsertValues {
  return {
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    allocationReference: allocation.allocationReference,
    financialReference: allocation.financialReference,
    sourceCheckId: allocation.sourceCheckId,
    sourcePaymentId: allocation.sourcePaymentId,
    status: allocation.status,
    financialResponsibility: allocation.financialResponsibility,
    allocatedAmount: allocation.allocatedAmount,
    remainingAmount: allocation.remainingAmount,
    paymentValueCap: allocation.paymentValueCap,
    schemaVersion: options?.schemaVersion ?? MULTI_CHECK_ALLOCATION_SCHEMA_VERSION,
    version: options?.version ?? 1,
    allocationReason: options?.allocationReason ?? null,
    createdAt: allocation.createdAt,
    updatedAt: allocation.updatedAt,
  };
}

export function toMultiCheckAllocationUpdateValues(
  allocation: MultiCheckAllocation,
  nextVersion: number,
  allocationReason: string | null = null
): MultiCheckAllocationUpdateValues {
  return {
    status: allocation.status,
    financialResponsibility: allocation.financialResponsibility,
    allocatedAmount: allocation.allocatedAmount,
    remainingAmount: allocation.remainingAmount,
    paymentValueCap: allocation.paymentValueCap,
    version: nextVersion,
    allocationReason,
    updatedAt: allocation.updatedAt,
  };
}

export function toAllocationSourceInsertValues(
  allocation: MultiCheckAllocation,
  source: AllocationSource,
  createdAt: string
): AllocationSourceInsertValues {
  return {
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    sourceCheckId: source.sourceCheckId,
    sourcePaymentId: source.sourcePaymentId,
    financialReference: source.financialReference,
    responsibilityAmount: source.responsibilityAmount,
    createdAt,
  };
}

export function toAllocationPortionInsertValues(
  allocation: MultiCheckAllocation,
  portion: AllocationPortion
): AllocationPortionInsertValues {
  return {
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    portionId: portion.portionId,
    allocationSequence: portion.sequence,
    targetCheckId: portion.targetCheckId,
    amount: portion.amount,
    applied: portion.applied,
    createdAt: portion.createdAt,
  };
}

export function toAllocationAdjustmentInsertValues(
  allocation: MultiCheckAllocation,
  adjustment: AllocationAdjustment
): AllocationAdjustmentInsertValues {
  return {
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    adjustmentId: adjustment.adjustmentId,
    portionId: adjustment.portionId,
    amount: adjustment.amount,
    direction: adjustment.direction,
    createdAt: adjustment.createdAt,
  };
}

export function toAllocationReversalInsertValues(
  allocation: MultiCheckAllocation,
  reversal: AllocationReversal
): AllocationReversalInsertValues {
  return {
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    reversalId: reversal.reversalId,
    reversedAmount: reversal.reversedAmount,
    createdAt: reversal.createdAt,
  };
}

export function toAllocationHistoryInsertValues(input: {
  allocation: MultiCheckAllocation;
  previousRevision: number;
  newRevision: number;
  mutationType: AllocationMutationType;
  allocationReason?: string | null;
  targetCheckId?: number | null;
  schemaVersion?: number;
  createdAt?: string;
}): AllocationHistoryInsertValues {
  const { allocation } = input;
  return {
    restaurantId: allocation.restaurantId,
    allocationId: allocation.allocationId,
    allocationReference: allocation.allocationReference,
    financialReference: allocation.financialReference,
    sourceCheckId: allocation.sourceCheckId,
    targetCheckId: input.targetCheckId ?? null,
    sourcePaymentId: allocation.sourcePaymentId,
    previousRevision: input.previousRevision,
    newRevision: input.newRevision,
    mutationType: input.mutationType,
    status: allocation.status,
    financialResponsibility: allocation.financialResponsibility,
    allocatedAmount: allocation.allocatedAmount,
    remainingAmount: allocation.remainingAmount,
    allocationReason: input.allocationReason ?? null,
    schemaVersion: input.schemaVersion ?? MULTI_CHECK_ALLOCATION_SCHEMA_VERSION,
    createdAt: input.createdAt ?? allocation.updatedAt,
  };
}

export function mapRowToAllocationHistory(
  row: MultiCheckAllocationHistoryPersistenceRow
): AllocationHistoryRecord {
  return {
    sequence: row.id,
    restaurantId: row.restaurantId,
    allocationId: row.allocationId,
    allocationReference: row.allocationReference,
    financialReference: row.financialReference ?? null,
    sourceCheckId: row.sourceCheckId,
    targetCheckId: row.targetCheckId ?? null,
    sourcePaymentId: row.sourcePaymentId ?? null,
    previousRevision: row.previousRevision,
    newRevision: row.newRevision,
    mutationType: mapMutationType(row.mutationType),
    status: mapStatus(row.status),
    financialResponsibility: moneyString(row.financialResponsibility),
    allocatedAmount: moneyString(row.allocatedAmount),
    remainingAmount: moneyString(row.remainingAmount),
    allocationReason: row.allocationReason ?? null,
    schemaVersion: row.schemaVersion,
    createdAt: row.createdAt,
  };
}

/** Persistence-only metadata from header row. */
export function getAllocationPersistenceMetadata(
  row: MultiCheckAllocationPersistenceRow
): Readonly<{
  schemaVersion: number;
  version: number;
  allocationReason: string | null;
}> {
  return {
    schemaVersion: row.schemaVersion,
    version: row.version,
    allocationReason: row.allocationReason ?? null,
  };
}
