/**
 * POS-SETTLEMENT-INITIATE-IMPLEMENTATION-1
 * POS Settlement Initiation is a command into the existing Check / Financial
 * Settlement Platform. POS does not own Check, Settlement, Register, or totals.
 *
 * PAYMENT-CONFIRM-SERVICE-1 — cashier Confirm Payment transport. Process
 * ownership is confirmPayment. Check remains the monetary aggregate.
 */

import { createHash } from "node:crypto";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import {
  CHECK_TERMINAL_OUTCOMES,
  type SelectablePaymentMethod,
  type StaffSettlementLineInput,
} from "@shared/operational-session";
import { CollectionFactError } from "@shared/operational-session/payment/collection-fact";
import { findProductionCollectionFactByOrderId } from "../../operational-session/payment/collection-fact/collectionFactRepository";
import type { SettlementContext } from "@shared/crmp";
import { opsLog } from "../../_core/opsLog";
import { getOrderById } from "../../db";
import {
  CheckTransitionError,
  getCheckById,
} from "../../operational-session/check/CheckService";
import { CheckMembershipError } from "../../operational-session/check/checkMembershipService";
import { confirmPayment } from "../../operational-session/payment/PaymentConfirmService";
import { findBlockingMembershipForOrder } from "../../operational-session/check/checkOrderMembershipRepository";
import { assertRestaurantPosScope } from "../authorization/assertRestaurantPosScope";
import type { PosSettlementInitiateIdempotencyStore } from "../infrastructure/PosSettlementInitiateIdempotencyStore";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";
import { PosAccessService } from "./PosAccessService";
import { startPosCommandClock } from "../observability/posCommandClock";
import {
  PosRegisterShiftContextError,
  PosRegisterShiftContextService,
} from "./PosRegisterShiftContextService";
import type { SelectUser } from "../../../drizzle/schema";

export class PosSettlementInitiateError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PosSettlementInitiateError";
    this.code = code;
  }
}

export type PosSettlementInitiateCommand = {
  restaurantId: number;
  terminalId: string;
  orderId: number;
  idempotencyKey: string;
  paymentIntentId: string;
  /** Canonical catalog key forwarded to Check. Not a POS amount. */
  paymentMethod?: SelectablePaymentMethod;
  /**
   * Existing Check staff settlement lines. When present, forwarded as-is.
   * Multi-line amounts must sum to Check grandTotal (Check-owned validation).
   */
  settlements?: readonly StaffSettlementLineInput[];
  /** Discount intent. Server applies inside Confirm. Not browser authority. */
  billDiscountAmount?: string;
};

export type PosSettlementInitiateResult = {
  checkId: number;
  orderId: number;
  restaurantId: number;
  outcome: "paid";
  grandTotal: string;
  settlementRecordId: string | null;
  sessionId: number | null;
  orderingChannel: typeof ORDERING_CHANNEL_CASHIER_POS;
  terminalId: string;
  cashierUserId: number;
  registerId: string | null;
  financialShiftId: string | null;
  replayed: boolean;
};

export type PosSettlementInitiateOrderLookup = (orderId: number) => Promise<{
  id: number;
  restaurantId: number;
  orderingChannel?: string | null;
  status?: string | null;
} | null>;

export type PosSettlementCheckView = {
  id: number;
  restaurantId: number;
  sessionId: number | null;
  outcome: string;
  grandTotal: string;
};

export type PosSettlementMembershipLookup = (
  restaurantId: number,
  orderId: number
) => Promise<{ checkId: number; checkOutcome: string } | null>;

export type PosSettlementCheckLookup = (input: {
  restaurantId: number;
  checkId: number;
}) => Promise<PosSettlementCheckView | null>;

export type PosProductionCollectionFactLookup = (input: {
  restaurantId: number;
  orderId: number;
}) => Promise<{
  collectionFactId: string;
  checkId: number | null;
  amount: string;
  paymentIntentId: string;
} | null>;

export type PosSettlementEnsureCheck = (input: {
  restaurantId: number;
  orderId: number;
}) => Promise<{ id: number; outcome: string }>;

