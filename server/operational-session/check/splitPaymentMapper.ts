/**
 * SPLIT-PAYMENT-PERSISTENCE-1 — deterministic DB ↔ Domain mapping.
 * No lifecycle evaluation, money calculation, or invariant enforcement.
 */

import type {
  SelectCheckSplitPayment,
  SelectCheckSplitPaymentAllocation,
  SelectCheckSplitPaymentAttempt,
  SelectCheckSplitPaymentTender,
  SelectCheckSplitPaymentTenderAllocation,
} from "../../../drizzle/schema";
import {
  assertSplitPaymentStatus,
  isTenderMethod,
  type PaymentAllocation,
  type PaymentAttempt,
  type PaymentAttemptStatus,
  type SplitPayment,
  type SplitPaymentStatus,
  type Tender,
  type TenderAllocation,
  type TenderMethod,
} from "@shared/operational-session";

export type SplitPaymentPersistenceRow = SelectCheckSplitPayment;
export type SplitPaymentTenderPersistenceRow = SelectCheckSplitPaymentTender;
export type SplitPaymentTenderAllocationPersistenceRow =
  SelectCheckSplitPaymentTenderAllocation;
export type SplitPaymentAllocationPersistenceRow =
  SelectCheckSplitPaymentAllocation;
export type PaymentAttemptPersistenceRow = SelectCheckSplitPaymentAttempt;

export type SplitPaymentInsertValues = Readonly<{
  restaurantId: number;
  checkId: number;
  paymentId: string;
  paymentReference: string;
  financialReference: string | null;
  status: SplitPaymentStatus;
  amount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}>;

export type SplitPaymentUpdateValues = Readonly<{
  status: SplitPaymentStatus;
  amount: string;
  allocatedAmount: string;
  unallocatedAmount: string;
  version: number;
  updatedAt: string;
}>;

export type TenderInsertValues = Readonly<{
  restaurantId: number;
  checkId: number;
  paymentId: string;
  tenderId: string;
  method: string;
  amount: string;
  createdAt: string;
}>;

export type TenderAllocationInsertValues = Readonly<{
  restaurantId: number;
  checkId: number;
  paymentId: string;
  tenderAllocationId: string;
  tenderId: string;
  amount: string;
  createdAt: string;
}>;

export type PaymentAllocationInsertValues = Readonly<{
  restaurantId: number;
  checkId: number;
  paymentId: string;
  allocationId: string;
  orderId: number;
  amount: string;
  createdAt: string;
}>;

export type PaymentAttemptInsertValues = Readonly<{
  restaurantId: number;
  checkId: number;
  attemptId: string;
  paymentId: string | null;
  status: PaymentAttemptStatus;
  amount: string;
  method: string;
  externalProviderReference: string | null;
  createdAt: string;
  updatedAt: string;
}>;

export type PaymentAttemptOutcomeUpdateValues = Readonly<{
  status: PaymentAttemptStatus;
  paymentId: string | null;
  externalProviderReference: string | null;
  updatedAt: string;
}>;

function moneyString(value: string | number): string {
  return String(value);
}

function mapTenderMethod(value: string): TenderMethod {
  if (!isTenderMethod(value)) {
    throw new Error(`Invalid TenderMethod: ${value}`);
  }
  return value;
}

const ATTEMPT_STATUSES: readonly PaymentAttemptStatus[] = [
  "started",
  "succeeded",
  "failed",
  "cancelled",
];

function mapAttemptStatus(value: string): PaymentAttemptStatus {
  if (!(ATTEMPT_STATUSES as readonly string[]).includes(value)) {
    throw new Error(`Invalid PaymentAttemptStatus: ${value}`);
  }
  return value as PaymentAttemptStatus;
}

function mapPaymentStatus(value: string): SplitPaymentStatus {
  assertSplitPaymentStatus(value);
  return value;
}

export function mapRowToTender(row: SplitPaymentTenderPersistenceRow): Tender {
  return {
    tenderId: row.tenderId,
    restaurantId: row.restaurantId,
    checkId: row.checkId,
    paymentId: row.paymentId,
    method: mapTenderMethod(row.method),
    amount: moneyString(row.amount),
    createdAt: row.createdAt,
  };
}

export function mapRowToTenderAllocation(
  row: SplitPaymentTenderAllocationPersistenceRow
): TenderAllocation {
  return {
    tenderAllocationId: row.tenderAllocationId,
    restaurantId: row.restaurantId,
    checkId: row.checkId,
    paymentId: row.paymentId,
    tenderId: row.tenderId,
    amount: moneyString(row.amount),
    createdAt: row.createdAt,
  };
}

export function mapRowToPaymentAllocation(
  row: SplitPaymentAllocationPersistenceRow
): PaymentAllocation {
  return {
    allocationId: row.allocationId,
    restaurantId: row.restaurantId,
    checkId: row.checkId,
    paymentId: row.paymentId,
    orderId: row.orderId,
    amount: moneyString(row.amount),
    createdAt: row.createdAt,
  };
}

