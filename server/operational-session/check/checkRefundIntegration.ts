/**
 * REFUND-DOMAIN-IMPLEMENTATION-1 / REFUND-INVOICE-IDENTITY-AND-CONCURRENCY-HARDENING-1
 *
 * Sole mutation path: Check Aggregate → Domain executeRefundOnCheck →
 * Order Settlement persist + Settlement Record insert (same TX).
 *
 * Concurrency: generation uniqueness + conflict re-read retry.
 * Distinct requests colliding on the same generation are NOT silently
 * already_applied when amounts differ — they conflict and retry with a
 * fresh budget/generation.
 */

import type { SessionDbClient } from "../../diningSession/sessionRepository";
import { formatDiningSessionTimestamp } from "../../diningSession/sessionTypes";
import {
  calculateRefundBudget,
  ConcurrentRefundGenerationError,
  executeRefundOnCheck,
  parseRefundMoney,
  type ExecuteRefundOnCheckResult,
  type OperationalCheck,
  type OrderSettlement,
  type OrderSettlementDomainEvent,
  type Refund,
  type RefundAllocation,
  type RefundDomainEvent,
  type RefundOriginalSaleAnchor,
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
import { resolveRefundOriginalSaleAnchorForCheck } from "./checkRefundOriginalSaleResolution";

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

function amountsMatch(a: string, b: string): boolean {
  return parseRefundMoney(a) === parseRefundMoney(b);
}

async function attemptApplyRefundOnCheck(
  input: {
    restaurantId: number;
    checkId: number;
    amount: string;
    reason?: string | null;
    allocations?: readonly Omit<RefundAllocation, "allocationId">[];
    tenderMethod?: string;
    refundId?: string;
  },
  client: SessionDbClient | undefined,
  at: string,
  check: OperationalCheck
): Promise<CheckRefundMutationResult> {
  const settlementRecords = await listSettlementRecordsForCheck(
    { restaurantId: input.restaurantId, checkId: input.checkId },
    client
  );
  const orderSettlements = await listOrderSettlementsForCheck(
    { restaurantId: input.restaurantId, checkId: input.checkId },
    client
  );
  const originalSaleAnchor = await resolveRefundOriginalSaleAnchorForCheck(
    { restaurantId: input.restaurantId, checkId: input.checkId },
    client
  );

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
    originalSaleAnchor,
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

  const srResult = domainResult.settlementRecordResult;
  if (!srResult) {
    throw new Error("RF-INV-P01: Refund apply missing Settlement Record result");
  }

  if (srResult.outcome === "applied") {
    try {
      await insertSettlementRecord(srResult.record, client);
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
          if (amountsMatch(raced.grandTotal, input.amount)) {
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
          throw new ConcurrentRefundGenerationError(
            `RF-GEN-04: concurrent refund generation conflict for check=${input.checkId} (requested ${input.amount} vs published ${raced.grandTotal})`
          );
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
 * Apply Refund under Check Aggregate authority in one financial transaction attempt.
 * Caller (CheckService) may retry the whole TX on ConcurrentRefundGenerationError.
 *
 * Same amount at same generation → already_applied (lost-response safe).
 * Different amount at same generation → ConcurrentRefundGenerationError.
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
  return attemptApplyRefundOnCheck(input, client, at, check);
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
  originalSaleKind: RefundOriginalSaleAnchor["kind"];
  collectionFactId: string | null;
}> {
  const settlementRecords = await listSettlementRecordsForCheck(input, client);
  const originalSaleAnchor = await resolveRefundOriginalSaleAnchorForCheck(
    input,
    client
  );
  const budget = calculateRefundBudget({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    settlementRecords,
    originalSale: originalSaleAnchor,
  });
  return {
    settledValue: budget.settledValue,
    appliedRefundTotal: budget.appliedRefundTotal,
    refundableBalance: budget.refundableBalance,
    priorSettlementRecordId: budget.priorSettlementRecordId,
    nextRecordGeneration: budget.nextRecordGeneration,
    originalSaleKind: budget.originalSaleKind,
    collectionFactId: budget.collectionFactId,
  };
}
