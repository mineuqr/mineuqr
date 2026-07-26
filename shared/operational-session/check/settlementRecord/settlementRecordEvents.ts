/**
 * ADR-ARCH-026 / SETTLEMENT-RECORD-IMPLEMENTATION-1 — domain event contracts.
 *
 * Collected facts only — no bus, publishing, or outbox in v1 (ADR-021 compatible).
 * Publisher: Check Aggregate. Replay from Settlement Record persistence is authoritative.
 */

import type {
  SettlementRecord,
  SettlementRecordKind,
} from "./settlementRecordContract";
import { buildSettlementRecordEventClaimKey } from "./settlementRecordIdentity";

export const SETTLEMENT_RECORD_DOMAIN_EVENT_TYPES = [
  "SettlementRecordCreated",
  "SettlementRecordRefunded",
  "SettlementRecordVoided",
  "SettlementRecordCorrected",
] as const;

export type SettlementRecordDomainEventType =
  (typeof SETTLEMENT_RECORD_DOMAIN_EVENT_TYPES)[number];

type SettlementRecordEventBase = Readonly<{
  eventType: SettlementRecordDomainEventType;
  restaurantId: number;
  checkId: number;
  settlementRecordId: string;
  recordKind: SettlementRecordKind;
  recordGeneration: number;
  occurredAt: string;
  /** ADR-021 business-fact claim key — deterministic / replay-safe. */
  claimKey: string;
}>;

export type SettlementRecordCreated = SettlementRecordEventBase &
  Readonly<{
    eventType: "SettlementRecordCreated";
    outcome: SettlementRecord["outcome"];
    grandTotal: string;
    financialReference: string | null;
  }>;

export type SettlementRecordRefunded = SettlementRecordEventBase &
  Readonly<{
    eventType: "SettlementRecordRefunded";
    priorSettlementRecordId: string;
  }>;

export type SettlementRecordVoided = SettlementRecordEventBase &
  Readonly<{
    eventType: "SettlementRecordVoided";
    priorSettlementRecordId: string | null;
  }>;

export type SettlementRecordCorrected = SettlementRecordEventBase &
  Readonly<{
    eventType: "SettlementRecordCorrected";
    priorSettlementRecordId: string;
  }>;

export type SettlementRecordDomainEvent =
  | SettlementRecordCreated
  | SettlementRecordRefunded
  | SettlementRecordVoided
  | SettlementRecordCorrected;

export function buildSettlementRecordCreatedEvent(
  record: SettlementRecord,
  occurredAt: string
): SettlementRecordCreated {
  return {
    eventType: "SettlementRecordCreated",
    restaurantId: record.restaurantId,
    checkId: record.checkId,
    settlementRecordId: record.settlementRecordId,
    recordKind: record.recordKind,
    recordGeneration: record.recordGeneration,
    occurredAt,
    claimKey: buildSettlementRecordEventClaimKey({
      restaurantId: record.restaurantId,
      checkId: record.checkId,
      recordKind: record.recordKind,
      recordGeneration: record.recordGeneration,
    }),
    outcome: record.outcome,
    grandTotal: record.grandTotal,
    financialReference: record.financialReference,
  };
}

/** Compensating refund publication companion fact (ADR-026 §10.2 / ADR-032). */
export function buildSettlementRecordRefundedEvent(
  record: SettlementRecord,
  occurredAt: string
): SettlementRecordRefunded {
  if (record.recordKind !== "refund" || !record.priorSettlementRecordId) {
    throw new Error(
      "SettlementRecordRefunded requires recordKind=refund and priorSettlementRecordId"
    );
  }
  return {
    eventType: "SettlementRecordRefunded",
    restaurantId: record.restaurantId,
    checkId: record.checkId,
    settlementRecordId: record.settlementRecordId,
    recordKind: record.recordKind,
    recordGeneration: record.recordGeneration,
    occurredAt,
    claimKey: buildSettlementRecordEventClaimKey({
      restaurantId: record.restaurantId,
      checkId: record.checkId,
      recordKind: record.recordKind,
      recordGeneration: record.recordGeneration,
    }),
    priorSettlementRecordId: record.priorSettlementRecordId,
  };
}
