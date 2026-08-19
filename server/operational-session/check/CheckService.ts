/**
 * CHECK-MANAGEMENT-ARCHITECTURE-1 — Check sub-domain application service.
 * CHECK-SETTLEMENT-METHODS-1 — settlement transactions under Check.
 * CHECK-GENERALIZATION-M3 — Membership remains Order correlation; Bill money is Charge composition.
 * CHECK-GENERALIZATION-M4 — Session optional for financial correctness (Check-centric APIs).
 * ORDER-SETTLEMENT-INTEGRATION-1 — Check Aggregate is sole Order Settlement mutation authority.
 * SPLIT-PAYMENT-INTEGRATION-1 — Check Aggregate is sole Split Payment mutation authority.
 * MULTI-CHECK-ALLOCATION-INTEGRATION-1 — Check Aggregate is sole Multi Check Allocation mutation authority.
 * SETTLEMENT-RECORD-IMPLEMENTATION-1 — Check Aggregate produces Settlement Record at financial finalization.
 * SETTLEMENT-FINALIZATION-IDEMPOTENCY-HOTFIX-1 — abort finalize when outcome ownership is lost (0-row UPDATE).
 * REFUND-DOMAIN-IMPLEMENTATION-1 — Check Aggregate is sole Refund mutation authority (ADR-ARCH-032).
 *
 * BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — Bill money from frozen Charges, not live Order totals.
 * Owned by Operational Session Platform. Does not modify Order Domain.
 */

import {
  getDb,
  getRestaurantById,
} from "../../db";
import {
  findSessionById,
  updateSessionActiveCheckId,
  type SessionDbClient,
} from "../../diningSession/sessionRepository";
import {
  DiningSessionNotFoundError,
  DiningSessionUnavailableError,
  DiningSessionValidationError,
  formatDiningSessionTimestamp,
} from "../../diningSession/sessionTypes";
import {
  businessTaxSettingsFromRestaurantRow,
  captureCurrencySnapshot,
  captureTaxPolicySnapshot,
  complimentarySettlementLine,
  computeCheckMoney,
  decideCheckRecalculation,
  defaultPaidSettlementLine,
  remainingCollectible,
  capturedCollectionAmounts,
  resolveStaffSettlementLines,
  SettlementValidationError,
  type CheckOutcome,
  type OperationalCheck,
  type OrderSettlementDomainEvent,
  type SettlementRecordDomainEvent,
  type SettlementTransactionInput,
  type StaffSettlementLineInput,
} from "@shared/operational-session";
import { mapRowToOperationalCheck } from "./checkMapper";
import {
  finalizeCheckOutcome,
  findCheckById,
  findOpenCheckBySessionId,
  insertOperationalCheck,
  touchOpenCheck,
  updateCheckMoney,
} from "./checkRepository";
import { insertSettlementTransactions, listSettlementTransactionsForCheck } from "./settlementTransactionRepository";
import {
  deactivateMembershipsOnCheckVoid,
  enrollOrderInCheck,
  syncSessionOrdersToCheck,
  CheckMembershipError,
} from "./checkMembershipService";
import {
  findBlockingMembershipForOrder,
} from "./checkOrderMembershipRepository";
import {
  ensureOpenCheckChargeComposition,
  loadChargesSubtotal,
  compensateChargesForCancelledOrder,
  reconcileOpenOrderCharges,
} from "./checkChargeComposition";
import {
  applyComplimentaryToCheckOrders,
  applyFullSettlementToCheckOrders,
  applyPartialSettlementForOrder,
  cancelOrderSettlementForOrder,
  ensureOrderSettlementForEnrollment,
  recalculateOrderSettlementsForCheck,
  refundOrderSettlementsForCheck,
  voidOrderSettlementsForCheck,
  type CheckOrderSettlementMutationResult,
} from "./checkOrderSettlementIntegration";
import {
  allocateTendersOnCheck,
  applyPaymentOnCheck,
  authorizePaymentOnCheck,
  cancelPaymentAttemptOnCheck,
  cancelPaymentOnCheck,
  capturePaymentOnCheck,
  createPaymentOnCheck,
  failPaymentAttemptOnCheck,
  failPaymentOnCheck,
  loadCheckOutstanding,
  loadPaymentAttemptsForCheck,
  loadSplitPaymentsForCheck,
  refundPaymentOnCheck,
  startPaymentAttemptOnCheck,
  succeedPaymentAttemptOnCheck,
  voidPaymentOnCheck,
  type CheckSplitPaymentMutationResult,
} from "./checkSplitPaymentIntegration";
import {
  adjustAllocationOnCheck,
  applyAllocationOnCheck,
  cancelAllocationOnCheck,
  completeAllocationOnCheck,
  createAllocationOnCheck,
  loadAllocationByIdentity,
  loadAllocationsForSourceCheck,
  reserveAllocationOnCheck,
  reverseAllocationOnCheck,
  type CheckMultiCheckAllocationMutationResult,
} from "./checkMultiCheckAllocationIntegration";
import {
  createSettlementRecordForCheckFinalize,
  type CheckSettlementRecordMutationResult,
} from "./checkSettlementRecordIntegration";
import {
  applyRefundOnCheck as applyRefundOnCheckIntegration,
  getRefundBudgetForCheck,
  type CheckRefundMutationResult,
} from "./checkRefundIntegration";
import type {
  CreateAllocationPortionInput,
  CreateAllocationSourceInput,
  PaymentPortion,
  TenderMethod,
} from "@shared/operational-session";
import {
  skippedAttribution,
  unavailableSettlementContext,
  type SettlementAttributed,
  type SettlementAttributionAdoptionResult,
  type SettlementContext,
  type SettlementContextHints,
} from "@shared/crmp";
import { resolveSettlementContextForSettle } from "../../crmp/SettlementContextResolver";
import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";
import {
  adoptRefundAttributionAfterFinalize,
  adoptSettlementAttributionAfterFinalize,
} from "./checkSettlementAttributionAdoption";

export class CheckTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckTransitionError";
  }
}

/**
 * CASHIER-SETTLEMENT-FINANCIALTXN-STAGE-INSTRUMENTATION-1
 * Observability-only elapsed stages inside finalizeOpenCheckById.
 * Not financial state. Durations use Date.now() at existing source boundaries.
 */
