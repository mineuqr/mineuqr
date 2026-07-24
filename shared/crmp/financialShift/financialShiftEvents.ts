/**
 * ADR-ARCH-030 / SHIFT-LIFECYCLE-IMPLEMENTATION-1 — Financial Shift domain events.
 *
 * Collected facts only — no bus, outbox, or transport in this program (ADR-021 compatible).
 * Publisher: Financial Shift command handler. Ordering: per-shift monotonic `version`.
 * Idempotency: consumers key on `claimKey` = `${financialShiftId}:${eventType}:${version}`.
 */

import type { FinancialShift } from "./financialShiftContract";
import type { ShiftCloseReason, ShiftStatus } from "../valueObjects";

export const FINANCIAL_SHIFT_DOMAIN_EVENT_TYPES = [
  "FinancialShiftOpened",
  "FinancialShiftSuspended",
  "FinancialShiftResumed",
  "FinancialShiftClosingStarted",
  "FinancialShiftClosed",
  "FinancialShiftArchived",
] as const;

export type FinancialShiftDomainEventType =
  (typeof FINANCIAL_SHIFT_DOMAIN_EVENT_TYPES)[number];

type FinancialShiftEventBase = Readonly<{
  eventType: FinancialShiftDomainEventType;
  restaurantId: number;
  registerId: string;
  financialShiftId: string;
  status: ShiftStatus;
  version: number;
  occurredAt: string;
  claimKey: string;
}>;

export type FinancialShiftOpened = FinancialShiftEventBase &
  Readonly<{
    eventType: "FinancialShiftOpened";
    operatorUserId: number;
    openingFloatAmount: string;
    currencyCode: string;
  }>;

export type FinancialShiftSuspended = FinancialShiftEventBase &
  Readonly<{ eventType: "FinancialShiftSuspended" }>;

export type FinancialShiftResumed = FinancialShiftEventBase &
  Readonly<{ eventType: "FinancialShiftResumed" }>;

export type FinancialShiftClosingStarted = FinancialShiftEventBase &
  Readonly<{ eventType: "FinancialShiftClosingStarted" }>;

export type FinancialShiftClosed = FinancialShiftEventBase &
  Readonly<{
    eventType: "FinancialShiftClosed";
    closeReason: ShiftCloseReason | null;
    closedAt: string | null;
  }>;

export type FinancialShiftArchived = FinancialShiftEventBase &
  Readonly<{
    eventType: "FinancialShiftArchived";
    archivedAt: string | null;
  }>;

export type FinancialShiftDomainEvent =
  | FinancialShiftOpened
  | FinancialShiftSuspended
  | FinancialShiftResumed
  | FinancialShiftClosingStarted
  | FinancialShiftClosed
  | FinancialShiftArchived;

export function buildFinancialShiftEventClaimKey(input: {
  financialShiftId: string;
  eventType: FinancialShiftDomainEventType;
  version: number;
}): string {
  return `${input.financialShiftId}:${input.eventType}:v${input.version}`;
}

function base(
  shift: FinancialShift,
  eventType: FinancialShiftDomainEventType,
  occurredAt: string
): FinancialShiftEventBase {
  return {
    eventType,
    restaurantId: shift.restaurantId,
    registerId: shift.registerId,
    financialShiftId: shift.financialShiftId,
    status: shift.status,
    version: shift.version,
    occurredAt,
    claimKey: buildFinancialShiftEventClaimKey({
      financialShiftId: shift.financialShiftId,
      eventType,
      version: shift.version,
    }),
  };
}

export function buildFinancialShiftOpenedEvent(
  shift: FinancialShift,
  occurredAt: string
): FinancialShiftOpened {
  return {
    ...base(shift, "FinancialShiftOpened", occurredAt),
    eventType: "FinancialShiftOpened",
    operatorUserId: shift.operatorUserId,
    openingFloatAmount: shift.openingFloatAmount,
    currencyCode: shift.currencyCode,
  };
}

export function buildFinancialShiftSuspendedEvent(
  shift: FinancialShift,
  occurredAt: string
): FinancialShiftSuspended {
  return {
    ...base(shift, "FinancialShiftSuspended", occurredAt),
    eventType: "FinancialShiftSuspended",
  };
}

export function buildFinancialShiftResumedEvent(
  shift: FinancialShift,
  occurredAt: string
): FinancialShiftResumed {
  return {
    ...base(shift, "FinancialShiftResumed", occurredAt),
    eventType: "FinancialShiftResumed",
  };
}

export function buildFinancialShiftClosingStartedEvent(
  shift: FinancialShift,
  occurredAt: string
): FinancialShiftClosingStarted {
  return {
    ...base(shift, "FinancialShiftClosingStarted", occurredAt),
    eventType: "FinancialShiftClosingStarted",
  };
}

export function buildFinancialShiftClosedEvent(
  shift: FinancialShift,
  occurredAt: string
): FinancialShiftClosed {
  return {
    ...base(shift, "FinancialShiftClosed", occurredAt),
    eventType: "FinancialShiftClosed",
    closeReason: shift.closeReason,
    closedAt: shift.closedAt,
  };
}

export function buildFinancialShiftArchivedEvent(
  shift: FinancialShift,
  occurredAt: string
): FinancialShiftArchived {
  return {
    ...base(shift, "FinancialShiftArchived", occurredAt),
    eventType: "FinancialShiftArchived",
    archivedAt: shift.archivedAt,
  };
}