/** Timing-only. Forwarded from Check finalizeStageMs. Not financial state. */
export type PosSettlementFinancialStageMs = {
  checkReloadMs: number;
  orderDiscoveryMs: number;
  contextResolveMs: number;
  moneyTxMs: number;
  attributionMs: number;
  validationMs?: number;
  financialTransactionPreparationMs?: number;
  financialTransactionWriteMs?: number;
  financialTransactionTxWallMs?: number | null;
  postCommitProcessingMs?: number;
  financialTransactionStartedAt?: string;
  financialTransactionCommittedAt?: string;
  attributionCompletedAt?: string | null;
  settlementContextReused?: boolean;
};

export type PosSettlementSettlePaid = (input: {
  restaurantId: number;
  orderId: number;
  billDiscountAmount?: string;
  settlementContext: SettlementContext;
  settlementContextHints: {
    registerId: string;
    operatorUserId: number;
    deviceId?: string | null;
  };
  settlements?: readonly StaffSettlementLineInput[];
  paymentIntentId: string;
  idempotencyKey: string;
  terminalId: string;
  actorUserId: number;
}) => Promise<{
  check: PosSettlementCheckView;
  settlementRecordId: string | null;
  finalizeStageMs?: PosSettlementFinancialStageMs;
}>;

const AUTH_DENIED_CODES = new Set([
  "pos_permission_denied",
  "terminal_not_found",
  "terminal_foreign",
  "terminal_inactive",
  "entitlement_unavailable",
]);

function normalizeFingerprintSettlements(
  lines: readonly StaffSettlementLineInput[] | undefined
): readonly { paymentMethod: string; amount: string | null }[] | null {
  if (!lines || lines.length === 0) return null;
  return [...lines]
    .map((line) => ({
      paymentMethod: line.paymentMethod,
      amount:
        line.amount != null && String(line.amount).trim().length > 0
          ? String(line.amount)
          : null,
    }))
    .sort((a, b) =>
      a.paymentMethod === b.paymentMethod
        ? (a.amount ?? "").localeCompare(b.amount ?? "")
        : a.paymentMethod.localeCompare(b.paymentMethod)
    );
}

function resolveCommandSettlements(
  command: PosSettlementInitiateCommand
): readonly StaffSettlementLineInput[] | undefined {
  if (command.settlements && command.settlements.length > 0) {
    return command.settlements;
  }
  if (command.paymentMethod) {
    return [{ paymentMethod: command.paymentMethod }];
  }
  return undefined;
}

function fingerprintOf(input: {
  restaurantId: number;
  terminalId: string;
  userId: number;
  orderId: number;
  paymentIntentId: string;
  paymentMethod?: SelectablePaymentMethod | null;
  settlements?: readonly StaffSettlementLineInput[];
  billDiscountAmount?: string | null;
}): string {
  const settlements = normalizeFingerprintSettlements(input.settlements);
  const singleMethodOnly =
    settlements != null &&
    settlements.length === 1 &&
    settlements[0].amount == null &&
    settlements[0].paymentMethod ===
      (input.paymentMethod ?? settlements[0].paymentMethod);
  return createHash("sha256")
    .update(
      JSON.stringify({
        restaurantId: input.restaurantId,
        terminalId: input.terminalId,
        userId: input.userId,
        orderId: input.orderId,
        paymentIntentId: input.paymentIntentId,
        paymentMethod: input.paymentMethod ?? null,
        billDiscountAmount: input.billDiscountAmount ?? null,
        ...(settlements && !singleMethodOnly ? { settlements } : {}),
      })
    )
    .digest("hex");
}

function assertIdempotencyKey(key: string): void {
  if (!key.trim() || key.length < 8 || key.length > 128) {
    throw new PosSettlementInitiateError(
      "invalid_idempotency_key",
      "Idempotency key is required"
    );
  }
}

async function defaultMembershipLookup(
  restaurantId: number,
  orderId: number
): Promise<{ checkId: number; checkOutcome: string } | null> {
  const row = await findBlockingMembershipForOrder(restaurantId, orderId);
  if (!row) return null;
  return { checkId: row.membership.checkId, checkOutcome: row.checkOutcome };
}

async function defaultProductionCollectionFactByOrder(input: {
  restaurantId: number;
  orderId: number;
}): Promise<{
  collectionFactId: string;
  checkId: number | null;
  amount: string;
  paymentIntentId: string;
} | null> {
  const fact = await findProductionCollectionFactByOrderId(input);
  if (!fact) return null;
  return {
    collectionFactId: fact.collectionFactId,
    checkId: fact.checkId,
    amount: fact.amount,
    paymentIntentId: fact.paymentIntentId,
  };
}