export type CheckFinancialFinalizeStageMs = Readonly<{
  checkReloadMs: number;
  orderDiscoveryMs: number;
  contextResolveMs: number;
  validationMs: number;
  financialTransactionPreparationMs: number;
  financialTransactionWriteMs: number;
  /**
   * Wall of db.transaction (BEGIN + writes + COMMIT + driver).
   * Null when an outer client is reused (no new transaction).
   * COMMIT is not separately observable in this Drizzle boundary.
   */
  financialTransactionTxWallMs: number | null;
  moneyTxMs: number;
  postCommitProcessingMs: number;
  attributionMs: number;
  financialTransactionStartedAt: string;
  financialTransactionCommittedAt: string;
  /** Null when Attribution is deferred after HTTP (Cashier POS path). */
  attributionCompletedAt: string | null;
}>;

type CheckOwnedTransactionStageMs = {
  preparationMs: number;
  writeMs: number;
  txWallMs: number | null;
};

/** Aggregate financial mutation result (events collected, not published). */
export type CheckFinancialMutationResult = Readonly<{
  check: OperationalCheck;
  orderSettlement: CheckOrderSettlementMutationResult;
  orderSettlementEvents: readonly OrderSettlementDomainEvent[];
  settlementRecord: CheckSettlementRecordMutationResult;
  settlementRecordEvents: readonly SettlementRecordDomainEvent[];
  /**
   * SETTLEMENT-CONTEXT-ADOPTION-1 — operational context (fail-open).
   * Never owns money. Never blocks settle when unavailable.
   */
  settlementContext: SettlementContext;
  /**
   * SETTLEMENT-ATTRIBUTION-ADOPTION-1 — post-commit operational Attribution (fail-open).
   * Never owns money. Never blocks settle.
   */
  settlementAttribution: SettlementAttributionAdoptionResult;
  settlementAttributionEvents: readonly SettlementAttributed[];
  /** Timing-only. Absent on callers that do not go through finalizeOpenCheckById. */
  finalizeStageMs: CheckFinancialFinalizeStageMs;
}>;

function elapsedSinceMs(startedAt: number): number {
  return Date.now() - startedAt;
}

/**
 * Check Aggregate owns the transaction boundary.
 * Repositories participate only — no nested transaction ownership.
 */
async function withCheckOwnedTransaction<T>(
  client: SessionDbClient | undefined,
  fn: (tx: SessionDbClient) => Promise<T>,
  stageMs?: { current: CheckOwnedTransactionStageMs }
): Promise<T> {
  if (client) {
    const writeStartedAt = Date.now();
    const result = await fn(client);
    if (stageMs) {
      stageMs.current = {
        preparationMs: 0,
        writeMs: elapsedSinceMs(writeStartedAt),
        txWallMs: null,
      };
    }
    return result;
  }
  const prepStartedAt = Date.now();
  const db = await getDb();
  const preparationMs = elapsedSinceMs(prepStartedAt);
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  if (!stageMs) {
    return db.transaction(async (tx) => fn(tx));
  }
  let writeMs = 0;
  const txWallStartedAt = Date.now();
  const result = await db.transaction(async (tx) => {
    const writeStartedAt = Date.now();
    const inner = await fn(tx);
    writeMs = elapsedSinceMs(writeStartedAt);
    return inner;
  });
  stageMs.current = {
    preparationMs,
    writeMs,
    txWallMs: elapsedSinceMs(txWallStartedAt),
  };
  return result;
}

/**
 * BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — Bill money from frozen Charges.
 */
async function refreshOpenCheckMoneyFromDiscovery(
  input: {
    restaurantId: number;
    checkId: number;
    billDiscountAmount: string;
    taxPolicySnapshot: OperationalCheck["taxPolicySnapshot"];
  },
  client?: SessionDbClient
): Promise<void> {
  await ensureOpenCheckChargeComposition(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
    },
    client
  );
  const chargesSubtotal = await loadChargesSubtotal(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
    },
    client
  );
  const money = computeCheckMoney({
    chargesSubtotal,
    billDiscountAmount: input.billDiscountAmount,
    taxPolicySnapshot: input.taxPolicySnapshot,
  });
  await updateCheckMoney(
    {
      checkId: input.checkId,
      restaurantId: input.restaurantId,
      subtotal: money.subtotal,
      taxAmount: money.taxAmount,
      taxBreakdown: money.taxBreakdown,
      grandTotal: money.grandTotal,
    },
    client
  );
}

async function captureSnapshotsFromBusinessSettings(restaurantId: number) {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    throw new DiningSessionValidationError("Restaurant not found");
  }
  const settings = businessTaxSettingsFromRestaurantRow({
    currencyCode: restaurant.currencyCode,
    currencySymbol: restaurant.currencySymbol,
    taxEnabled: (restaurant as { taxEnabled?: boolean }).taxEnabled,
    taxMode: (restaurant as { taxMode?: string }).taxMode,
    taxPolicyJson: (restaurant as { taxPolicyJson?: string | null }).taxPolicyJson,
  });
  return {
    currencySnapshot: captureCurrencySnapshot(settings),
    taxPolicySnapshot: captureTaxPolicySnapshot(settings),
  };
}

/**
 * Create an Open Check for a Session with immutable snapshots.
 * Check id is generated independently of sessionId.
 */