export function mapRowsToSplitPayment(
  header: SplitPaymentPersistenceRow,
  tenders: readonly SplitPaymentTenderPersistenceRow[],
  tenderAllocations: readonly SplitPaymentTenderAllocationPersistenceRow[],
  allocations: readonly SplitPaymentAllocationPersistenceRow[]
): SplitPayment {
  return {
    restaurantId: header.restaurantId,
    checkId: header.checkId,
    paymentId: header.paymentId,
    paymentReference: header.paymentReference,
    financialReference: header.financialReference ?? null,
    status: mapPaymentStatus(header.status),
    amount: moneyString(header.amount),
    allocatedAmount: moneyString(header.allocatedAmount),
    unallocatedAmount: moneyString(header.unallocatedAmount),
    tenders: tenders.map(mapRowToTender),
    tenderAllocations: tenderAllocations.map(mapRowToTenderAllocation),
    allocations: allocations.map(mapRowToPaymentAllocation),
    impliesFinancialSettlement: false,
    createdAt: header.createdAt,
    updatedAt: header.updatedAt,
  };
}

export function toSplitPaymentInsertValues(
  payment: SplitPayment,
  version = 1
): SplitPaymentInsertValues {
  return {
    restaurantId: payment.restaurantId,
    checkId: payment.checkId,
    paymentId: payment.paymentId,
    paymentReference: payment.paymentReference,
    financialReference: payment.financialReference,
    status: payment.status,
    amount: payment.amount,
    allocatedAmount: payment.allocatedAmount,
    unallocatedAmount: payment.unallocatedAmount,
    version,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export function toSplitPaymentUpdateValues(
  payment: SplitPayment,
  nextVersion: number
): SplitPaymentUpdateValues {
  return {
    status: payment.status,
    amount: payment.amount,
    allocatedAmount: payment.allocatedAmount,
    unallocatedAmount: payment.unallocatedAmount,
    version: nextVersion,
    updatedAt: payment.updatedAt,
  };
}

export function toTenderInsertValues(tender: Tender): TenderInsertValues {
  return {
    restaurantId: tender.restaurantId,
    checkId: tender.checkId,
    paymentId: tender.paymentId,
    tenderId: tender.tenderId,
    method: tender.method,
    amount: tender.amount,
    createdAt: tender.createdAt,
  };
}

export function toTenderAllocationInsertValues(
  allocation: TenderAllocation
): TenderAllocationInsertValues {
  return {
    restaurantId: allocation.restaurantId,
    checkId: allocation.checkId,
    paymentId: allocation.paymentId,
    tenderAllocationId: allocation.tenderAllocationId,
    tenderId: allocation.tenderId,
    amount: allocation.amount,
    createdAt: allocation.createdAt,
  };
}

export function toPaymentAllocationInsertValues(
  allocation: PaymentAllocation
): PaymentAllocationInsertValues {
  return {
    restaurantId: allocation.restaurantId,
    checkId: allocation.checkId,
    paymentId: allocation.paymentId,
    allocationId: allocation.allocationId,
    orderId: allocation.orderId,
    amount: allocation.amount,
    createdAt: allocation.createdAt,
  };
}

export function mapRowToPaymentAttempt(
  row: PaymentAttemptPersistenceRow
): PaymentAttempt {
  return {
    restaurantId: row.restaurantId,
    checkId: row.checkId,
    attemptId: row.attemptId,
    paymentId: row.paymentId ?? null,
    status: mapAttemptStatus(row.status),
    amount: moneyString(row.amount),
    method: mapTenderMethod(row.method),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export function toPaymentAttemptInsertValues(
  attempt: PaymentAttempt,
  externalProviderReference: string | null = null
): PaymentAttemptInsertValues {
  return {
    restaurantId: attempt.restaurantId,
    checkId: attempt.checkId,
    attemptId: attempt.attemptId,
    paymentId: attempt.paymentId,
    status: attempt.status,
    amount: attempt.amount,
    method: attempt.method,
    externalProviderReference,
    createdAt: attempt.createdAt,
    updatedAt: attempt.updatedAt,
  };
}

export function toPaymentAttemptOutcomeUpdateValues(
  attempt: PaymentAttempt,
  externalProviderReference: string | null
): PaymentAttemptOutcomeUpdateValues {
  return {
    status: attempt.status,
    paymentId: attempt.paymentId,
    externalProviderReference,
    updatedAt: attempt.updatedAt,
  };
}

/** Read persistence-only provider reference (not part of Domain PaymentAttempt). */
export function getAttemptExternalProviderReference(
  row: PaymentAttemptPersistenceRow
): string | null {
  return row.externalProviderReference ?? null;
}
