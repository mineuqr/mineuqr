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
 * BILL-SIMPLIFICATION-1 — Bill obligation + Charge money + lifecycle; collection facts stay ST.
 * Owned by Operational Session Platform. Does not modify Order Domain.
 */

import {
  getDb,
  getOrderById,
  getRestaurantById,
} from "../../db";
import { isCashierFinalizableOrderingChannel, isComplimentaryCollectionFact } from "@shared/pos";
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
import { CheckOrderNotFoundError } from "./checkRecoveryErrors";
import {
  businessTaxSettingsFromRestaurantRow,
  captureCurrencySnapshot,
  captureTaxPolicySnapshot,
  complimentarySettlementLine,
  computeCheckMoney,
  decideCheckRecalculation,
  defaultPaidSettlementLine,
  billAmountDueFromCollection,
  resolveStaffSettlementLines,
  SettlementValidationError,
  ConcurrentRefundGenerationError,
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
  listActiveOrderIdsForCheck,
} from "./checkOrderMembershipRepository";
import {
  ensureOpenCheckChargeComposition,
  ensureOpenCheckChargesSubtotal,
  loadChargesSubtotal,
  compensateChargesForCancelledOrder,
  reconcileOpenOrderCharges,
} from "./checkChargeComposition";
import { listCheckCharges } from "./checkChargeRepository";
import { freezeBusinessDayFromTimestamp } from "@shared/operational-session/check/settlementRecord/settlementRecordSnapshot";
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
import { dispatchComplianceAfterProductionCollectionFact } from "../../compliance/dispatchComplianceAfterProductionCollectionFact";
import { dispatchBestEffortDownstreamDelivery } from "../payment/dispatchBestEffortDownstreamDelivery";
import { buildCashierPaidReceiptProjection } from "../payment/cashierPaidReceiptProjection";
import type { CashierPaidReceiptProjection } from "../payment/cashierPaidReceiptProjection";
import {
  CASHIER_CONFIRM_UNASSIGNED_CHECK_ID,
  freezeCashierPosPayableFromOrder,
} from "../payment/cashierPosOrderFreeze";
import { findProductionCollectionFactByOrderId } from "../payment/collection-fact/collectionFactRepository";
import {
  createEmptyChargeInsertTiming,
  createEmptyEnsureCheckForOrderStageMs,
  ensureCheckForOrderStageMetadata,
  finishEnsureCheckForOrderStages,
  type EnsureCheckForOrderStageMs,
} from "./ensureCheckForOrderStageMs";
import {
  adoptRefundAttributionAfterFinalize,
  adoptSettlementAttributionAfterFinalize,
  type CollectionFactAttributionInput,
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
/**
 * PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1
 * Confirm payable freeze (Order items + computeCheckMoney) mapped onto CF commit.
 * Not current paid-sale Settlement authority. Check does not persist Collection Facts.
 */
export type CashierAuthoritativePaidFreeze = Readonly<{
  restaurantId: number;
  checkId: number | null;
  orderId: number;
  orderingChannel: string;
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  currencySnapshot: OperationalCheck["currencySnapshot"];
  taxPolicySnapshot: OperationalCheck["taxPolicySnapshot"];
  taxBreakdown: OperationalCheck["taxBreakdown"];
  businessDay: string;
  tenders: readonly { paymentMethod: string; amount: string }[];
  composition: readonly {
    sequence: number;
    description: string;
    netAmount: string;
    taxAmount: string;
    originOrderId: number | null;
  }[];
}>;

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
  /**
   * PAYMENT-CONFIRM-CRITICAL-PATH-TRIM-1
   * True when Confirm reused a pre-resolved SettlementContext (no second CRMP).
   */
  settlementContextReused: boolean;
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
  /** Cashier Confirm display projection. Not financial authority. */
  paidReceipt?: CashierPaidReceiptProjection | null;
}>;

function elapsedSinceMs(startedAt: number): number {
  return Date.now() - startedAt;
}

function resolvePaidCollectionLines(input: {
  grandTotal: string;
  collection: readonly {
    amount: string;
    status: string;
    paymentMethod: string;
  }[];
  settlements?: readonly StaffSettlementLineInput[];
}): readonly SettlementTransactionInput[] {
  const { amountDue, captured } = billAmountDueFromCollection(
    input.grandTotal,
    input.collection
  );
  if (captured.length > 0 && amountDue === "0.00") {
    throw new SettlementValidationError("Bill is already fully collected");
  }
  return input.settlements?.length
    ? resolveStaffSettlementLines(amountDue, input.settlements)
    : [defaultPaidSettlementLine(amountDue)];
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
 * Operational Check row only. Not current paid-sale Settlement / Drawer / Report authority.
 */
async function refreshOpenCheckMoneyFromDiscovery(
  input: {
    restaurantId: number;
    checkId: number;
    billDiscountAmount: string;
    taxPolicySnapshot: OperationalCheck["taxPolicySnapshot"];
  },
  client?: SessionDbClient,
  stages?: EnsureCheckForOrderStageMs
): Promise<void> {
  const listEnsureStartedAt = Date.now();
  await ensureOpenCheckChargeComposition(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
    },
    client
  );
  if (stages) stages.chargeListEnsureMs = elapsedSinceMs(listEnsureStartedAt);
  const listSumStartedAt = Date.now();
  const chargesSubtotal = await loadChargesSubtotal(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
    },
    client
  );
  if (stages) stages.chargeListSumMs = elapsedSinceMs(listSumStartedAt);
  const computeStartedAt = Date.now();
  const money = computeCheckMoney({
    chargesSubtotal,
    billDiscountAmount: input.billDiscountAmount,
    taxPolicySnapshot: input.taxPolicySnapshot,
  });
  if (stages) stages.computeCheckMoneyMs = elapsedSinceMs(computeStartedAt);
  const persistStartedAt = Date.now();
  await updateCheckMoney(
    {
      checkId: input.checkId,
      restaurantId: input.restaurantId,
      subtotal: money.subtotal,
      taxAmount: money.taxAmount,
      taxBreakdown: money.taxBreakdown,
      grandTotal: money.grandTotal,
      billDiscountAmount: input.billDiscountAmount,
    },
    client
  );
  if (stages) stages.checkMoneyPersistMs = elapsedSinceMs(persistStartedAt);
}