export async function createOpenCheckForSession(
  input: {
    restaurantId: number;
    sessionId: number;
  },
  client?: SessionDbClient
): Promise<OperationalCheck> {
  const session = await findSessionById(input.sessionId, client);
  if (!session || session.restaurantId !== input.restaurantId) {
    throw new DiningSessionNotFoundError();
  }

  const existing = await findOpenCheckBySessionId(
    input.restaurantId,
    input.sessionId,
    client
  );
  if (existing) {
    // Authoritative Membership sync (not dual-write gated).
    await syncSessionOrdersToCheck(
      {
        restaurantId: input.restaurantId,
        sessionId: input.sessionId,
        checkId: existing.id,
      },
      client
    );
    if (existing.outcome === "open") {
      const mapped = mapRowToOperationalCheck(existing);
      await refreshOpenCheckMoneyFromDiscovery(
        {
          restaurantId: input.restaurantId,
          checkId: existing.id,
          billDiscountAmount: mapped.billDiscountAmount,
          taxPolicySnapshot: mapped.taxPolicySnapshot,
        },
        client
      );
      await recalculateOrderSettlementsForCheck(
        {
          restaurantId: input.restaurantId,
          checkId: existing.id,
        },
        client
      );
      const refreshed = await findCheckById(existing.id, client);
      return refreshed
        ? mapRowToOperationalCheck(refreshed)
        : mapped;
    }
    return mapRowToOperationalCheck(existing);
  }

  const { currencySnapshot, taxPolicySnapshot } =
    await captureSnapshotsFromBusinessSettings(input.restaurantId);
  // Seed zeros; money authority comes from Charges after enroll/sync.
  const money = computeCheckMoney({
    chargesSubtotal: "0.00",
    billDiscountAmount: "0.00",
    taxPolicySnapshot,
  });
  const snapshotsFrozenAt = formatDiningSessionTimestamp();

  const checkId = await insertOperationalCheck(
    {
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      currencySnapshot,
      taxPolicySnapshot,
      subtotal: money.subtotal,
      taxAmount: money.taxAmount,
      taxBreakdown: money.taxBreakdown,
      grandTotal: money.grandTotal,
      snapshotsFrozenAt,
    },
    client
  );

  await updateSessionActiveCheckId(
    {
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      activeCheckId: checkId,
    },
    client
  );

  // Authoritative Membership ownership + Order Settlement create, then money refresh.
  await syncSessionOrdersToCheck(
    {
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      checkId,
    },
    client
  );

  await refreshOpenCheckMoneyFromDiscovery(
    {
      restaurantId: input.restaurantId,
      checkId,
      billDiscountAmount: "0.00",
      taxPolicySnapshot,
    },
    client
  );
  await recalculateOrderSettlementsForCheck(
    {
      restaurantId: input.restaurantId,
      checkId,
    },
    client
  );

  const row = await findCheckById(checkId, client);
  if (!row) {
    throw new DiningSessionUnavailableError("Check not found after create");
  }
  return mapRowToOperationalCheck(row);
}

