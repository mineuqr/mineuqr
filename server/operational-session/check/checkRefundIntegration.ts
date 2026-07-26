/**
 * REFUND-DOMAIN-IMPLEMENTATION-1 — Check Aggregate orchestration for Refund.
 *
 * Sole mutation path: Check Aggregate → Domain executeRefundOnCheck →
 * Order Settlement persist + Settlement Record insert (same TX).
 *
 * ADR-ARCH-032 · ADR-ARCH-021 · ADR-ARCH-022 · ADR-ARCH-026
 * No UI · No Reporting · No Register attribution in this program.
 */

import type { SessionDbClient } from "../../diningSession/sessionRepository";
import { formatDiningSessionTimestamp } from "../../diningSession/sessionTypes";
import {
  calculateRefundBudget,
  executeRefundOnCheck,
  type ExecuteRefundOnCheckResult,
  type OperationalCheck,
  type OrderSettlement,
  type OrderSettlementDomainEvent,
  type Refund,
  type RefundAllocation,
  type RefundDomainEvent,
  type SettlementRecord,
  type SettlementRecordDomainEvent,
} from "@shared/operational-session";
import { findCheckById } from "./checkRepository";
import { mapRowToOperationalCheck } from "./checkMapper";
import {
  listOrderSettlementsForCheck,
  updateOrderSettlement,
} from "./orderSettlementRepository";
import {
  findSettlementRecordByIdentity,
  insertSettlementRecord,
  listSettlementRecordsForCheck,
  SettlementRecordPersistenceError,
} from "./settlementRecordRepository";
import { allocateRefundDocumentNumber } from "./refundDocumentNumberRepository";

export type CheckRefundMutationResult = Readonly<{
  outcome: ExecuteRefundOnCheckResult["outcome"];
  refund: Refund;
  remainingBudget: string;
  settledValue: string;
  appliedRefundTotal: string;
  orderSettlements: readonly OrderSettlement[];
  settlementRecord: SettlementRecord | null;
  events: readonly (
    | RefundDomainEvent
    | OrderSettlementDomainEvent
    | SettlementRecordDomainEvent
  )[];
  check: OperationalCheck;
}>;

async function loadCheckOrThrow(
  restaurantId: number,
  checkId: number,
  client?: SessionDbClient
): Promise<OperationalCheck> {
  const row = await findCheckById(checkId, client);
  if (!row || row.restaurantId !== restaurantId) {
    throw new Error(
      `Check not found for refund restaurant=${restaurantId} check=${checkId}`
    );
  }
  return mapRowToOperationalCheck(row);
}

/**
 * Apply Refund under Check Aggregate authority in one financial transaction.
 *
 * Atomic:
 * - Refund budget enforcement
 * - Order Settlement → refunded (when budget exhausted / targeted)
 * - Compensating Settlement Record (recordKind=refund)
 *
 * Idempotent retries: already_applied when generation / RefundId already published.
 * Register Attribution is post-commit via CheckService (REFUND-REGISTER-ADOPTION-1) — fail-open.
 */