async function enrollRefreshAndReloadCheck(
  input: {
    restaurantId: number;
    checkId: number;
    orderId: number;
    billDiscountAmount: string;
    taxPolicySnapshot: OperationalCheck["taxPolicySnapshot"];
    fallback: OperationalCheck;
  },
  tx: SessionDbClient,
  stages: EnsureCheckForOrderStageMs
): Promise<OperationalCheck> {
  const chargeInsertTiming = createEmptyChargeInsertTiming();
  const enrollStartedAt = Date.now();
  await enrollOrderInCheck(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      orderId: input.orderId,
      enrolledReason: "order_place",
    },
    tx,
    chargeInsertTiming
  );
  stages.enrollMs = elapsedSinceMs(enrollStartedAt);
  stages.chargeCreateMs = chargeInsertTiming.createMs;
  stages.chargeInsertCount = chargeInsertTiming.count;
  stages.chargeInsertMs = chargeInsertTiming.insertMs;
  stages.chargeInsertMaxMs = chargeInsertTiming.maxInsertMs;

  const orderSettlementInsertStartedAt = Date.now();
  await ensureOrderSettlementForEnrollment(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      orderId: input.orderId,
    },
    tx
  );
  stages.orderSettlementInsertMs = elapsedSinceMs(orderSettlementInsertStartedAt);

  await refreshOpenCheckMoneyFromDiscovery(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      billDiscountAmount: input.billDiscountAmount,
      taxPolicySnapshot: input.taxPolicySnapshot,
    },
    tx,
    stages
  );

  const orderSettlementRecalcStartedAt = Date.now();
  await recalculateOrderSettlementsForCheck(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
    },
    tx
  );
  stages.orderSettlementRecalcMs = elapsedSinceMs(
    orderSettlementRecalcStartedAt
  );

  const checkReloadStartedAt = Date.now();
  const row = await findCheckById(input.checkId, tx);
  stages.checkReloadMs = elapsedSinceMs(checkReloadStartedAt);
  return row ? mapRowToOperationalCheck(row) : input.fallback;
}

function applyOwnedTransactionStages(
  stages: EnsureCheckForOrderStageMs,
  txStages: { current: CheckOwnedTransactionStageMs }
): void {
  stages.txPreparationMs = txStages.current.preparationMs;
  stages.txWriteMs = txStages.current.writeMs;
  stages.txWallMs = txStages.current.txWallMs;
}

function emitEnsureCheckForOrderStages(input: {
  restaurantId: number;
  orderId: number;
  checkId: number;
  terminalId?: string;
  stages: EnsureCheckForOrderStageMs;
}): void {
  opsLog({
    type: OPS_EVENT.check_ensure_for_order,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    restaurantId: input.restaurantId,
    action: "ensureCheckForOrder",
    metadata: {
      restaurantId: input.restaurantId,
      orderId: input.orderId,
      checkId: input.checkId,
      terminalId: input.terminalId ?? null,
      ...ensureCheckForOrderStageMetadata(input.stages),
    },
  });
}

export type BusinessSettingsRestaurantRow = {
  id?: number;
  currencyCode?: string | null;
  currencySymbol?: string | null;
  taxEnabled?: boolean;
  taxMode?: string;
  taxPolicyJson?: string | null;
};

function isReusableBusinessSettingsRestaurant(
  restaurantId: number,
  restaurantRow: BusinessSettingsRestaurantRow | null | undefined
): restaurantRow is BusinessSettingsRestaurantRow {
  return (
    restaurantRow != null &&
    (restaurantRow.id == null || restaurantRow.id === restaurantId)
  );
}