/** Lazy ensure for legacy open sessions created before Check Management. */
export async function ensureOpenCheckForSession(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<OperationalCheck> {
  const session = await findSessionById(input.sessionId);
  if (!session || session.restaurantId !== input.restaurantId) {
    throw new DiningSessionNotFoundError();
  }

  if (session.activeCheckId != null) {
    const byId = await findCheckById(session.activeCheckId);
    if (byId && byId.outcome === "open") {
      return mapRowToOperationalCheck(byId);
    }
  }

  const open = await findOpenCheckBySessionId(
    input.restaurantId,
    input.sessionId
  );
  if (open) {
    if (session.activeCheckId !== open.id) {
      await updateSessionActiveCheckId({
        restaurantId: input.restaurantId,
        sessionId: input.sessionId,
        activeCheckId: open.id,
      });
    }
    return mapRowToOperationalCheck(open);
  }

  return createOpenCheckForSession(input);
}

/**
 * Recalculate monetary fields for an open Check using frozen snapshots.
 * No-op when totals are frozen (terminal outcomes).
 */
export async function recalculateOpenCheckForSession(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<OperationalCheck | null> {
  try {
    const check = await ensureOpenCheckForSession(input);
    const decision = decideCheckRecalculation(
      check.outcome,
      check.totalsFrozenAt
    );
    if (!decision.allowed) {
      return check;
    }

    await refreshOpenCheckMoneyFromDiscovery({
      restaurantId: input.restaurantId,
      checkId: check.id,
      billDiscountAmount: check.billDiscountAmount,
      taxPolicySnapshot: check.taxPolicySnapshot,
    });
    await recalculateOrderSettlementsForCheck({
      restaurantId: input.restaurantId,
      checkId: check.id,
    });

    const row = await findCheckById(check.id);
    return row ? mapRowToOperationalCheck(row) : check;
  } catch {
    return null;
  }
}

/**
 * M4 — Check-centric finalize. Does not require Session existence.
 * ORDER-SETTLEMENT-INTEGRATION-1 — single Check-owned transaction for Check +
 * Settlement Transactions + Order Settlement + Membership void.
 */
async function finalizeOpenCheckById(
  input: {
    restaurantId: number;
    checkId: number;
    outcome: Exclude<CheckOutcome, "open">;
    settlements?: readonly StaffSettlementLineInput[];
    /** Pre-resolved context (preferred). */
    settlementContext?: SettlementContext;
    /** Hints when context not pre-resolved — never fabricate. */
    settlementContextHints?: SettlementContextHints;
    /**
     * CASHIER-SETTLEMENT-HTTP-AT-FINANCIAL-COMMIT-1
     * Default true keeps Session/refund callers awaiting fail-open Attribution.
     * Cashier POS passes false so HTTP returns immediately after financial commit.
     */
    awaitAttribution?: boolean;
  },
  client?: SessionDbClient
): Promise<CheckFinancialMutationResult> {
  const checkReloadStartedAt = Date.now();
  const check = await getCheckById({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
  });
  const checkReloadMs = elapsedSinceMs(checkReloadStartedAt);
  if (!check) {
    throw new DiningSessionUnavailableError("Check not found");
  }
  if (check.outcome !== "open") {
    opsLog({
      type: OPS_EVENT.check_terminal_transition_rejected,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      restaurantId: input.restaurantId,
      action: "finalizeOpenCheckById",
      metadata: {
        checkId: input.checkId,
        currentOutcome: check.outcome,
        requestedOutcome: input.outcome,
      },
    });
    throw new CheckTransitionError(
      `Cannot finalize check from outcome ${check.outcome}`
    );
  }

  const orderDiscoveryStartedAt = Date.now();
  await ensureOpenCheckChargeComposition({
    restaurantId: input.restaurantId,
    checkId: check.id,
  });
  const chargesSubtotal = await loadChargesSubtotal({
    restaurantId: input.restaurantId,
    checkId: check.id,
  });
  const orderDiscoveryMs = elapsedSinceMs(orderDiscoveryStartedAt);
  let money = computeCheckMoney({
    chargesSubtotal,
    billDiscountAmount: check.billDiscountAmount,
    taxPolicySnapshot: check.taxPolicySnapshot,
  });
  const now = formatDiningSessionTimestamp();

  // SETTLEMENT-CONTEXT-ADOPTION-1 — resolve outside money TX; fail-open.
  // No hints → unavailable without fabricating or querying CRMP.
  const hints = input.settlementContextHints ?? {};
  const hasOperationalHints = Boolean(
    hints.registerId ||
      hints.deviceId ||
      hints.operatorUserId ||
      hints.operationalScreenId
  );
  const contextResolveStartedAt = Date.now();
  const settlementContext =
    input.settlementContext ??
    (hasOperationalHints
      ? await resolveSettlementContextForSettle({
          restaurantId: input.restaurantId,
          ...hints,
          at: now,
        })
      : unavailableSettlementContext(input.restaurantId, now, [
          "no_operational_hints",
        ]));
  const contextResolveMs = elapsedSinceMs(contextResolveStartedAt);

  let settlementLines: readonly SettlementTransactionInput[] | null = null;
  const validationStartedAt = Date.now();
  try {
    if (input.outcome === "paid") {
      const existingCollection = await listSettlementTransactionsForCheck({
        restaurantId: input.restaurantId,
        checkId: check.id,
      });
      const amountDue = remainingCollectible(
        money.grandTotal,
        capturedCollectionAmounts(existingCollection)
      );
      const captured = capturedCollectionAmounts(existingCollection);
      if (captured.length > 0 && amountDue === "0.00") {
        throw new SettlementValidationError("Bill is already fully collected");
      }
      settlementLines = input.settlements?.length
        ? resolveStaffSettlementLines(amountDue, input.settlements)
        : [defaultPaidSettlementLine(amountDue)];
    } else if (input.outcome === "complimentary") {
      settlementLines = [complimentarySettlementLine(money.grandTotal)];
    }
  } catch (err) {
    if (err instanceof SettlementValidationError) {
      opsLog({
        type: OPS_EVENT.check_collection_rejected,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        action: "finalizeOpenCheckById",
        metadata: {
          checkId: input.checkId,
          outcome: input.outcome,
          error: err.message,
        },
      });
      throw new DiningSessionValidationError(err.message);
    }
    throw err;
  }
  const validationMs = elapsedSinceMs(validationStartedAt);

  const txStages: { current: CheckOwnedTransactionStageMs } = {
    current: { preparationMs: 0, writeMs: 0, txWallMs: null },
  };
  const financialTransactionStartedAt = new Date().toISOString();
  const moneyTxStartedAt = Date.now();
  const financial = await withCheckOwnedTransaction(
    client,
    async (tx) => {
    const locked = await touchOpenCheck(
      { checkId: check.id, restaurantId: input.restaurantId },
      tx
    );
    if (locked === 0) {
      const current = await findCheckById(check.id, tx);
      opsLog({
        type: OPS_EVENT.check_terminal_transition_rejected,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        action: "finalizeOpenCheckById",
        metadata: {
          checkId: input.checkId,
          currentOutcome: current?.outcome ?? "unknown",
          requestedOutcome: input.outcome,
          reason: "open_row_lock_lost",
        },
      });
      throw new CheckTransitionError(
        `Cannot finalize check from outcome ${current?.outcome ?? "unknown"}`
      );
    }

    const latestChargesSubtotal = await loadChargesSubtotal(
      {
        restaurantId: input.restaurantId,
        checkId: check.id,
      },
      tx
    );
    money = computeCheckMoney({
      chargesSubtotal: latestChargesSubtotal,
      billDiscountAmount: check.billDiscountAmount,
      taxPolicySnapshot: check.taxPolicySnapshot,
    });
    const existingCollection = await listSettlementTransactionsForCheck(
      {
        restaurantId: input.restaurantId,
        checkId: check.id,
      },
      tx
    );
    const amountDue = remainingCollectible(
      money.grandTotal,
      capturedCollectionAmounts(existingCollection)
    );
    try {
      if (input.outcome === "paid") {
        const captured = capturedCollectionAmounts(existingCollection);
        if (captured.length > 0 && amountDue === "0.00") {
          throw new SettlementValidationError("Bill is already fully collected");
        }
        settlementLines = input.settlements?.length
          ? resolveStaffSettlementLines(amountDue, input.settlements)
          : [defaultPaidSettlementLine(amountDue)];
      } else if (input.outcome === "complimentary") {
        settlementLines = [complimentarySettlementLine(money.grandTotal)];
      }
    } catch (err) {
      if (err instanceof SettlementValidationError) {
        opsLog({
          type: OPS_EVENT.check_collection_rejected,
          category: "ORDER",
          severity: "warn",
          ts: new Date().toISOString(),
          restaurantId: input.restaurantId,
          action: "finalizeOpenCheckById",
          metadata: {
            checkId: input.checkId,
            outcome: input.outcome,
            amountDue,
            error: err.message,
          },
        });
        throw new DiningSessionValidationError(err.message);
      }
      throw err;
    }

    const ownedRows = await finalizeCheckOutcome(
      {
        checkId: check.id,
        restaurantId: input.restaurantId,
        outcome: input.outcome,
        subtotal: money.subtotal,
        taxAmount: money.taxAmount,
        taxBreakdown: money.taxBreakdown,
        grandTotal: money.grandTotal,
        totalsFrozenAt: now,
        settledAt:
          input.outcome === "paid" || input.outcome === "complimentary"
            ? now
            : null,
        voidedAt: input.outcome === "voided" ? now : null,
      },
      tx
    );

    // HOTFIX: lost Check finalization ownership — abort before any side effects.
    // Canonical idempotent response: CheckTransitionError (same as pre-TX non-open gate).
    if (ownedRows === 0) {
      const current = await findCheckById(check.id, tx);
      throw new CheckTransitionError(
        `Cannot finalize check from outcome ${current?.outcome ?? "unknown"}`
      );
    }

    if (settlementLines) {
      await insertSettlementTransactions(
        {
          restaurantId: input.restaurantId,
          checkId: check.id,
          sessionId: check.sessionId,
          currencyCode: check.currencySnapshot.currencyCode,
          businessTimestamp: now,
          lines: settlementLines,
        },
        tx
      );
    }

    let orderSettlement: CheckOrderSettlementMutationResult = {
      settlements: [],
      events: [],
      outcomes: [],
    };

    if (input.outcome === "paid") {
      orderSettlement = await applyFullSettlementToCheckOrders(
        { restaurantId: input.restaurantId, checkId: check.id },
        tx
      );
    } else if (input.outcome === "complimentary") {
      orderSettlement = await applyComplimentaryToCheckOrders(
        { restaurantId: input.restaurantId, checkId: check.id },
        tx
      );
    } else if (input.outcome === "voided") {
      orderSettlement = await voidOrderSettlementsForCheck(
        { restaurantId: input.restaurantId, checkId: check.id },
        tx
      );
      await deactivateMembershipsOnCheckVoid(
        {
          restaurantId: input.restaurantId,
          checkId: check.id,
        },
        tx
      );
    }

    const settledAt =
      input.outcome === "paid" || input.outcome === "complimentary" ? now : null;

    // SR-INV-04 — Settlement Record in the same Check-owned financial TX.
    // Actor slots: optional adoption from Settlement Context (not Attribution).
    const settlementRecord = await createSettlementRecordForCheckFinalize(
      {
        restaurantId: input.restaurantId,
        check,
        outcome: input.outcome,
        freeze: {
          subtotal: money.subtotal,
          billDiscountAmount: check.billDiscountAmount,
          taxAmount: money.taxAmount,
          taxBreakdown: money.taxBreakdown,
          grandTotal: money.grandTotal,
          settledAt,
        },
        settlementLines,
        orderSettlements: orderSettlement.settlements,
        createdAt: now,
        createdByActorType:
          settlementContext.operatorUserId != null ? "staff_user" : null,
        createdByActorId:
          settlementContext.operatorUserId != null
            ? String(settlementContext.operatorUserId)
            : null,
      },
      tx
    );

    const row = await findCheckById(check.id, tx);
    if (!row) {
      throw new DiningSessionUnavailableError("Check not found after finalize");
    }
    return {
      check: mapRowToOperationalCheck(row),
      orderSettlement,
      orderSettlementEvents: orderSettlement.events,
      settlementRecord,
      settlementRecordEvents: settlementRecord.events,
      settlementContext,
    };
  },
    txStages
  );
  const moneyTxMs = elapsedSinceMs(moneyTxStartedAt);
  const financialTransactionCommittedAt = new Date().toISOString();

  // SETTLEMENT-ATTRIBUTION-ADOPTION-1 — AFTER money+SR commit; fail-open.
  // CASHIER-SETTLEMENT-HTTP-AT-FINANCIAL-COMMIT-1 — Cashier may return before Attribution.
  const postCommitStartedAt = Date.now();
  const attributionStartedAt = Date.now();
  const attributionInput = {
    restaurantId: input.restaurantId,
    outcome: input.outcome,
    settlementContext,
    settlementRecord: financial.settlementRecord.record,
    settlementLines,
    at: now,
  };
  const awaitAttribution = input.awaitAttribution !== false;

  if (!awaitAttribution) {
    void adoptSettlementAttributionAfterFinalize(attributionInput).catch(
      (err: unknown) => {
        opsLog({
          type: OPS_EVENT.check_settlement_attribution_deferred_failed,
          category: "ORDER",
          severity: "warn",
          ts: new Date().toISOString(),
          restaurantId: input.restaurantId,
          action: "adoptSettlementAttributionAfterFinalize",
          metadata: {
            checkId: input.checkId,
            outcome: input.outcome,
            settlementRecordId:
              financial.settlementRecord.record?.settlementRecordId ?? null,
            error: err instanceof Error ? err.message : String(err),
          },
        });
      }
    );
    return {
      ...financial,
      settlementAttribution: skippedAttribution({
        gaps: ["deferred_post_commit"],
        reason:
          "Attribution continues independently after financial commit",
        settlementRecordId:
          financial.settlementRecord.record?.settlementRecordId ?? null,
      }),
      settlementAttributionEvents: [],
      finalizeStageMs: {
        checkReloadMs,
        orderDiscoveryMs,
        contextResolveMs,
        validationMs,
        financialTransactionPreparationMs: txStages.current.preparationMs,
        financialTransactionWriteMs: txStages.current.writeMs,
        financialTransactionTxWallMs: txStages.current.txWallMs,
        moneyTxMs,
        postCommitProcessingMs: elapsedSinceMs(postCommitStartedAt),
        attributionMs: 0,
        financialTransactionStartedAt,
        financialTransactionCommittedAt,
        attributionCompletedAt: null,
      },
    };
  }

  const attributionBundle = await adoptSettlementAttributionAfterFinalize(
    attributionInput
  );
  const attributionMs = elapsedSinceMs(attributionStartedAt);
  const postCommitProcessingMs = elapsedSinceMs(postCommitStartedAt);
  const attributionCompletedAt = new Date().toISOString();

  return {
    ...financial,
    settlementAttribution: attributionBundle.attribution,
    settlementAttributionEvents: attributionBundle.events,
    finalizeStageMs: {
      checkReloadMs,
      orderDiscoveryMs,
      contextResolveMs,
      validationMs,
      financialTransactionPreparationMs: txStages.current.preparationMs,
      financialTransactionWriteMs: txStages.current.writeMs,
      financialTransactionTxWallMs: txStages.current.txWallMs,
      moneyTxMs,
      postCommitProcessingMs,
      attributionMs,
      financialTransactionStartedAt,
      financialTransactionCommittedAt,
      attributionCompletedAt,
    },
  };
}

// ─── M4 Check-centric financial APIs (Session optional) ───────────

/**
 * Recalculate an open Check by id — no Session required.
 */
export async function recalculateOpenCheck(input: {
  restaurantId: number;
  checkId: number;
}): Promise<OperationalCheck | null> {
  try {
    const check = await getCheckById(input);
    if (!check) return null;
    const decision = decideCheckRecalculation(
      check.outcome,
      check.totalsFrozenAt
    );
    if (!decision.allowed) {
      return check;
    }

    await refreshOpenCheckMoneyFromDiscovery({
      restaurantId: input.restaurantId,
      checkId: check.id,
      billDiscountAmount: check.billDiscountAmount,
      taxPolicySnapshot: check.taxPolicySnapshot,
    });
    await recalculateOrderSettlementsForCheck({
      restaurantId: input.restaurantId,
      checkId: check.id,
    });

    const row = await findCheckById(check.id);
    return row ? mapRowToOperationalCheck(row) : check;
  } catch {
    return null;
  }
}

/**
 * Create an open Check with optional Session link.
 * `sessionId: null` → sessionless finance (kiosk/counter path).
 */
export async function createOpenCheck(input: {
  restaurantId: number;
  sessionId: number | null;
}): Promise<OperationalCheck> {
  if (input.sessionId != null) {
    return createOpenCheckForSession({
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
    });
  }

  const { currencySnapshot, taxPolicySnapshot } =
    await captureSnapshotsFromBusinessSettings(input.restaurantId);
  const money = computeCheckMoney({
    chargesSubtotal: "0.00",
    billDiscountAmount: "0.00",
    taxPolicySnapshot,
  });
  const snapshotsFrozenAt = formatDiningSessionTimestamp();

  const checkId = await insertOperationalCheck({
    restaurantId: input.restaurantId,
    sessionId: null,
    currencySnapshot,
    taxPolicySnapshot,
    subtotal: money.subtotal,
    taxAmount: money.taxAmount,
    taxBreakdown: money.taxBreakdown,
    grandTotal: money.grandTotal,
    snapshotsFrozenAt,
  });

  const row = await findCheckById(checkId);
  if (!row) {
    throw new DiningSessionUnavailableError("Check not found after create");
  }
  return mapRowToOperationalCheck(row);
}

/**
 * Ensure an open Check for an Order via Membership (sessionless-capable).
 * Creates a sessionless Check when none exists; enrolls the Order;
 * creates Order Settlement; recalculates — atomically when possible.
 */
export async function ensureCheckForOrder(input: {
  restaurantId: number;
  orderId: number;
}): Promise<OperationalCheck> {
  const blocking = await findBlockingMembershipForOrder(
    input.restaurantId,
    input.orderId
  );

  if (blocking) {
    if (blocking.checkOutcome !== "open") {
      throw new CheckMembershipError(
        `Order ${input.orderId} already enrolled on ${blocking.checkOutcome} Check ${blocking.membership.checkId}`
      );
    }
    const existing = await getCheckById({
      restaurantId: input.restaurantId,
      checkId: blocking.membership.checkId,
    });
    if (!existing) {
      throw new DiningSessionUnavailableError("Check not found for membership");
    }
    return withCheckOwnedTransaction(undefined, async (tx) => {
      await enrollOrderInCheck(
        {
          restaurantId: input.restaurantId,
          checkId: existing.id,
          orderId: input.orderId,
          enrolledReason: "order_place",
        },
        tx
      );
      await ensureOrderSettlementForEnrollment(
        {
          restaurantId: input.restaurantId,
          checkId: existing.id,
          orderId: input.orderId,
        },
        tx
      );
      await refreshOpenCheckMoneyFromDiscovery(
        {
          restaurantId: input.restaurantId,
          checkId: existing.id,
          billDiscountAmount: existing.billDiscountAmount,
          taxPolicySnapshot: existing.taxPolicySnapshot,
        },
        tx
      );
      await recalculateOrderSettlementsForCheck(
        {
          restaurantId: input.restaurantId,
          checkId: existing.id,
        },
        tx
      );
      const row = await findCheckById(existing.id, tx);
      return row ? mapRowToOperationalCheck(row) : existing;
    });
  }

  const created = await createOpenCheck({
    restaurantId: input.restaurantId,
    sessionId: null,
  });

  return withCheckOwnedTransaction(undefined, async (tx) => {
    await enrollOrderInCheck(
      {
        restaurantId: input.restaurantId,
        checkId: created.id,
        orderId: input.orderId,
        enrolledReason: "order_place",
      },
      tx
    );
    await ensureOrderSettlementForEnrollment(
      {
        restaurantId: input.restaurantId,
        checkId: created.id,
        orderId: input.orderId,
      },
      tx
    );
    await refreshOpenCheckMoneyFromDiscovery(
      {
        restaurantId: input.restaurantId,
        checkId: created.id,
        billDiscountAmount: created.billDiscountAmount,
        taxPolicySnapshot: created.taxPolicySnapshot,
      },
      tx
    );
    await recalculateOrderSettlementsForCheck(
      {
        restaurantId: input.restaurantId,
        checkId: created.id,
      },
      tx
    );
    const row = await findCheckById(created.id, tx);
    return row ? mapRowToOperationalCheck(row) : created;
  });
}

export async function settleCheckPaidById(input: {
  restaurantId: number;
  checkId: number;
  settlements?: readonly StaffSettlementLineInput[];
  settlementContext?: SettlementContext;
  settlementContextHints?: SettlementContextHints;
}): Promise<OperationalCheck> {
  const result = await finalizeOpenCheckById({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    outcome: "paid",
    settlements: input.settlements,
    settlementContext: input.settlementContext,
    settlementContextHints: input.settlementContextHints,
  });
  return result.check;
}

/** Same as settleCheckPaidById, exposing collected Order Settlement events. */
export async function settleCheckPaidByIdDetailed(input: {
  restaurantId: number;
  checkId: number;
  settlements?: readonly StaffSettlementLineInput[];
  settlementContext?: SettlementContext;
  settlementContextHints?: SettlementContextHints;
  /** Cashier POS: false. Session/default: omit (await fail-open Attribution). */
  awaitAttribution?: boolean;
}): Promise<CheckFinancialMutationResult> {
  return finalizeOpenCheckById({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    outcome: "paid",
    settlements: input.settlements,
    settlementContext: input.settlementContext,
    settlementContextHints: input.settlementContextHints,
    awaitAttribution: input.awaitAttribution,
  });
}

export async function settleCheckComplimentaryById(input: {
  restaurantId: number;
  checkId: number;
  settlementContext?: SettlementContext;
  settlementContextHints?: SettlementContextHints;
}): Promise<OperationalCheck> {
  const result = await finalizeOpenCheckById({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    outcome: "complimentary",
    settlementContext: input.settlementContext,
    settlementContextHints: input.settlementContextHints,
  });
  return result.check;
}

export async function settleCheckComplimentaryByIdDetailed(input: {
  restaurantId: number;
  checkId: number;
  settlementContext?: SettlementContext;
  settlementContextHints?: SettlementContextHints;
}): Promise<CheckFinancialMutationResult> {
  return finalizeOpenCheckById({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    outcome: "complimentary",
    settlementContext: input.settlementContext,
    settlementContextHints: input.settlementContextHints,
  });
}

export async function voidCheckById(input: {
  restaurantId: number;
  checkId: number;
  settlementContext?: SettlementContext;
  settlementContextHints?: SettlementContextHints;
}): Promise<OperationalCheck> {
  const result = await finalizeOpenCheckById({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    outcome: "voided",
    settlementContext: input.settlementContext,
    settlementContextHints: input.settlementContextHints,
  });
  return result.check;
}

export async function voidCheckByIdDetailed(input: {
  restaurantId: number;
  checkId: number;
  settlementContext?: SettlementContext;
  settlementContextHints?: SettlementContextHints;
}): Promise<CheckFinancialMutationResult> {
  return finalizeOpenCheckById({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    outcome: "voided",
    settlementContext: input.settlementContext,
    settlementContextHints: input.settlementContextHints,
  });
}

/**
 * Cancel Order Settlement for one Order on an open Check (Aggregate command).
 */
export async function cancelOrderSettlementOnCheck(input: {
  restaurantId: number;
  checkId: number;
  orderId: number;
}): Promise<CheckOrderSettlementMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    cancelOrderSettlementForOrder(input, tx)
  );
}