async function defaultCheckLookup(input: {
  restaurantId: number;
  checkId: number;
}): Promise<PosSettlementCheckView | null> {
  const check = await getCheckById(input);
  if (!check) return null;
  return {
    id: check.id,
    restaurantId: check.restaurantId,
    sessionId: check.sessionId,
    outcome: check.outcome,
    grandTotal: check.grandTotal,
  };
}

async function defaultSettlePaid(input: {
  restaurantId: number;
  orderId: number;
  billDiscountAmount?: string;
  settlementContext: SettlementContext;
  settlementContextHints: {
    registerId: string;
    operatorUserId: number;
    deviceId?: string | null;
  };
  settlements?: readonly StaffSettlementLineInput[];
  paymentIntentId: string;
  idempotencyKey: string;
  terminalId: string;
  actorUserId: number;
}): Promise<{
  check: PosSettlementCheckView;
  settlementRecordId: string | null;
  finalizeStageMs?: PosSettlementFinancialStageMs;
}> {
  const financial = await confirmPayment({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
    billDiscountAmount: input.billDiscountAmount,
    settlements: input.settlements,
    settlementContext: input.settlementContext,
    settlementContextHints: {
      registerId: input.settlementContextHints.registerId,
      operatorUserId: input.settlementContextHints.operatorUserId,
      deviceId: input.settlementContextHints.deviceId,
    },
    paymentIntentId: input.paymentIntentId,
    idempotencyKey: input.idempotencyKey,
    terminalId: input.terminalId,
    actorType: "staff_user",
    actorUserId: input.actorUserId,
    // CASHIER-SETTLEMENT-HTTP-AT-FINANCIAL-COMMIT-1 — do not wait for Attribution.
    awaitAttribution: false,
  });
  return {
    check: {
      id: financial.check.id,
      restaurantId: financial.check.restaurantId,
      sessionId: financial.check.sessionId,
      outcome: financial.check.outcome,
      grandTotal: financial.check.grandTotal,
    },
    settlementRecordId:
      financial.settlementRecord.record?.settlementRecordId ?? null,
    finalizeStageMs: financial.finalizeStageMs,
  };
}

function unexplainedFinancialTxnGapMs(
  envelopeMs: number | undefined,
  stages: PosSettlementFinancialStageMs | undefined
): number | null {
  if (typeof envelopeMs !== "number" || !Number.isFinite(envelopeMs) || !stages) {
    return null;
  }
  const validationMs = stages.validationMs ?? 0;
  const sum =
    stages.checkReloadMs +
    stages.orderDiscoveryMs +
    stages.contextResolveMs +
    validationMs +
    stages.moneyTxMs +
    stages.attributionMs;
  if (!Number.isFinite(sum)) return null;
  return envelopeMs - sum;
}

function unaccountedHttpMs(input: {
  durationMs: number;
  authMs: number | undefined;
  orderLoadMs: number | undefined;
  idempotencyGetMs: number | undefined;
  settlementContextMs: number | undefined;
  ensureCheckMs: number | null;
  checkLoadMs: number | undefined;
  financialTxnMs: number | undefined;
  responseConstructionMs: number | undefined;
}): number | null {
  const parts = [
    input.authMs,
    input.orderLoadMs,
    input.idempotencyGetMs,
    input.settlementContextMs,
    input.ensureCheckMs,
    input.checkLoadMs,
    input.financialTxnMs,
    input.responseConstructionMs,
  ];
  if (parts.some((value) => typeof value !== "number" || !Number.isFinite(value))) {
    return null;
  }
  const sum = (parts as number[]).reduce((acc, value) => acc + value, 0);
  return input.durationMs - sum;
}

function resultFrom(fields: {
  checkId: number;
  orderId: number;
  restaurantId: number;
  grandTotal: string;
  settlementRecordId: string | null;
  sessionId: number | null;
  terminalId: string;
  cashierUserId: number;
  registerId: string | null;
  financialShiftId: string | null;
  replayed: boolean;
}): PosSettlementInitiateResult {
  return {
    checkId: fields.checkId,
    orderId: fields.orderId,
    restaurantId: fields.restaurantId,
    outcome: "paid",
    grandTotal: fields.grandTotal,
    settlementRecordId: fields.settlementRecordId,
    sessionId: fields.sessionId,
    orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
    terminalId: fields.terminalId,
    cashierUserId: fields.cashierUserId,
    registerId: fields.registerId,
    financialShiftId: fields.financialShiftId,
    replayed: fields.replayed,
  };
}

