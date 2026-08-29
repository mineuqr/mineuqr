/**
 * SETTLEMENT-RECORD-IMPLEMENTATION-1 — Check Aggregate orchestration.
 *
 * Sole production path: Check financial finalization TX → Domain create → Repository insert.
 * Events collected, not published (ADR-021). Reporting consumers unchanged.
 */

import type { SessionDbClient } from "../../diningSession/sessionRepository";
import { formatDiningSessionTimestamp } from "../../diningSession/sessionTypes";
import {
  createSettlementRecord,
  recordKindForCheckOutcome,
  type CheckTerminalOutcome,
  type OperationalCheck,
  type OrderSettlement,
  type SettlementPaymentSnapshotLine,
  type SettlementRecord,
  type SettlementRecordCommandOutcome,
  type SettlementRecordDomainEvent,
  type SettlementTransactionInput,
} from "@shared/operational-session";
import { listActiveOrderIdsForCheck } from "./checkOrderMembershipRepository";
import {
  existsSettlementRecord,
  findSettlementRecordByIdentity,
  insertSettlementRecord,
  SettlementRecordPersistenceError,
} from "./settlementRecordRepository";
import {
  resolveUniqueProductionCollectionFactForSettlement,
  settlementFinancialFactsFromCollectionFact,
} from "./settlementPaidSaleFinancialFacts";

export type CheckSettlementRecordMutationResult = Readonly<{
  record: SettlementRecord | null;
  events: readonly SettlementRecordDomainEvent[];
  outcome: SettlementRecordCommandOutcome | "skipped";
}>;

function paymentSnapshotFromLines(input: {
  currencyCode: string;
  businessTimestamp: string;
  lines: readonly SettlementTransactionInput[];
}): readonly SettlementPaymentSnapshotLine[] {
  return input.lines.map((line) => ({
    settlementTransactionId: null,
    paymentMethod: line.paymentMethod,
    amount: String(line.amount),
    currencyCode: input.currencyCode,
    status: line.status ?? "captured",
    businessTimestamp: input.businessTimestamp,
    reference: line.reference ?? null,
    externalReference: line.externalReference ?? null,
  }));
}

/**
 * Create Settlement Record atomically inside Check finalize TX (SR-INV-04).
 * Idempotent: duplicate business key → already_applied (SR-INV-05).
 */
export async function createSettlementRecordForCheckFinalize(
  input: {
    restaurantId: number;
    check: OperationalCheck;
    outcome: CheckTerminalOutcome;
    /** Frozen money values applied in the same TX (may differ from pre-TX check). */
    freeze: {
      subtotal: string;
      billDiscountAmount: string;
      taxAmount: string;
      taxBreakdown: OperationalCheck["taxBreakdown"];
      grandTotal: string;
      settledAt: string | null;
    };
    settlementLines: readonly SettlementTransactionInput[] | null;
    orderSettlements: readonly OrderSettlement[];
    createdAt?: string;
    createdByActorType?: string | null;
    createdByActorId?: string | null;
  },
  client?: SessionDbClient
): Promise<CheckSettlementRecordMutationResult> {
  const createdAt = input.createdAt ?? formatDiningSessionTimestamp();
  const recordKind = recordKindForCheckOutcome(input.outcome);
  const recordGeneration = 1;

  const existing = await findSettlementRecordByIdentity(
    {
      restaurantId: input.restaurantId,
      checkId: input.check.id,
      recordKind,
      recordGeneration,
    },
    client
  );
  if (existing) {
    return {
      record: existing,
      events: [],
      outcome: "already_applied",
    };
  }

  const orderIds = await listActiveOrderIdsForCheck(
    input.restaurantId,
    input.check.id,
    client
  );

  const paidSaleCf =
    input.outcome === "paid" || input.outcome === "complimentary"
      ? await resolveUniqueProductionCollectionFactForSettlement({
          restaurantId: input.restaurantId,
          checkId: input.check.id,
          orderIds,
          client,
        })
      : null;
  const cfFacts = paidSaleCf
    ? settlementFinancialFactsFromCollectionFact(paidSaleCf)
    : null;

  const freezeCheck: OperationalCheck = {
    ...input.check,
    outcome: input.outcome,
    subtotal: cfFacts?.subtotal ?? input.freeze.subtotal,
    billDiscountAmount: cfFacts?.discountAmount ?? input.freeze.billDiscountAmount,
    taxAmount: cfFacts?.taxAmount ?? input.freeze.taxAmount,
    taxBreakdown: cfFacts?.taxBreakdown ?? input.freeze.taxBreakdown,
    grandTotal: cfFacts?.grandTotal ?? input.freeze.grandTotal,
    settledAt: cfFacts?.settledAt ?? input.freeze.settledAt,
    totalsFrozenAt: createdAt,
  };

  const settlementLines = cfFacts?.paymentLines ?? input.settlementLines;
  const paymentSnapshotOverride = settlementLines?.length
    ? paymentSnapshotFromLines({
        currencyCode: input.check.currencySnapshot.currencyCode,
        businessTimestamp: cfFacts?.settledAt ?? createdAt,
        lines: settlementLines,
      })
    : [];

  const commandResult = createSettlementRecord({
    check: freezeCheck,
    outcome: input.outcome,
    recordKind,
    recordGeneration,
    createdAt,
    orderIds,
    orderSettlements: input.orderSettlements,
    paymentSnapshotOverride,
    createdByActorType: input.createdByActorType ?? null,
    createdByActorId: input.createdByActorId ?? null,
  });

  if (commandResult.outcome === "already_applied") {
    return {
      record: commandResult.record,
      events: [],
      outcome: "already_applied",
    };
  }

  try {
    await insertSettlementRecord(commandResult.record, client);
  } catch (error) {
    if (
      error instanceof SettlementRecordPersistenceError &&
      error.code === "DUPLICATE"
    ) {
      const raced = await findSettlementRecordByIdentity(
        {
          restaurantId: input.restaurantId,
          checkId: input.check.id,
          recordKind,
          recordGeneration,
        },
        client
      );
      if (raced) {
        return {
          record: raced,
          events: [],
          outcome: "already_applied",
        };
      }
    }
    throw error;
  }

  return {
    record: commandResult.record,
    events: commandResult.events,
    outcome: "applied",
  };
}

export async function settlementRecordExistsForCheck(
  input: {
    restaurantId: number;
    checkId: number;
    outcome: CheckTerminalOutcome;
  },
  client?: SessionDbClient
): Promise<boolean> {
  return existsSettlementRecord(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      recordKind: recordKindForCheckOutcome(input.outcome),
      recordGeneration: 1,
    },
    client
  );
}