/**
 * BILL-CHARGE-COMPOSITION-IMPLEMENTATION-1 — compensating Charges for a cancelled Order.
 * Does not reopen a terminal Bill. Recalc is the caller's responsibility except
 * sessionless cancel, which has no Session façade.
 */
export async function applyCancelledOrderChargeCompensation(input: {
  restaurantId: number;
  orderId: number;
}): Promise<{ checkId: number | null; compensated: boolean }> {
  const result = await compensateChargesForCancelledOrder(input);
  if (result.compensated && result.checkId != null) {
    await recalculateOpenCheck({
      restaurantId: input.restaurantId,
      checkId: result.checkId,
    });
  }
  return result;
}

/**
 * BILL-CHARGE-COMPOSITION-HARDENING-1 — OPEN-Bill item composition correction.
 * Does not load Orders from Bill calculation.
 * Explicit correction of a terminal Bill throws CheckTransitionError.
 */
export async function applyOpenOrderChargeReconciliation(input: {
  restaurantId: number;
  orderId: number;
}): Promise<{ checkId: number | null; applied: boolean }> {
  const result = await reconcileOpenOrderCharges(input);
  if (result.blocked === "terminal") {
    opsLog({
      type: OPS_EVENT.check_charge_on_terminal_rejected,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      restaurantId: input.restaurantId,
      action: "applyOpenOrderChargeReconciliation",
      metadata: {
        orderId: input.orderId,
        checkId: result.checkId,
      },
    });
    throw new CheckTransitionError(
      `Cannot mutate charges on a terminal check`
    );
  }
  if (result.applied && result.checkId != null) {
    await recalculateOpenCheck({
      restaurantId: input.restaurantId,
      checkId: result.checkId,
    });
  }
  return result;
}

