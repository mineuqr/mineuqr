/**
 * CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1
 * Database-backed sweep. Survives request death and process restart.
 * Does not block Cashier HTTP. Does not write Collection Fact.
 */

import { opsLog } from "../../../_core/opsLog";
import { OPS_EVENT } from "../../../_core/opsTaxonomy";
import { completeCashierOperationalSettlementAfterCollectionFact } from "../../check/CheckService";
import { findCollectionFactByFactId, findProductionCollectionFactByCheckId } from "../collection-fact/collectionFactRepository";
import {
  CASHIER_DOWNSTREAM_RECOVERY_PROGRAM_ID,
  tendersToSettlementLines,
} from "./cashierDownstreamSettlementRecovery";
import { listIncompleteCashierDownstreamObligations } from "./cashierDownstreamSettlementRecoveryRepository";

const BACKOFF_MS = [0, 1_000, 5_000, 15_000, 30_000, 60_000] as const;
const MAX_ATTEMPTS_BEFORE_ATTENTION = 8;

type RetryBook = {
  attemptCount: number;
  nextRetryAtMs: number;
  lastError: string | null;
  lastAttemptAt: string | null;
};

const retries = new Map<string, RetryBook>();
const inFlight = new Map<string, Promise<void>>();

let timer: ReturnType<typeof setInterval> | null = null;

function bookFor(recoveryId: string): RetryBook {
  return (
    retries.get(recoveryId) ?? {
      attemptCount: 0,
      nextRetryAtMs: 0,
      lastError: null,
      lastAttemptAt: null,
    }
  );
}

export function resetCashierDownstreamSettlementRecoveryWorkerForTests(): void {
  retries.clear();
  inFlight.clear();
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

export function scheduleCashierDownstreamSettlementRecovery(input: {
  restaurantId: number;
  checkId: number;
  orderId?: number;
}): void {
  void recoverCashierDownstreamSettlementObligation(input).catch(
    (err: unknown) => {
      opsLog({
        type: OPS_EVENT.cashier_downstream_settlement_recovery_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        action: "scheduleCashierDownstreamSettlementRecovery",
        metadata: {
          program: CASHIER_DOWNSTREAM_RECOVERY_PROGRAM_ID,
          checkId: input.checkId,
          orderId: input.orderId ?? null,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    }
  );
}

export async function recoverCashierDownstreamSettlementObligation(input: {
  restaurantId: number;
  checkId: number;
  orderId?: number;
  collectionFactId?: string;
}): Promise<void> {
  const key = `${input.restaurantId}:${input.checkId}`;
  const existing = inFlight.get(key);
  if (existing) {
    await existing;
    return;
  }
  const work = (async () => {
    const recoveryId = input.collectionFactId ?? key;
    const book = bookFor(recoveryId);
    book.lastAttemptAt = new Date().toISOString();
    retries.set(recoveryId, book);
    const fact = input.collectionFactId
      ? await findCollectionFactByFactId({
          restaurantId: input.restaurantId,
          collectionFactId: input.collectionFactId,
        })
      : await findProductionCollectionFactByCheckId({
          restaurantId: input.restaurantId,
          checkId: input.checkId,
        });
    try {
      await completeCashierOperationalSettlementAfterCollectionFact({
        restaurantId: input.restaurantId,
        checkId: input.checkId,
        settlements: fact ? tendersToSettlementLines(fact.tenders) : undefined,
      });
      retries.delete(recoveryId);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      book.lastError = message;
      book.attemptCount += 1;
      const delay =
        BACKOFF_MS[Math.min(book.attemptCount, BACKOFF_MS.length - 1)] ?? 60_000;
      book.nextRetryAtMs = Date.now() + delay;
      retries.set(recoveryId, book);
      opsLog({
        type:
          book.attemptCount >= MAX_ATTEMPTS_BEFORE_ATTENTION
            ? OPS_EVENT.cashier_downstream_settlement_recovery_attention
            : OPS_EVENT.cashier_downstream_settlement_recovery_failed,
        category: "ORDER",
        severity:
          book.attemptCount >= MAX_ATTEMPTS_BEFORE_ATTENTION ? "error" : "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        action: "recoverCashierDownstreamSettlementObligation",
        metadata: {
          program: CASHIER_DOWNSTREAM_RECOVERY_PROGRAM_ID,
          recoveryId,
          checkId: input.checkId,
          orderId: input.orderId ?? fact?.orderId ?? null,
          collectionFactId: input.collectionFactId ?? fact?.collectionFactId ?? null,
          paymentIntentId: fact?.paymentIntentId ?? null,
          attemptCount: book.attemptCount,
          lastError: message,
          nextRetryAt: new Date(book.nextRetryAtMs).toISOString(),
        },
      });
      throw err;
    }
  })();
  inFlight.set(key, work);
  try {
    await work;
  } finally {
    inFlight.delete(key);
  }
}

export async function sweepIncompleteCashierDownstreamSettlements(): Promise<number> {
  const obligations = await listIncompleteCashierDownstreamObligations();
  for (const obligation of obligations) {
    const book = bookFor(obligation.collectionFactId);
    if (Date.now() < book.nextRetryAtMs) continue;
    try {
      await recoverCashierDownstreamSettlementObligation({
        restaurantId: obligation.restaurantId,
        checkId: obligation.checkId,
        orderId: obligation.orderId,
        collectionFactId: obligation.collectionFactId,
      });
    } catch {
      // Logged in recover. Continue remaining obligations.
    }
  }
  return obligations.length;
}

export function startCashierDownstreamSettlementRecoveryWorker(input?: {
  intervalMs?: number;
}): void {
  if (timer) return;
  const intervalMs = input?.intervalMs ?? 15_000;
  void sweepIncompleteCashierDownstreamSettlements().catch((err: unknown) => {
    opsLog({
      type: OPS_EVENT.cashier_downstream_settlement_recovery_failed,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      action: "startCashierDownstreamSettlementRecoveryWorker",
      metadata: {
        program: CASHIER_DOWNSTREAM_RECOVERY_PROGRAM_ID,
        error: err instanceof Error ? err.message : String(err),
      },
    });
  });
  timer = setInterval(() => {
    void sweepIncompleteCashierDownstreamSettlements().catch(() => undefined);
  }, intervalMs);
  if (typeof timer.unref === "function") timer.unref();
}