export async function captureSnapshotsFromBusinessSettings(
  restaurantId: number,
  restaurantRow?: BusinessSettingsRestaurantRow | null
) {
  const restaurant = isReusableBusinessSettingsRestaurant(
    restaurantId,
    restaurantRow
  )
    ? restaurantRow
    : await getRestaurantById(restaurantId);
  if (!restaurant) {
    throw new DiningSessionValidationError("Restaurant not found");
  }
  const settings = businessTaxSettingsFromRestaurantRow({
    currencyCode: restaurant.currencyCode ?? null,
    currencySymbol: restaurant.currencySymbol ?? null,
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
 *
 * `skipEmptyBillPreparation` is for a brand-new Session that cannot yet have
 * Orders: persist the Open Check row + `activeCheckId` only. Empty membership
 * sync / charge ensure / money refresh / Order Settlement recalc run later on
 * first Order enroll (`incrementSessionAggregatesForOrder`). Do not set this
 * when the Session may already have Orders (legacy `activeCheckId` backfill).
 *
 * `newSessionInSameTransaction` skips Session/open-Check lookups that the
 * caller already proved by inserting the Session in this transaction.
 */
export async function createOpenCheckForSession(
  input: {
    restaurantId: number;
    sessionId: number;
    skipEmptyBillPreparation?: boolean;
    newSessionInSameTransaction?: boolean;
    restaurantRow?: BusinessSettingsRestaurantRow | null;
  },
  client?: SessionDbClient
): Promise<OperationalCheck> {
  const skipProvenLookups =
    input.skipEmptyBillPreparation === true &&
    input.newSessionInSameTransaction === true;

  if (!skipProvenLookups) {
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
  }

  const { currencySnapshot, taxPolicySnapshot } =
    await captureSnapshotsFromBusinessSettings(
      input.restaurantId,
      input.restaurantRow
    );
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

  if (input.skipEmptyBillPreparation === true) {
    // First Order enroll + `recalculateCheckMoneyForSession` is the legitimate
    // trigger for membership/charge/OS work. Empty Check bill prep must not
    // block QR `order.create`.
    return {
      id: checkId,
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      outcome: "open",
      currencySnapshot,
      taxPolicySnapshot,
      serviceChargeSnapshot: null,
      billDiscountAmount: "0.00",
      subtotal: money.subtotal,
      taxAmount: money.taxAmount,
      taxBreakdown: money.taxBreakdown,
      grandTotal: money.grandTotal,
      snapshotsFrozenAt,
      totalsFrozenAt: null,
      settledAt: null,
      voidedAt: null,
      createdAt: snapshotsFrozenAt,
      updatedAt: snapshotsFrozenAt,
    };
  }

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
    /**
     * PRODUCTION-COLLECTION-FACT-CASHIER-ADOPTION-1
     * Cashier Confirm supplies this after money freeze, before ST/OS/SR writes.
     * Uses a separate Collection Fact persistence connection so downstream
     * rollback cannot delete a committed fact.
     */
    productionCollectionCommit?: (
      freeze: CashierAuthoritativePaidFreeze
    ) => Promise<{ fact: CollectionFactAttributionInput } | void>;
    /**
     * CASHIER-COLLECTION-FACT-CRITICAL-PATH-DECOUPLING-1
     * Cashier HTTP returns after Collection Fact. Check PAID / ST / OS / SR
     * are operational/historical and must not block financial success.
     * Requires productionCollectionCommit. Session/kiosk omit this flag.
     */
    deferOperationalSettlementAfterCollectionFact?: boolean;
    economicOrderId?: number;
    economicOrderingChannel?: string;
  },
  client?: SessionDbClient
): Promise<CheckFinancialMutationResult> {
  const checkReloadStartedAt = Date.now();
  const checkRow = client
    ? await findCheckById(input.checkId, client)
    : await findCheckById(input.checkId);
  const check =
    checkRow && checkRow.restaurantId === input.restaurantId
      ? mapRowToOperationalCheck(checkRow)
      : null;
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

  let membershipOrderIds: number[] = [];
  if (input.outcome === "paid" || input.outcome === "complimentary") {
    const orderIds =
      (await listActiveOrderIdsForCheck(
        input.restaurantId,
        input.checkId,
        client
      )) ?? [];
    membershipOrderIds = orderIds;
    for (const orderId of orderIds) {
      const order = await getOrderById(orderId, client);
      if (!order) {
        throw new DiningSessionValidationError(
          "Financial settlement requires Cashier Confirm"
        );
      }
      if (!isCashierFinalizableOrderingChannel(order.orderingChannel)) {
        continue;
      }
      const fact = await findProductionCollectionFactByOrderId({
        restaurantId: input.restaurantId,
        orderId,
      });
      if (!fact) {
        throw new DiningSessionValidationError(
          "Financial settlement requires Cashier Confirm"
        );
      }
    }
  }

  const orderDiscoveryStartedAt = Date.now();
  const chargesSubtotal = client
    ? await ensureOpenCheckChargesSubtotal(
        {
          restaurantId: input.restaurantId,
          checkId: check.id,
        },
        client
      )
    : await ensureOpenCheckChargesSubtotal({
        restaurantId: input.restaurantId,
        checkId: check.id,
      });
  const orderDiscoveryMs = elapsedSinceMs(orderDiscoveryStartedAt);
  // Operational Check freeze + collection-line validation. SR money uses Order CF when unique.
  let money = computeCheckMoney({
    chargesSubtotal,
    billDiscountAmount: check.billDiscountAmount,
    taxPolicySnapshot: check.taxPolicySnapshot,
  });
  const now = formatDiningSessionTimestamp();

  // SETTLEMENT-CONTEXT-ADOPTION-1 — resolve outside money TX; fail-open.
  // PAYMENT-CONFIRM-CRITICAL-PATH-TRIM-1 — reuse caller context when present.
  // No hints → unavailable without fabricating or querying CRMP.
  const hints = input.settlementContextHints ?? {};
  const hasOperationalHints = Boolean(
    hints.registerId ||
      hints.deviceId ||
      hints.operatorUserId ||
      hints.operationalScreenId
  );
  const contextResolveStartedAt = Date.now();
  const settlementContextReused = input.settlementContext != null;
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
      const existingCollection = client
        ? await listSettlementTransactionsForCheck(
            {
              restaurantId: input.restaurantId,
              checkId: check.id,
            },
            client
          )
        : await listSettlementTransactionsForCheck({
            restaurantId: input.restaurantId,
            checkId: check.id,
          });
      settlementLines = resolvePaidCollectionLines({
        grandTotal: money.grandTotal,
        collection: existingCollection,
        settlements: input.settlements,
      });
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
    try {
      if (input.outcome === "paid") {
        settlementLines = resolvePaidCollectionLines({
          grandTotal: money.grandTotal,
          collection: existingCollection,
          settlements: input.settlements,
        });
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

    if (input.deferOperationalSettlementAfterCollectionFact) {
      if (!input.productionCollectionCommit) {
        throw new DiningSessionValidationError(
          "Cashier operational defer requires Collection Fact commit"
        );
      }
      // This is the final operational snapshot preparation. It occurs before
      // the financial fact so a post-commit Check write can never reject PAID.
      await updateCheckMoney(
        {
          checkId: check.id,
          restaurantId: input.restaurantId,
          subtotal: money.subtotal,
          taxAmount: money.taxAmount,
          taxBreakdown: money.taxBreakdown,
          grandTotal: money.grandTotal,
          billDiscountAmount: check.billDiscountAmount,
        },
        tx
      );
    }

    if (input.productionCollectionCommit) {
      if (input.outcome !== "paid" || !settlementLines) {
        throw new DiningSessionValidationError(
          "Production Collection Fact requires a paid collection freeze"
        );
      }
      if (
        input.economicOrderId == null ||
        !input.economicOrderingChannel
      ) {
        throw new DiningSessionValidationError(
          "Production Collection Fact requires economic sale identity"
        );
      }
      const charges = await listCheckCharges(
        {
          restaurantId: input.restaurantId,
          checkId: check.id,
        },
        tx
      );
      await input.productionCollectionCommit({
        restaurantId: input.restaurantId,
        checkId: check.id,
        orderId: input.economicOrderId,
        orderingChannel: input.economicOrderingChannel,
        subtotal: money.subtotal,
        discountAmount: check.billDiscountAmount,
        taxAmount: money.taxAmount,
        grandTotal: money.grandTotal,
        currencySnapshot: check.currencySnapshot,
        taxPolicySnapshot: check.taxPolicySnapshot,
        taxBreakdown: money.taxBreakdown,
        businessDay: freezeBusinessDayFromTimestamp(now),
        tenders: settlementLines.map((line) => ({
          paymentMethod: line.paymentMethod,
          amount: line.amount,
        })),
        composition: charges.map((charge) => ({
          sequence: charge.sequence,
          description: charge.description,
          netAmount: charge.netAmount,
          taxAmount: charge.taxAmount,
          originOrderId: charge.originOrderId,
        })),
      });
    }

    if (input.deferOperationalSettlementAfterCollectionFact) {
      return {
        check: {
          ...check,
          subtotal: money.subtotal,
          taxAmount: money.taxAmount,
          taxBreakdown: money.taxBreakdown,
          grandTotal: money.grandTotal,
          billDiscountAmount: check.billDiscountAmount,
        },
        orderSettlement: {
          settlements: [],
          events: [],
          outcomes: [],
        },
        orderSettlementEvents: [],
        settlementRecord: {
          record: null,
          events: [],
          outcome: "skipped" as const,
        },
        settlementRecordEvents: [],
        settlementContext,
      };
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
  // When an outer client is supplied, this function does not own COMMIT.
  // Do not publish Attribution against an uncommitted financial outcome.
  const postCommitStartedAt = Date.now();
  const attributionStartedAt = Date.now();
  const attributionInput = {
    restaurantId: input.restaurantId,
    outcome: input.outcome,
    settlementContext,
    settlementRecord: financial.settlementRecord.record,
    settlementLines,
    at: now,
    checkId: input.checkId,
    orderIds: membershipOrderIds,
  };
  const ownsCommit = client == null;
  if (!ownsCommit) {
    return {
      ...financial,
      settlementAttribution: skippedAttribution({
        gaps: ["deferred_post_commit"],
        reason: "Outer Check-owned transaction has not committed",
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
        settlementContextReused,
      },
    };
  }
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
        settlementContextReused,
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
      settlementContextReused,
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
 * Optional `client` joins the INSERT to a Check-owned transaction (ADR-038).
 */
export async function createOpenCheck(input: {
  restaurantId: number;
  sessionId: number | null;
  billDiscountAmount?: string;
  stageMs?: EnsureCheckForOrderStageMs;
  client?: SessionDbClient;
  snapshots?: {
    currencySnapshot: OperationalCheck["currencySnapshot"];
    taxPolicySnapshot: OperationalCheck["taxPolicySnapshot"];
  };
}): Promise<OperationalCheck> {
  if (input.sessionId != null) {
    return createOpenCheckForSession({
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
    });
  }

  const billDiscountAmount = input.billDiscountAmount ?? "0.00";
  const snapshotStartedAt = Date.now();
  const { currencySnapshot, taxPolicySnapshot } =
    input.snapshots ??
    (await captureSnapshotsFromBusinessSettings(input.restaurantId));
  if (input.stageMs) {
    input.stageMs.taxSnapshotMs = elapsedSinceMs(snapshotStartedAt);
  }
  const seedComputeStartedAt = Date.now();
  const money = computeCheckMoney({
    chargesSubtotal: "0.00",
    billDiscountAmount,
    taxPolicySnapshot,
  });
  if (input.stageMs) {
    input.stageMs.computeCheckMoneySeedMs = elapsedSinceMs(seedComputeStartedAt);
  }
  const snapshotsFrozenAt = formatDiningSessionTimestamp();

  const insertStartedAt = Date.now();
  const checkId = input.client
    ? await insertOperationalCheck(
        {
          restaurantId: input.restaurantId,
          sessionId: null,
          currencySnapshot,
          taxPolicySnapshot,
          billDiscountAmount,
          subtotal: money.subtotal,
          taxAmount: money.taxAmount,
          taxBreakdown: money.taxBreakdown,
          grandTotal: money.grandTotal,
          snapshotsFrozenAt,
        },
        input.client
      )
    : await insertOperationalCheck({
        restaurantId: input.restaurantId,
        sessionId: null,
        currencySnapshot,
        taxPolicySnapshot,
        billDiscountAmount,
        subtotal: money.subtotal,
        taxAmount: money.taxAmount,
        taxBreakdown: money.taxBreakdown,
        grandTotal: money.grandTotal,
        snapshotsFrozenAt,
      });
  if (input.stageMs) {
    input.stageMs.checkInsertMs = elapsedSinceMs(insertStartedAt);
  }

  const row = input.client
    ? await findCheckById(checkId, input.client)
    : await findCheckById(checkId);
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
  billDiscountAmount?: string;
  /** Observability collector. POS Check Intake owns the pos_check_intake event. */
  stageMs?: EnsureCheckForOrderStageMs;
  terminalId?: string;
}): Promise<OperationalCheck> {
  const stages = input.stageMs ?? createEmptyEnsureCheckForOrderStageMs();
  const startedAt = Date.now();
  const txStages: { current: CheckOwnedTransactionStageMs } = {
    current: { preparationMs: 0, writeMs: 0, txWallMs: null },
  };

  const membershipStartedAt = Date.now();
  const blocking = await findBlockingMembershipForOrder(
    input.restaurantId,
    input.orderId
  );
  stages.membershipLookupMs = elapsedSinceMs(membershipStartedAt);

  let check: OperationalCheck;
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
    stages.checkCreated = false;
    check = await withCheckOwnedTransaction(
      undefined,
      async (tx) =>
        enrollRefreshAndReloadCheck(
          {
            restaurantId: input.restaurantId,
            checkId: existing.id,
            orderId: input.orderId,
            billDiscountAmount:
              input.billDiscountAmount ?? existing.billDiscountAmount,
            taxPolicySnapshot: existing.taxPolicySnapshot,
            fallback: existing,
          },
          tx,
          stages
        ),
      txStages
    );
  } else {
    stages.checkCreated = true;
    const createStartedAt = Date.now();
    const created = await createOpenCheck({
      restaurantId: input.restaurantId,
      sessionId: null,
      billDiscountAmount: input.billDiscountAmount,
      stageMs: stages,
    });
    stages.createOpenCheckMs = elapsedSinceMs(createStartedAt);
    check = await withCheckOwnedTransaction(
      undefined,
      async (tx) =>
        enrollRefreshAndReloadCheck(
          {
            restaurantId: input.restaurantId,
            checkId: created.id,
            orderId: input.orderId,
            billDiscountAmount: created.billDiscountAmount,
            taxPolicySnapshot: created.taxPolicySnapshot,
            fallback: created,
          },
          tx,
          stages
        ),
      txStages
    );
  }

  applyOwnedTransactionStages(stages, txStages);
  finishEnsureCheckForOrderStages(stages, elapsedSinceMs(startedAt));
  emitEnsureCheckForOrderStages({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
    checkId: check.id,
    terminalId: input.terminalId,
    stages,
  });
  return check;
}

/**
 * Check implementation/test paid-finalize wrapper. Not a public Confirm API.
 * PAYMENT-CONFIRM-COMPATIBILITY-CLEANUP-1 — application Confirm MUST enter
 * confirmPayment. This export is not re-exported from public barrels.
 */
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

export type CashierPosSaleCheckLine = Readonly<{
  description: string;
  quantity: number;
  netAmount: string;
  originOrderItemId: number | null;
}>;

export type CashierPosSaleOpenCheck = Readonly<{
  check: OperationalCheck;
  lines: readonly CashierPosSaleCheckLine[];
}>;

/**
 * SELF-ORDER-CHECK-IN-ORDER-TRANSACTION-HARDENING-1 —
 * Sessionless Check + membership on the caller's Order persist transaction.
 * Requires the transaction client. Does not open getDb().
 * sessionId remains null. Does not create a Dining Session.
 * Not a payment API.
 */
export async function ensureSessionlessCheckForOrderInTransaction(
  input: {
    restaurantId: number;
    orderId: number;
    billDiscountAmount?: string;
  },
  tx: SessionDbClient
): Promise<OperationalCheck> {
  if (tx == null) {
    throw new DiningSessionUnavailableError(
      "Sessionless Check enrollment requires the Order transaction client"
    );
  }
  const stages = createEmptyEnsureCheckForOrderStageMs();
  stages.checkCreated = true;
  const created = await createOpenCheck({
    restaurantId: input.restaurantId,
    sessionId: null,
    billDiscountAmount: input.billDiscountAmount,
    client: tx,
    stageMs: stages,
  });
  return enrollRefreshAndReloadCheck(
    {
      restaurantId: input.restaurantId,
      checkId: created.id,
      orderId: input.orderId,
      billDiscountAmount: created.billDiscountAmount,
      taxPolicySnapshot: created.taxPolicySnapshot,
      fallback: created,
    },
    tx,
    stages
  );
}

/**
 * CASHIER-REBUILD-1 Stage 1 — OPEN Check on the Order persist transaction.
 * Requires the caller's transaction client. Does not open getDb().
 * Not a payment API. Payment must never call this.
 */
export async function createAndEnrollCashierPosOpenCheckInTransaction(
  input: {
    restaurantId: number;
    orderId: number;
    billDiscountAmount?: string;
    snapshots: {
      currencySnapshot: OperationalCheck["currencySnapshot"];
      taxPolicySnapshot: OperationalCheck["taxPolicySnapshot"];
    };
  },
  tx: SessionDbClient
): Promise<CashierPosSaleOpenCheck> {
  if (tx == null) {
    throw new DiningSessionUnavailableError(
      "Cashier OPEN Check enrollment requires the Order transaction client"
    );
  }
  const stages = createEmptyEnsureCheckForOrderStageMs();
  stages.checkCreated = true;
  const created = await createOpenCheck({
    restaurantId: input.restaurantId,
    sessionId: null,
    billDiscountAmount: input.billDiscountAmount ?? "0.00",
    client: tx,
    snapshots: input.snapshots,
    stageMs: stages,
  });
  const check = await enrollRefreshAndReloadCheck(
    {
      restaurantId: input.restaurantId,
      checkId: created.id,
      orderId: input.orderId,
      billDiscountAmount: created.billDiscountAmount,
      taxPolicySnapshot: created.taxPolicySnapshot,
      fallback: created,
    },
    tx,
    stages
  );
  const charges = await listCheckCharges(
    { restaurantId: input.restaurantId, checkId: check.id },
    tx
  );
  return {
    check,
    lines: charges.map((charge) => ({
      description: charge.description,
      quantity: charge.quantity,
      netAmount: charge.netAmount,
      originOrderItemId: charge.originOrderItemId,
    })),
  };
}

/** Same as settleCheckPaidById, exposing collected Order Settlement events.
 * PAYMENT-CONFIRM-SERVICE-1 / I-PAY-14 — Confirm Payment callers enter via
 * confirmPayment, which delegates here (PAYMENT-CONFIRM-REMAINING-CALLERS-1).
 * Check execution host, not the Payment process boundary.
 * PAYMENT-CONFIRM-COMPATIBILITY-CLEANUP-1 — not re-exported from public barrels.
 */
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

async function materializeOrLoadCashierPosOpenCheck(
  input: {
    restaurantId: number;
    orderId: number;
    billDiscountAmount: string;
    currencySnapshot: OperationalCheck["currencySnapshot"];
    taxPolicySnapshot: OperationalCheck["taxPolicySnapshot"];
  },
  tx: SessionDbClient,
  stages: EnsureCheckForOrderStageMs
): Promise<OperationalCheck> {
  const blocking = await findBlockingMembershipForOrder(
    input.restaurantId,
    input.orderId,
    tx
  );
  if (blocking) {
    if (blocking.checkOutcome === "paid") {
      throw new CheckTransitionError(
        `Cannot finalize check from outcome ${blocking.checkOutcome}`
      );
    }
    if (blocking.checkOutcome !== "open") {
      throw new CheckTransitionError(
        `Cannot finalize check from outcome ${blocking.checkOutcome}`
      );
    }
    const existing = await findCheckById(blocking.membership.checkId, tx);
    if (!existing || existing.restaurantId !== input.restaurantId) {
      throw new DiningSessionUnavailableError("Check not found for membership");
    }
    stages.checkCreated = false;
    const mapped = mapRowToOperationalCheck(existing);
    return enrollRefreshAndReloadCheck(
      {
        restaurantId: input.restaurantId,
        checkId: existing.id,
        orderId: input.orderId,
        billDiscountAmount: input.billDiscountAmount,
        taxPolicySnapshot: mapped.taxPolicySnapshot,
        fallback: mapped,
      },
      tx,
      stages
    );
  }

  stages.checkCreated = true;
  const created = await createOpenCheck({
    restaurantId: input.restaurantId,
    sessionId: null,
    billDiscountAmount: input.billDiscountAmount,
    client: tx,
    snapshots: {
      currencySnapshot: input.currencySnapshot,
      taxPolicySnapshot: input.taxPolicySnapshot,
    },
    stageMs: stages,
  });
  return enrollRefreshAndReloadCheck(
    {
      restaurantId: input.restaurantId,
      checkId: created.id,
      orderId: input.orderId,
      billDiscountAmount: created.billDiscountAmount,
      taxPolicySnapshot: created.taxPolicySnapshot,
      fallback: created,
    },
    tx,
    stages
  );
}

function adoptAttributionAfterOwnedCommit(input: {
  restaurantId: number;
  checkId: number;
  result: CheckFinancialMutationResult;
}): CheckFinancialMutationResult {
  void adoptSettlementAttributionAfterFinalize({
    restaurantId: input.restaurantId,
    outcome: "paid",
    settlementContext: input.result.settlementContext,
    settlementRecord: input.result.settlementRecord.record,
    settlementLines: [],
    at: formatDiningSessionTimestamp(),
    checkId: input.checkId,
  }).catch((err: unknown) => {
    opsLog({
      type: OPS_EVENT.check_settlement_attribution_deferred_failed,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      restaurantId: input.restaurantId,
      action: "adoptSettlementAttributionAfterFinalize",
      metadata: {
        checkId: input.checkId,
        outcome: "paid",
        settlementRecordId:
          input.result.settlementRecord.record?.settlementRecordId ?? null,
        error: err instanceof Error ? err.message : String(err),
      },
    });
  });
  return input.result;
}

/**
 * CASHIER-CONFIRM-FINANCIAL-COMMIT-DECOUPLING-1
 * Best-effort Check / ST / OS / SR after Collection Fact + PAID.
 * Never writes a Collection Fact. Never participates in Cashier HTTP success.
 */
export async function deliverCashierPosOperationalSettlementAfterPaid(input: {
  restaurantId: number;
  orderId: number;
  billDiscountAmount?: string;
  settlements?: readonly StaffSettlementLineInput[];
  settlementContext?: SettlementContext;
  settlementContextHints?: SettlementContextHints;
}): Promise<void> {
  const db = await getDb();
  if (!db) {
    throw new DiningSessionUnavailableError();
  }
  const order = await getOrderById(input.orderId, db);
  if (!order || order.restaurantId !== input.restaurantId) {
    throw new CheckOrderNotFoundError("Order not found");
  }
  const billDiscountAmount = input.billDiscountAmount ?? "0.00";
  const snapshots = await captureSnapshotsFromBusinessSettings(
    input.restaurantId
  );
  const stages = createEmptyEnsureCheckForOrderStageMs();
  const check = await withCheckOwnedTransaction(undefined, async (tx) =>
    materializeOrLoadCashierPosOpenCheck(
      {
        restaurantId: input.restaurantId,
        orderId: input.orderId,
        billDiscountAmount,
        currencySnapshot: snapshots.currencySnapshot,
        taxPolicySnapshot: snapshots.taxPolicySnapshot,
      },
      tx,
      stages
    )
  );
  emitEnsureCheckForOrderStages({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
    checkId: check.id,
    stages,
  });
  const fact = await findProductionCollectionFactByOrderId({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
  });
  await completeCashierOperationalSettlementAfterCollectionFact({
    restaurantId: input.restaurantId,
    checkId: check.id,
    settlements: input.settlements,
    settlementContext: input.settlementContext,
    settlementContextHints: input.settlementContextHints,
    complimentary: fact != null && isComplimentaryCollectionFact(fact),
  });
}

export async function completeCashierOperationalSettlementAfterCollectionFact(input: {
  restaurantId: number;
  checkId: number;
  settlements?: readonly StaffSettlementLineInput[];
  settlementContext?: SettlementContext;
  settlementContextHints?: SettlementContextHints;
  complimentary?: boolean;
}): Promise<void> {
  const row = await findCheckById(input.checkId);
  if (!row || row.restaurantId !== input.restaurantId) {
    throw new DiningSessionUnavailableError("Check not found");
  }
  if (row.outcome === "voided" || row.outcome === "paid" || row.outcome === "complimentary") {
    return;
  }
  try {
    await finalizeOpenCheckById({
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      outcome: input.complimentary ? "complimentary" : "paid",
      settlements: input.complimentary ? undefined : input.settlements,
      settlementContext: input.settlementContext,
      settlementContextHints: input.settlementContextHints,
      awaitAttribution: false,
    });
  } catch (err) {
    if (err instanceof CheckTransitionError) {
      const current = await findCheckById(input.checkId);
      if (
        current &&
        current.restaurantId === input.restaurantId &&
        (current.outcome === "paid" || current.outcome === "complimentary")
      ) {
        return;
      }
    }
    throw err;
  }
}

/**
 * Incoming / orderId Cashier Confirm: freeze + Collection Fact.
 * CRMP attribution is not invoked here. Direct and Incoming both attribute
 * once from Check finalization via deliverCashierPosOperationalSettlementAfterPaid.
 */
export async function settleCashierPosOrderPaidByIdDetailed(input: {
  restaurantId: number;
  orderId: number;
  billDiscountAmount?: string;
  settlements?: readonly StaffSettlementLineInput[];
  settlementContext?: SettlementContext;
  settlementContextHints?: SettlementContextHints;
  awaitAttribution?: boolean;
  deferOperationalSettlementAfterCollectionFact?: boolean;
  terminalId?: string;
  actorUserId?: number;
  actorDisplayName?: string | null;
  productionCollectionCommit?: (
    freeze: CashierAuthoritativePaidFreeze
  ) => Promise<{ fact: CollectionFactAttributionInput } | void>;
  complimentary?: boolean;
}): Promise<CheckFinancialMutationResult> {
  const order = await getOrderById(input.orderId);
  if (!order || order.restaurantId !== input.restaurantId) {
    throw new DiningSessionUnavailableError("Order not found");
  }
  if (!isCashierFinalizableOrderingChannel(order.orderingChannel)) {
    throw new DiningSessionValidationError(
      "Financial commit is limited to Cashier-finalizable ordering channels"
    );
  }
  if (order.status === "cancelled") {
    throw new DiningSessionValidationError("Order is not eligible");
  }
  if (!input.productionCollectionCommit) {
    throw new DiningSessionValidationError(
      "Cashier Confirm requires Collection Fact commit"
    );
  }

  const billDiscountAmount = input.billDiscountAmount ?? "0.00";
  const snapshots = await captureSnapshotsFromBusinessSettings(
    input.restaurantId
  );
  const freezeStartedAt = Date.now();
  const payable = await freezeCashierPosPayableFromOrder({
    restaurantId: input.restaurantId,
    order,
    billDiscountAmount,
    snapshots,
    settlements: input.settlements,
    complimentary: input.complimentary === true,
  });
  const freeze = payable.freeze;
  const validationMs = elapsedSinceMs(freezeStartedAt);
  const now = formatDiningSessionTimestamp();
  const settlementContext =
    input.settlementContext ??
    unavailableSettlementContext(input.restaurantId, now, [
      "no_operational_hints",
    ]);

  const financialTransactionStartedAt = new Date().toISOString();
  const moneyTxStartedAt = Date.now();
  const committed = await input.productionCollectionCommit(freeze);
  const moneyTxMs = elapsedSinceMs(moneyTxStartedAt);
  const financialTransactionCommittedAt = new Date().toISOString();
  const collectionFact =
    committed && typeof committed === "object" && "fact" in committed
      ? committed.fact
      : null;
  const commitOutcome =
    committed &&
    typeof committed === "object" &&
    "outcome" in committed &&
    (committed.outcome === "created" || committed.outcome === "replayed")
      ? committed.outcome
      : "created";

  // CASHIER-INCOMING-POSTPAYMENT-CRMP-DUPLICATE-CLEANUP-1
  // CRMP is owned by Check finalization (same as Direct). Do not attribute here.
  const settlementAttribution = skippedAttribution({
    gaps: ["deferred_post_commit"],
    reason: "Attribution continues independently after financial commit",
    collectionFactId: collectionFact?.collectionFactId ?? null,
  });

  const result: CheckFinancialMutationResult = {
    check: {
      id: CASHIER_CONFIRM_UNASSIGNED_CHECK_ID,
      restaurantId: input.restaurantId,
      sessionId: null,
      outcome: "open",
      currencySnapshot: freeze.currencySnapshot,
      taxPolicySnapshot: freeze.taxPolicySnapshot,
      serviceChargeSnapshot: null,
      billDiscountAmount: freeze.discountAmount,
      subtotal: freeze.subtotal,
      taxAmount: freeze.taxAmount,
      taxBreakdown: freeze.taxBreakdown,
      grandTotal: freeze.grandTotal,
      snapshotsFrozenAt: now,
      totalsFrozenAt: now,
      settledAt: null,
      voidedAt: null,
      createdAt: now,
      updatedAt: now,
    },
    orderSettlement: {
      settlements: [],
      events: [],
      outcomes: [],
    },
    orderSettlementEvents: [],
    settlementRecord: {
      record: null,
      events: [],
      outcome: "skipped",
    },
    settlementRecordEvents: [],
    settlementContext,
    settlementAttribution,
    settlementAttributionEvents: [],
    finalizeStageMs: {
      checkReloadMs: 0,
      orderDiscoveryMs: 0,
      contextResolveMs: 0,
      validationMs,
      financialTransactionPreparationMs: 0,
      financialTransactionWriteMs: moneyTxMs,
      financialTransactionTxWallMs: moneyTxMs,
      moneyTxMs,
      postCommitProcessingMs: 0,
      attributionMs: 0,
      financialTransactionStartedAt,
      financialTransactionCommittedAt,
      attributionCompletedAt: null,
      settlementContextReused: input.settlementContext != null,
    },
    paidReceipt: buildCashierPaidReceiptProjection({
      freeze,
      receiptInvoiceLines: payable.receiptInvoiceLines,
      order,
      paidAt: financialTransactionCommittedAt,
      cashierUserId: input.actorUserId ?? 0,
      cashierDisplayName: input.actorDisplayName,
      terminalId: input.terminalId ?? "",
    }),
  };

  if (collectionFact && "collectionFactId" in collectionFact) {
    dispatchComplianceAfterProductionCollectionFact({
      restaurantId: input.restaurantId,
      orderId: input.orderId,
      collectionFactId: collectionFact.collectionFactId,
      committedAt: collectionFact.committedAt,
      commitOutcome,
    });
  }

  dispatchBestEffortDownstreamDelivery({
    delivery: () =>
      deliverCashierPosOperationalSettlementAfterPaid({
        restaurantId: input.restaurantId,
        orderId: input.orderId,
        billDiscountAmount,
        settlements: input.settlements,
        settlementContext: input.settlementContext,
        settlementContextHints: input.settlementContextHints,
      }),
    onFailure: (err: unknown) => {
      opsLog({
        type: OPS_EVENT.check_operational_settlement_deferred_failed,
        category: "ORDER",
        severity: "warn",
        ts: new Date().toISOString(),
        restaurantId: input.restaurantId,
        action: "cashierDownstreamDelivery",
        metadata: {
          checkId: CASHIER_CONFIRM_UNASSIGNED_CHECK_ID,
          orderId: input.orderId,
          error: err instanceof Error ? err.message : String(err),
        },
      });
    },
  });
  return result;
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
 * ADR-ARCH-032 / REFUND-REGISTER-ADOPTION-1 /
 * REFUND-INVOICE-IDENTITY-AND-CONCURRENCY-HARDENING-1 —
 * Apply Refund under Check Aggregate (sole monetary authority), then
 * post-commit AttributeRefund to Register/Shift (custody only, fail-open).
 * Generation conflicts retry the whole Check-owned TX with a fresh budget read.
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

  const maxAttempts = 5;
  let financial: CheckRefundMutationResult | null = null;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      financial = await withCheckOwnedTransaction(undefined, async (tx) =>
        applyRefundOnCheckIntegration(input, tx)
      );
      break;
    } catch (error) {
      lastError = error;
      if (
        error instanceof ConcurrentRefundGenerationError &&
        attempt < maxAttempts
      ) {
        continue;
      }
      throw error;
    }
  }
  if (!financial) {
    throw lastError instanceof Error
      ? lastError
      : new ConcurrentRefundGenerationError(
          `RF-GEN-04: concurrent refund generation conflict for check=${input.checkId}`
        );
  }

  // Custody remains post-commit / fail-open (REFUND-REGISTER-ADOPTION-1).
  // Retry briefly so transient CRMP failures do not drop attribution on first try.
  let attributionBundle = await adoptRefundAttributionAfterFinalize({
    restaurantId: input.restaurantId,
    settlementContext,
    settlementRecord: financial.settlementRecord,
    at,
  });
  for (
    let attributionAttempt = 1;
    attributionAttempt < 3 &&
    (attributionBundle.attribution.outcome === "failed" ||
      attributionBundle.attribution.outcome === "skipped");
    attributionAttempt += 1
  ) {
    const retryableGaps = attributionBundle.attribution.gaps;
    const worthRetry =
      retryableGaps.includes("crmp_resolution_error") ||
      retryableGaps.some((g) => g.includes("lookup")) ||
      attributionBundle.attribution.outcome === "failed";
    if (!worthRetry) break;
    attributionBundle = await adoptRefundAttributionAfterFinalize({
      restaurantId: input.restaurantId,
      settlementContext,
      settlementRecord: financial.settlementRecord,
      at,
    });
  }

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
  originalSaleKind: "collection_fact" | "legacy_settlement_record";
  collectionFactId: string | null;
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