// ─── SPLIT-PAYMENT-INTEGRATION-1 — Aggregate commands ───────────────

export type { CheckSplitPaymentMutationResult };

export async function createSplitPaymentOnCheck(input: {
  restaurantId: number;
  checkId: number;
  paymentId: string;
  paymentReference: string;
  financialReference?: string | null;
  amount: string;
  initialStatus?: "pending" | "authorized" | "captured";
  tenders?: readonly {
    tenderId: string;
    method: TenderMethod;
    amount: string;
  }[];
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    createPaymentOnCheck(input, tx)
  );
}

export async function authorizeSplitPaymentOnCheck(input: {
  restaurantId: number;
  checkId: number;
  paymentId: string;
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    authorizePaymentOnCheck(input, tx)
  );
}

export async function captureSplitPaymentOnCheck(input: {
  restaurantId: number;
  checkId: number;
  paymentId: string;
  tenders?: readonly {
    tenderId: string;
    method: TenderMethod;
    amount: string;
  }[];
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    capturePaymentOnCheck(input, tx)
  );
}

/** Apply / allocate Payment portions → Order Settlement via OS Aggregate path. */
export async function applySplitPaymentOnCheck(input: {
  restaurantId: number;
  checkId: number;
  paymentId: string;
  portions: readonly PaymentPortion[];
  allocationIds: readonly string[];
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    applyPaymentOnCheck(input, tx)
  );
}