export class PosSettlementInitiateService {
  constructor(
    private readonly grants: PosPermissionGrantStore,
    private readonly access: PosAccessService,
    private readonly idempotency: PosSettlementInitiateIdempotencyStore,
    private readonly registerShift: PosRegisterShiftContextService = new PosRegisterShiftContextService(),
    private readonly orderLookup: PosSettlementInitiateOrderLookup = getOrderById,
    private readonly membershipLookup: PosSettlementMembershipLookup = defaultMembershipLookup,
    private readonly checkLookup: PosSettlementCheckLookup = defaultCheckLookup,
    private readonly settlePaid: PosSettlementSettlePaid = defaultSettlePaid,
    private readonly productionCollectionFactByOrderLookup: PosProductionCollectionFactLookup = defaultProductionCollectionFactByOrder
  ) {}

  async initiate(input: {
    user: SelectUser;
    command: PosSettlementInitiateCommand;
  }): Promise<PosSettlementInitiateResult> {
    const clock = startPosCommandClock();
    let authMs: number | undefined;
    let orderLoadMs: number | undefined;
    let idempotencyGetMs: number | undefined;
    let settlementContextMs: number | undefined;
    let ensureCheckMs: number | null = null;
    let checkLoadMs: number | undefined;
    let financialTxnMs: number | undefined;
    let responseConstructionMs: number | undefined;
    let settlementContextCompletedAt: string | undefined;
    let checkLoadedAt: string | undefined;
    let financialTransactionStartedAt: string | undefined;
    assertIdempotencyKey(input.command.idempotencyKey);
    if (
      !input.command.paymentIntentId.trim() ||
      input.command.paymentIntentId.length > 128 ||
      input.command.paymentIntentId === String(input.command.orderId) ||
      input.command.paymentIntentId === input.command.idempotencyKey
    ) {
      throw new PosSettlementInitiateError(
        "invalid_payment_intent",
        "A legitimate paymentIntentId is required"
      );
    }
    if (!Number.isInteger(input.command.orderId) || input.command.orderId <= 0) {
      throw new PosSettlementInitiateError("order_not_found", "Order is invalid");
    }

    const authStarted = clock.mark();
    const scope = await assertRestaurantPosScope(
      { user: input.user },
      input.command.restaurantId,
      this.grants,
      "pos.settlement.initiate"
    );
    const decision = await this.access.resolvePosTerminalAccess({
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      userId: input.user.id,
      requiredPermission: "SETTLEMENT_INITIATE",
      restaurantScope: scope.kind,
    });
    if (!decision.allowed || !decision.context) {
      throw new PosSettlementInitiateError(
        AUTH_DENIED_CODES.has(decision.reasonCode)
          ? decision.reasonCode
          : "pos_permission_denied",
        "غير مصرح بالوصول"
      );
    }
    const context = decision.context;
    if (
      !context.permissions.includes("POS_ACCESS") ||
      !context.permissions.includes("SETTLEMENT_INITIATE")
    ) {
      throw new PosSettlementInitiateError(
        "pos_permission_denied",
        "غير مصرح بالوصول"
      );
    }
    authMs = clock.since(authStarted);

    const orderStarted = clock.mark();
    const order = await this.orderLookup(input.command.orderId);
    orderLoadMs = clock.since(orderStarted);
    if (!order) {
      throw new PosSettlementInitiateError("order_not_found", "Order not found");
    }
    if (order.restaurantId !== context.restaurantId) {
      throw new PosSettlementInitiateError(
        "order_wrong_restaurant",
        "Order does not belong to this restaurant"
      );
    }
    if (order.orderingChannel !== ORDERING_CHANNEL_CASHIER_POS) {
      throw new PosSettlementInitiateError(
        "order_not_eligible",
        "Order is not a direct POS Sale"
      );
    }
    if (order.status === "cancelled") {
      throw new PosSettlementInitiateError(
        "order_not_eligible",
        "Order is not eligible"
      );
    }

    const fingerprint = fingerprintOf({
      restaurantId: context.restaurantId,
      terminalId: context.terminalId,
      userId: context.userId,
      orderId: order.id,
      paymentIntentId: input.command.paymentIntentId,
      paymentMethod: input.command.paymentMethod ?? null,
      settlements: input.command.settlements,
      billDiscountAmount: input.command.billDiscountAmount ?? null,
    });
    const idempotencyKey = {
      restaurantId: context.restaurantId,
      terminalId: context.terminalId,
      userId: context.userId,
      idempotencyKey: input.command.idempotencyKey,
    };

    return this.idempotency.runExclusive(idempotencyKey, async () => {
      const idempotencyGetStarted = clock.mark();
      const existing = await this.idempotency.get(idempotencyKey);
      idempotencyGetMs = clock.since(idempotencyGetStarted);
      if (existing) {
        if (existing.fingerprint !== fingerprint) {
          throw new PosSettlementInitiateError(
            "idempotency_conflict",
            "Idempotency key was already used for a different settlement"
          );
        }
        return resultFrom({
          checkId: existing.checkId,
          orderId: existing.orderId,
          restaurantId: context.restaurantId,
          grandTotal: existing.grandTotal,
          settlementRecordId: existing.settlementRecordId,
          sessionId: existing.sessionId,
          terminalId: context.terminalId,
          cashierUserId: context.userId,
          registerId: existing.registerId,
          financialShiftId: existing.financialShiftId,
          replayed: true,
        });
      }

      const contextStarted = clock.mark();
      const [foundMembership, crmp] = await Promise.all([
        this.membershipLookup(context.restaurantId, order.id),
        this.registerShift
          .requireResolvedContextForSettlement({
            restaurantId: context.restaurantId,
            terminalId: context.terminalId,
            operatorUserId: context.userId,
          })
          .catch((err) => {
            if (err instanceof PosRegisterShiftContextError) {
              throw new PosSettlementInitiateError(err.code, err.message);
            }
            throw err;
          }),
      ]);
      const operational = crmp.operational;
      settlementContextMs = clock.since(contextStarted);
      settlementContextCompletedAt = new Date().toISOString();
      const membership = foundMembership;
      ensureCheckMs = 0;
      checkLoadMs = 0;

      const existingFact = await this.productionCollectionFactByOrderLookup({
        restaurantId: context.restaurantId,
        orderId: order.id,
      });
      if (existingFact?.checkId != null) {
        // Collection Fact is the authoritative replay source. Check/ST/OS/SR
        // are downstream operational state and cannot gate Cashier success.
        void this.idempotency.put({
          restaurantId: context.restaurantId,
          terminalId: context.terminalId,
          userId: context.userId,
          idempotencyKey: input.command.idempotencyKey,
          fingerprint,
          orderId: order.id,
          checkId: existingFact.checkId,
          outcome: "paid",
          grandTotal: existingFact.amount,
          settlementRecordId: null,
          sessionId: null,
          registerId: operational.registerId,
          financialShiftId: operational.financialShiftId,
          createdAt: new Date().toISOString(),
        }).catch(() => undefined);
        return resultFrom({
          checkId: existingFact.checkId,
          orderId: order.id,
          restaurantId: context.restaurantId,
          grandTotal: existingFact.amount,
          settlementRecordId: null,
          sessionId: null,
          terminalId: context.terminalId,
          cashierUserId: context.userId,
          registerId: operational.registerId,
          financialShiftId: operational.financialShiftId,
          replayed: true,
        });
      }

      if (
        membership &&
        (CHECK_TERMINAL_OUTCOMES as readonly string[]).includes(
          membership.checkOutcome
        )
      ) {
        throw new PosSettlementInitiateError(
          "check_already_terminal",
          "Check is already terminal"
        );
      }
      if (membership && membership.checkOutcome !== "open") {
        throw new PosSettlementInitiateError(
          "check_not_eligible",
          "Check is not eligible for settlement initiation"
        );
      }

      const settlements = resolveCommandSettlements(input.command);

      let settled: Awaited<ReturnType<PosSettlementSettlePaid>>;
      try {
        const txnStarted = clock.mark();
        financialTransactionStartedAt = new Date(txnStarted).toISOString();
        settled = await this.settlePaid({
          restaurantId: context.restaurantId,
          orderId: order.id,
          billDiscountAmount: input.command.billDiscountAmount,
          settlementContext: crmp.settlementContext,
          settlementContextHints: {
            registerId: operational.registerId,
            operatorUserId: context.userId,
            deviceId: operational.deviceId,
          },
          paymentIntentId: input.command.paymentIntentId,
          idempotencyKey: input.command.idempotencyKey,
          terminalId: context.terminalId,
          actorUserId: context.userId,
          ...(settlements ? { settlements } : {}),
        });
        financialTxnMs = clock.since(txnStarted);
      } catch (err) {
        if (err instanceof CollectionFactError) {
          throw new PosSettlementInitiateError(
            err.code === "CONFLICT" ? "idempotency_conflict" : "collection_fact_rejected",
            err.message
          );
        }
        // Once a Collection Fact exists, any later operational failure is
        // downstream. Return the authoritative financial replay, not an error.
        const committedFactAfterFailure =
          await this.productionCollectionFactByOrderLookup({
            restaurantId: context.restaurantId,
            orderId: order.id,
          });
        if (committedFactAfterFailure?.checkId != null) {
          void this.idempotency.put({
            restaurantId: context.restaurantId,
            terminalId: context.terminalId,
            userId: context.userId,
            idempotencyKey: input.command.idempotencyKey,
            fingerprint,
            orderId: order.id,
            checkId: committedFactAfterFailure.checkId,
            outcome: "paid",
            grandTotal: committedFactAfterFailure.amount,
            settlementRecordId: null,
            sessionId: null,
            registerId: operational.registerId,
            financialShiftId: operational.financialShiftId,
            createdAt: new Date().toISOString(),
          }).catch(() => undefined);
          return resultFrom({
            checkId: committedFactAfterFailure.checkId,
            orderId: order.id,
            restaurantId: context.restaurantId,
            grandTotal: committedFactAfterFailure.amount,
            settlementRecordId: null,
            sessionId: null,
            terminalId: context.terminalId,
            cashierUserId: context.userId,
            registerId: operational.registerId,
            financialShiftId: operational.financialShiftId,
            replayed: true,
          });
        }
        if (
          err instanceof CheckTransitionError ||
          err instanceof CheckMembershipError
        ) {
          const committedFact = await this.productionCollectionFactByOrderLookup({
            restaurantId: context.restaurantId,
            orderId: order.id,
          });
          if (committedFact?.checkId != null) {
            // A concurrent command may lose the Check transition after the
            // financial fact committed. Replaying that fact is still PAID.
            void this.idempotency.put({
              restaurantId: context.restaurantId,
              terminalId: context.terminalId,
              userId: context.userId,
              idempotencyKey: input.command.idempotencyKey,
              fingerprint,
              orderId: order.id,
              checkId: committedFact.checkId,
              outcome: "paid",
              grandTotal: committedFact.amount,
              settlementRecordId: null,
              sessionId: null,
              registerId: operational.registerId,
              financialShiftId: operational.financialShiftId,
              createdAt: new Date().toISOString(),
            }).catch(() => undefined);
            return resultFrom({
              checkId: committedFact.checkId,
              orderId: order.id,
              restaurantId: context.restaurantId,
              grandTotal: committedFact.amount,
              settlementRecordId: null,
              sessionId: null,
              terminalId: context.terminalId,
              cashierUserId: context.userId,
              registerId: operational.registerId,
              financialShiftId: operational.financialShiftId,
              replayed: true,
            });
          }
          throw new PosSettlementInitiateError(
            "concurrency_conflict",
            "Settlement initiation conflicted with another command"
          );
        }
        throw err;
      }

      if (settled.check.restaurantId !== context.restaurantId) {
        throw new PosSettlementInitiateError(
          "check_wrong_restaurant",
          "Check does not belong to this restaurant"
        );
      }
      // Financial PAID is Collection Fact commit/replay. Check may still be
      // OPEN while Check PAID / ST / OS / SR run after HTTP.
      if (
        settled.check.outcome !== "paid" &&
        settled.check.outcome !== "open"
      ) {
        throw new PosSettlementInitiateError(
          "check_not_eligible",
          "Check is not eligible for settlement initiation"
        );
      }

      const responseStarted = clock.mark();
      // This auxiliary response cache must not turn an already committed
      // Collection Fact into a failed Cashier payment.
      void this.idempotency.put({
        restaurantId: context.restaurantId,
        terminalId: context.terminalId,
        userId: context.userId,
        idempotencyKey: input.command.idempotencyKey,
        fingerprint,
        orderId: order.id,
        checkId: settled.check.id,
        outcome: "paid",
        grandTotal: settled.check.grandTotal,
        settlementRecordId: settled.settlementRecordId,
        sessionId: settled.check.sessionId,
        registerId: operational.registerId,
        financialShiftId: operational.financialShiftId,
        createdAt: new Date().toISOString(),
      }).catch(() => undefined);
      responseConstructionMs = clock.since(responseStarted);

      const timing = clock.finish();
      const stages = settled.finalizeStageMs;
      const unaccountedMs = unaccountedHttpMs({
        durationMs: timing.durationMs,
        authMs,
        orderLoadMs,
        idempotencyGetMs,
        settlementContextMs,
        ensureCheckMs: ensureCheckMs ?? 0,
        checkLoadMs,
        financialTxnMs,
        responseConstructionMs,
      });
      opsLog({
        type: "pos_settlement_initiate",
        category: "ORDER",
        severity: "info",
        ts: timing.completedAt,
        actorId: context.userId,
        restaurantId: context.restaurantId,
        action: "pos.settlement.initiate",
        metadata: {
          orderId: order.id,
          checkId: settled.check.id,
          terminalId: context.terminalId,
          orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
          registerId: operational.registerId,
          financialShiftId: operational.financialShiftId,
          settlement_request_started: timing.startedAt,
          settlement_context_completed: settlementContextCompletedAt ?? null,
          check_loaded: checkLoadedAt ?? null,
          financial_transaction_started:
            stages?.financialTransactionStartedAt ??
            financialTransactionStartedAt ??
            null,
          financial_transaction_commit_completed:
            stages?.financialTransactionCommittedAt ?? null,
          post_commit_processing_started:
            stages?.financialTransactionCommittedAt ?? null,
          attribution_started: stages?.financialTransactionCommittedAt ?? null,
          attribution_completed: stages?.attributionCompletedAt ?? null,
          settlement_response_ready: timing.completedAt,
          settlement_request_completed: timing.completedAt,
          startedAt: timing.startedAt,
          completedAt: timing.completedAt,
          durationMs: timing.durationMs,
          totalHttpDurationMs: timing.durationMs,
          authMs,
          orderLoadMs,
          idempotencyGetMs,
          settlementContextMs,
          ensureCheckMs,
          checkLoadMs,
          financialTxnMs,
          checkReloadMs: stages?.checkReloadMs ?? null,
          orderDiscoveryMs: stages?.orderDiscoveryMs ?? null,
          contextResolveMs: stages?.contextResolveMs ?? null,
          validationMs: stages?.validationMs ?? null,
          financialTransactionPreparationMs:
            stages?.financialTransactionPreparationMs ?? null,
          financialTransactionWriteMs:
            stages?.financialTransactionWriteMs ?? null,
          financialTransactionTxWallMs:
            stages?.financialTransactionTxWallMs ?? null,
          financialTransactionCommitMs: null,
          financialTransactionTotalMs: stages?.moneyTxMs ?? null,
          moneyTxMs: stages?.moneyTxMs ?? null,
          postCommitProcessingMs: stages?.postCommitProcessingMs ?? null,
          attributionMs: stages?.attributionMs ?? null,
          settlementContextReused: stages?.settlementContextReused ?? null,
          responseConstructionMs,
          unexplainedGapMs: unexplainedFinancialTxnGapMs(financialTxnMs, stages),
          unaccountedMs,
        },
      });

      return resultFrom({
        checkId: settled.check.id,
        orderId: order.id,
        restaurantId: context.restaurantId,
        grandTotal: settled.check.grandTotal,
        settlementRecordId: settled.settlementRecordId,
        sessionId: settled.check.sessionId,
        terminalId: context.terminalId,
        cashierUserId: context.userId,
        registerId: operational.registerId,
        financialShiftId: operational.financialShiftId,
        replayed: false,
      });
    });
  }
}