export async function applyRefundOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    amount: string;
    reason?: string | null;
    allocations?: readonly Omit<RefundAllocation, "allocationId">[];
    tenderMethod?: string;
    refundId?: string;
  },
  client?: SessionDbClient
): Promise<CheckRefundMutationResult> {
  const at = formatDiningSessionTimestamp();
  const check = await loadCheckOrThrow(
    input.restaurantId,
    input.checkId,
    client
  );

  const settlementRecords = await listSettlementRecordsForCheck(
    { restaurantId: input.restaurantId, checkId: input.checkId },
    client
  );
  const orderSettlements = await listOrderSettlementsForCheck(
    { restaurantId: input.restaurantId, checkId: input.checkId },
    client
  );

  // Peek next generation candidate for idempotency lookup
  const maxGeneration = settlementRecords.reduce(
    (max, r) => Math.max(max, r.recordGeneration),
    0
  );
  const nextGeneration = maxGeneration + 1;
  const existingRefundRecord = await findSettlementRecordByIdentity(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      recordKind: "refund",
      recordGeneration: nextGeneration,
    },
    client
  );

  const domainResult = executeRefundOnCheck({
    check,
    amount: input.amount,
    settlementRecords,
    orderSettlements,
    reason: input.reason,
    allocations: input.allocations,
    tenderMethod: input.tenderMethod,
    refundId: input.refundId,
    at,
    existingRefundRecord,
  });

  if (domainResult.outcome === "already_applied") {
    const existingRecord =
      domainResult.settlementRecordResult?.record ?? existingRefundRecord;
    if (existingRecord) {
      await allocateRefundDocumentNumber(
        {
          restaurantId: input.restaurantId,
          settlementRecordId: existingRecord.settlementRecordId,
        },
        client
      );
    }
    return {
      outcome: "already_applied",
      refund: domainResult.refund,
      remainingBudget: domainResult.remainingBudget,
      settledValue: domainResult.budget.settledValue,
      appliedRefundTotal: domainResult.budget.appliedRefundTotal,
      orderSettlements: domainResult.orderSettlements,
      settlementRecord: existingRecord,
      events: [],
      check,
    };
  }

  // Persist Order Settlement transitions
  for (const result of domainResult.orderSettlementResults) {
    if (result.outcome === "already_in_state") continue;
    const previous = orderSettlements.find(
      (s) =>
        s.orderId === result.settlement.orderId &&
        s.checkId === result.settlement.checkId
    );
    if (!previous) continue;
    await updateOrderSettlement(
      result.settlement,
      { expectedStatus: previous.status },
      client
    );
  }

  // Persist compensating Settlement Record (append-only)
  const srResult = domainResult.settlementRecordResult;
  if (!srResult) {
    throw new Error("RF-INV-P01: Refund apply missing Settlement Record result");
  }

  if (srResult.outcome === "applied") {
    try {
      await insertSettlementRecord(srResult.record, client);
      // REFUND-DOCUMENT-NUMBERING-ADOPTION-1 — immutable RF- identity (identity plane).
      await allocateRefundDocumentNumber(
        {
          restaurantId: input.restaurantId,
          settlementRecordId: srResult.record.settlementRecordId,
        },
        client
      );
    } catch (error) {
      if (
        error instanceof SettlementRecordPersistenceError &&
        error.code === "DUPLICATE"
      ) {
        const raced = await findSettlementRecordByIdentity(
          {
            restaurantId: input.restaurantId,
            checkId: input.checkId,
            recordKind: "refund",
            recordGeneration: srResult.record.recordGeneration,
          },
          client
        );
        if (raced) {
          await allocateRefundDocumentNumber(
            {
              restaurantId: input.restaurantId,
              settlementRecordId: raced.settlementRecordId,
            },
            client
          );
          return {
            outcome: "already_applied",
            refund: {
              ...domainResult.refund,
              refundSettlementRecordId: raced.settlementRecordId,
              status: "completed",
            },
            remainingBudget: domainResult.remainingBudget,
            settledValue: domainResult.budget.settledValue,
            appliedRefundTotal: domainResult.budget.appliedRefundTotal,
            orderSettlements: domainResult.orderSettlements,
            settlementRecord: raced,
            events: [],
            check,
          };
        }
      }
      throw error;
    }
  }

  return {
    outcome: "applied",
    refund: domainResult.refund,
    remainingBudget: domainResult.remainingBudget,
    settledValue: domainResult.budget.settledValue,
    appliedRefundTotal: domainResult.budget.appliedRefundTotal,
    orderSettlements: domainResult.orderSettlements,
    settlementRecord: srResult.record,
    events: domainResult.events,
    check,
  };
}

/**
 * Read-only refundable budget for a Check (domain derivation; no mutation).
 */
export async function getRefundBudgetForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<{
  settledValue: string;
  appliedRefundTotal: string;
  refundableBalance: string;
  priorSettlementRecordId: string;
  nextRecordGeneration: number;
}> {
  const settlementRecords = await listSettlementRecordsForCheck(input, client);
  const budget = calculateRefundBudget({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    settlementRecords,
  });
  return {
    settledValue: budget.settledValue,
    appliedRefundTotal: budget.appliedRefundTotal,
    refundableBalance: budget.refundableBalance,
    priorSettlementRecordId: budget.priorSettlementRecordId,
    nextRecordGeneration: budget.nextRecordGeneration,
  };
}