export async function allocateSplitPaymentTendersOnCheck(input: {
  restaurantId: number;
  checkId: number;
  paymentId: string;
  allocations: readonly {
    tenderAllocationId: string;
    tenderId: string;
    amount: string;
  }[];
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    allocateTendersOnCheck(input, tx)
  );
}

export async function failSplitPaymentOnCheck(input: {
  restaurantId: number;
  checkId: number;
  paymentId: string;
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    failPaymentOnCheck(input, tx)
  );
}

export async function cancelSplitPaymentOnCheck(input: {
  restaurantId: number;
  checkId: number;
  paymentId: string;
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    cancelPaymentOnCheck(input, tx)
  );
}

export async function voidSplitPaymentOnCheck(input: {
  restaurantId: number;
  checkId: number;
  paymentId: string;
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    voidPaymentOnCheck(input, tx)
  );
}

export async function refundSplitPaymentOnCheck(input: {
  restaurantId: number;
  checkId: number;
  paymentId: string;
  refundedAmount?: string;
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    refundPaymentOnCheck(input, tx)
  );
}

export async function startSplitPaymentAttemptOnCheck(input: {
  restaurantId: number;
  checkId: number;
  attemptId: string;
  amount: string;
  method: TenderMethod;
  paymentId?: string | null;
  externalProviderReference?: string | null;
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    startPaymentAttemptOnCheck(input, tx)
  );
}

export async function succeedSplitPaymentAttemptOnCheck(input: {
  restaurantId: number;
  checkId: number;
  attemptId: string;
  paymentId: string;
  externalProviderReference?: string | null;
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    succeedPaymentAttemptOnCheck(input, tx)
  );
}

export async function failSplitPaymentAttemptOnCheck(input: {
  restaurantId: number;
  checkId: number;
  attemptId: string;
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    failPaymentAttemptOnCheck(input, tx)
  );
}

export async function cancelSplitPaymentAttemptOnCheck(input: {
  restaurantId: number;
  checkId: number;
  attemptId: string;
}): Promise<CheckSplitPaymentMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    cancelPaymentAttemptOnCheck(input, tx)
  );
}

export async function getSplitPaymentsForCheck(input: {
  restaurantId: number;
  checkId: number;
}) {
  return loadSplitPaymentsForCheck(input);
}

export async function getSplitPaymentAttemptsForCheck(input: {
  restaurantId: number;
  checkId: number;
}) {
  return loadPaymentAttemptsForCheck(input);
}

export async function getCheckOutstandingBalance(input: {
  restaurantId: number;
  checkId: number;
}) {
  return loadCheckOutstanding(input);
}

// ─── MULTI-CHECK-ALLOCATION-INTEGRATION-1 — Aggregate commands ─────

export type { CheckMultiCheckAllocationMutationResult };

export async function createMultiCheckAllocationOnCheck(input: {
  restaurantId: number;
  checkId: number;
  allocationId: string;
  allocationReference: string;
  financialReference?: string | null;
  sourceCheckId?: number;
  sourcePaymentId?: string | null;
  financialResponsibility: string;
  paymentValueCap?: string | null;
  portions: readonly CreateAllocationPortionInput[];
  sources?: readonly CreateAllocationSourceInput[];
  allocationReason?: string | null;
}): Promise<CheckMultiCheckAllocationMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    createAllocationOnCheck(input, tx)
  );
}

