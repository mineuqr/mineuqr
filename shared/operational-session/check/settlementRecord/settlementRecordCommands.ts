/**
 * ADR-ARCH-026 / SETTLEMENT-RECORD-IMPLEMENTATION-1 — domain commands.
 *
 * Pure create-only commands. Outcomes: applied | already_applied (ADR-021).
 * No UPDATE path for money. Compensating records append only.
 */

import type { CheckTerminalOutcome, OperationalCheck } from "../checkContract";
import type { OrderSettlement } from "../orderSettlement/orderSettlementContract";
import type { SettlementTransaction } from "../settlementTransactionContract";
import type {
  SettlementPaymentSnapshotLine,
  SettlementRecord,
  SettlementRecordIdentity,
  SettlementRecordKind,
} from "./settlementRecordContract";
import { assertUniqueBusinessIdentity } from "./settlementRecordIdentity";
import {
  assertAppendOnly,
  assertMonetaryConsistencyWithCheck,
  assertSettlementRecordValid,
  assertTenantIsolation,
} from "./settlementRecordInvariants";
import { buildSettlementRecordCreatedEvent } from "./settlementRecordEvents";
import type { SettlementRecordDomainEvent } from "./settlementRecordEvents";
import {
  buildSettlementRecordSnapshot,
  freezeBusinessDayFromTimestamp,
  recordKindForCheckOutcome,
} from "./settlementRecordSnapshot";

export type SettlementRecordCommandOutcome =
  | "applied"
  | "already_applied";

export type SettlementRecordCommandResult = Readonly<{
  outcome: SettlementRecordCommandOutcome;
  record: SettlementRecord;
  events: readonly SettlementRecordDomainEvent[];
}>;

export type CreateSettlementRecordCommand = Readonly<{
  check: OperationalCheck;
  outcome: CheckTerminalOutcome;
  /** Defaults via recordKindForCheckOutcome(outcome). */
  recordKind?: SettlementRecordKind;
  recordGeneration?: number;
  priorSettlementRecordId?: string | null;
  businessDay?: string;
  createdAt: string;
  orderIds: readonly number[];
  orderSettlements?: readonly OrderSettlement[];
  paymentLines?: readonly SettlementTransaction[];
  paymentSnapshotOverride?: readonly SettlementPaymentSnapshotLine[];
  /** Existing identities for in-memory uniqueness (optional). */
  existingIdentities?: readonly SettlementRecordIdentity[];
  /**
   * When present, yields already_applied (idempotent retry).
   */
  existingRecord?: SettlementRecord | null;
  createdByActorType?: string | null;
  createdByActorId?: string | null;
}>;

export type CreateCompensatingSettlementRecordCommand = Readonly<{
  check: OperationalCheck;
  outcome: CheckTerminalOutcome;
  recordKind: Exclude<SettlementRecordKind, "settlement">;
  recordGeneration: number;
  /** Document-chain prior. First CF-backed refund may omit it (original sale is CF). */
  priorSettlementRecordId: string | null;
  businessDay?: string;
  createdAt: string;
  orderIds: readonly number[];
  orderSettlements?: readonly OrderSettlement[];
  paymentLines?: readonly SettlementTransaction[];
  paymentSnapshotOverride?: readonly SettlementPaymentSnapshotLine[];
  existingIdentities?: readonly SettlementRecordIdentity[];
  existingRecord?: SettlementRecord | null;
  createdByActorType?: string | null;
  createdByActorId?: string | null;
}>;

function resolveBusinessDay(
  explicit: string | undefined,
  createdAt: string,
  settledAt: string | null
): string {
  if (explicit) return explicit;
  return freezeBusinessDayFromTimestamp(settledAt ?? createdAt);
}

function buildFromCommand(
  command: CreateSettlementRecordCommand,
  recordKind: SettlementRecordKind,
  recordGeneration: number,
  priorSettlementRecordId: string | null
): SettlementRecordCommandResult {
  assertAppendOnly("insert");
  assertTenantIsolation({
    recordRestaurantId: command.check.restaurantId,
    checkRestaurantId: command.check.restaurantId,
  });

  if (command.existingRecord) {
    return {
      outcome: "already_applied",
      record: command.existingRecord,
      events: [],
    };
  }

  const identity: SettlementRecordIdentity = {
    restaurantId: command.check.restaurantId,
    checkId: command.check.id,
    recordKind,
    recordGeneration,
  };
  assertUniqueBusinessIdentity(identity, command.existingIdentities ?? []);

  const freezeCheck: OperationalCheck = {
    ...command.check,
    outcome: command.outcome,
    settledAt:
      command.outcome === "paid" || command.outcome === "complimentary"
        ? command.check.settledAt ?? command.createdAt
        : command.check.settledAt,
  };

  const record = buildSettlementRecordSnapshot({
    check: freezeCheck,
    outcome: command.outcome,
    recordKind,
    recordGeneration,
    priorSettlementRecordId,
    businessDay: resolveBusinessDay(
      command.businessDay,
      command.createdAt,
      freezeCheck.settledAt
    ),
    createdAt: command.createdAt,
    orderIds: command.orderIds,
    orderSettlements: command.orderSettlements,
    paymentLines: command.paymentLines ?? [],
    paymentSnapshotOverride: command.paymentSnapshotOverride,
    createdByActorType: command.createdByActorType,
    createdByActorId: command.createdByActorId,
  });

  assertMonetaryConsistencyWithCheck({
    record,
    check: {
      subtotal: freezeCheck.subtotal,
      billDiscountAmount: freezeCheck.billDiscountAmount,
      taxAmount: freezeCheck.taxAmount,
      grandTotal: freezeCheck.grandTotal,
      outcome: command.outcome,
    },
  });
  assertSettlementRecordValid(record);

  return {
    outcome: "applied",
    record,
    events: [buildSettlementRecordCreatedEvent(record, command.createdAt)],
  };
}

/**
 * Produce the primary Settlement Record for Check financial finalization.
 * Money is copied from Check — never calculated.
 */
export function createSettlementRecord(
  command: CreateSettlementRecordCommand
): SettlementRecordCommandResult {
  const recordKind =
    command.recordKind ?? recordKindForCheckOutcome(command.outcome);
  const recordGeneration = command.recordGeneration ?? 1;
  return buildFromCommand(
    command,
    recordKind,
    recordGeneration,
    command.priorSettlementRecordId ?? null
  );
}

/**
 * Append a compensating Settlement Record (refund / void / reversal / correction).
 * Never updates the prior record (SR-INV-02).
 */
export function createCompensatingSettlementRecord(
  command: CreateCompensatingSettlementRecordCommand
): SettlementRecordCommandResult {
  return buildFromCommand(
    command,
    command.recordKind,
    command.recordGeneration,
    command.priorSettlementRecordId
  );
}