export async function reserveMultiCheckAllocationOnCheck(input: {
  restaurantId: number;
  checkId: number;
  allocationId: string;
  allocationReason?: string | null;
}): Promise<CheckMultiCheckAllocationMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    reserveAllocationOnCheck(input, tx)
  );
}

export async function applyMultiCheckAllocationOnCheck(input: {
  restaurantId: number;
  checkId: number;
  allocationId: string;
  allocationReason?: string | null;
}): Promise<CheckMultiCheckAllocationMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    applyAllocationOnCheck(input, tx)
  );
}

export async function adjustMultiCheckAllocationOnCheck(input: {
  restaurantId: number;
  checkId: number;
  allocationId: string;
  adjustmentId: string;
  amount: string;
  direction: "increase" | "decrease";
  portionId?: string | null;
  allocationReason?: string | null;
}): Promise<CheckMultiCheckAllocationMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    adjustAllocationOnCheck(input, tx)
  );
}

export async function reverseMultiCheckAllocationOnCheck(input: {
  restaurantId: number;
  checkId: number;
  allocationId: string;
  reversalId: string;
  allocationReason?: string | null;
}): Promise<CheckMultiCheckAllocationMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    reverseAllocationOnCheck(input, tx)
  );
}

export async function completeMultiCheckAllocationOnCheck(input: {
  restaurantId: number;
  checkId: number;
  allocationId: string;
  allocationReason?: string | null;
}): Promise<CheckMultiCheckAllocationMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    completeAllocationOnCheck(input, tx)
  );
}

export async function cancelMultiCheckAllocationOnCheck(input: {
  restaurantId: number;
  checkId: number;
  allocationId: string;
  allocationReason?: string | null;
}): Promise<CheckMultiCheckAllocationMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    cancelAllocationOnCheck(input, tx)
  );
}

export async function getMultiCheckAllocationsForSourceCheck(input: {
  restaurantId: number;
  sourceCheckId: number;
}) {
  return loadAllocationsForSourceCheck(input);
}

export async function getMultiCheckAllocationByIdentity(input: {
  restaurantId: number;
  allocationId: string;
}) {
  return loadAllocationByIdentity(input);
}

/**
 * Apply partial Order Settlement coverage (Aggregate command).
 */
export async function applyPartialOrderSettlementOnCheck(input: {
  restaurantId: number;
  checkId: number;
  orderId: number;
  coverageAmount: string;
}): Promise<CheckOrderSettlementMutationResult> {
  const check = await getCheckById({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
  });
  if (!check) {
    throw new DiningSessionUnavailableError("Check not found");
  }
  if (check.outcome !== "open") {
    throw new CheckTransitionError(
      `Cannot partially settle Order Settlement on ${check.outcome} Check`
    );
  }
  return withCheckOwnedTransaction(undefined, async (tx) =>
    applyPartialSettlementForOrder(input, tx)
  );
}

/**
 * Refund all Order Settlements on a Check (Aggregate command).
 * Check outcome is not mutated here — reserved for future Check refund workflow.
 */
export async function refundOrderSettlementsOnCheck(input: {
  restaurantId: number;
  checkId: number;
}): Promise<CheckOrderSettlementMutationResult> {
  return withCheckOwnedTransaction(undefined, async (tx) =>
    refundOrderSettlementsForCheck(input, tx)
  );
}

/**
 * ADR-ARCH-032 / REFUND-REGISTER-ADOPTION-1 —
 * Apply Refund under Check Aggregate (sole monetary authority), then
 * post-commit AttributeRefund to Register/Shift (custody only, fail-open).
 * Register never executes Refund. Never rolls back financial TX on attribution failure.
 */
export async function applyRefundOnCheck(input: {
  restaurantId: number;
  checkId: number;
  amount: string;
  reason?: string | null;
  allocations?: readonly {
    orderId: number | null;
    amount: string;
    tenderMethod: string | null;
  }[];
  tenderMethod?: string;
  refundId?: string;
  settlementContext?: SettlementContext;
  settlementContextHints?: SettlementContextHints;
}): Promise<
  CheckRefundMutationResult & {
    settlementContext: SettlementContext;
    settlementAttribution: SettlementAttributionAdoptionResult;
    settlementAttributionEvents: readonly SettlementAttributed[];
  }
> {
  const at = formatDiningSessionTimestamp();
  const hints = input.settlementContextHints ?? {};
  const settlementContext =
    input.settlementContext ??
    (await resolveSettlementContextForSettle({
      restaurantId: input.restaurantId,
      ...hints,
      at,
    }).catch(() =>
      unavailableSettlementContext(input.restaurantId, at, [
        "crmp_resolution_error",
      ])
    ));

  const financial = await withCheckOwnedTransaction(undefined, async (tx) =>
    applyRefundOnCheckIntegration(input, tx)
  );

  const attributionBundle = await adoptRefundAttributionAfterFinalize({
    restaurantId: input.restaurantId,
    settlementContext,
    settlementRecord: financial.settlementRecord,
    at,
  });

  return {
    ...financial,
    settlementContext,
    settlementAttribution: attributionBundle.attribution,
    settlementAttributionEvents: attributionBundle.events,
  };
}

export async function getCheckRefundBudget(input: {
  restaurantId: number;
  checkId: number;
}): Promise<{
  settledValue: string;
  appliedRefundTotal: string;
  refundableBalance: string;
  priorSettlementRecordId: string;
  nextRecordGeneration: number;
}> {
  return getRefundBudgetForCheck(input);
}

export type { CheckRefundMutationResult };

export async function getCheckById(input: {
  restaurantId: number;
  checkId: number;
}): Promise<OperationalCheck | null> {
  const row = await findCheckById(input.checkId);
  if (!row || row.restaurantId !== input.restaurantId) return null;
  return mapRowToOperationalCheck(row);
}

export async function getActiveCheckForSession(input: {
  restaurantId: number;
  sessionId: number;
}): Promise<OperationalCheck | null> {
  const session = await findSessionById(input.sessionId);
  if (!session || session.restaurantId !== input.restaurantId) return null;
  if (session.activeCheckId != null) {
    const byId = await findCheckById(session.activeCheckId);
    if (byId) return mapRowToOperationalCheck(byId);
  }
  const open = await findOpenCheckBySessionId(
    input.restaurantId,
    input.sessionId
  );
  return open ? mapRowToOperationalCheck(open) : null;
}
