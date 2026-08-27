/**
 * POS-SETTLEMENT-INITIATE-IMPLEMENTATION-1
 * POS Settlement Initiation is a command into the existing Check / Financial
 * Settlement Platform. POS does not own Check, Settlement, Register, or totals.
 *
 * CASHIER-PASS-2-CONFIRM-FINALIZATION-1 — Cashier Confirm with prepared
 * invoice items creates Order + Collection Fact in one persist transaction.
 * Legacy orderId Confirm still uses confirmPayment.
 */

import { createHash } from "node:crypto";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { isCashierFinalizableOrderingChannel, isComplimentaryCollectionFact } from "@shared/pos";
import {
  type SelectablePaymentMethod,
  type StaffSettlementLineInput,
} from "@shared/operational-session";
import { CollectionFactError } from "@shared/operational-session/payment/collection-fact";
import {
  findCollectionFactByIdempotency,
  findProductionCollectionFactByOrderId,
} from "../../operational-session/payment/collection-fact/collectionFactRepository";
import type { CollectionFact } from "@shared/operational-session/payment/collection-fact";
import type { IdentityPlaceOrderService } from "../../order/application/IdentityPlaceOrderService";
import { finalizeCashierPreparedInvoice } from "./finalizeCashierPreparedInvoice";
import { cashierInvoiceNumberForOrder } from "../cashier-invoice/cashierInvoiceRepository";
import type { SettlementContext } from "@shared/crmp";
import { opsLog } from "../../_core/opsLog";
import { getOrderById, getOrderItemsByOrderId } from "../../db";
import {
  CheckTransitionError,
  getCheckById,
} from "../../operational-session/check/CheckService";
import { CheckMembershipError } from "../../operational-session/check/checkMembershipService";
import { findBlockingMembershipForOrder } from "../../operational-session/check/checkOrderMembershipRepository";
import { confirmPayment } from "../../operational-session/payment/PaymentConfirmService";
import { scheduleCashierPosOperationalSettlementAfterPaid } from "../../operational-session/payment/recoverCashierPosDownstreamSettlement";
import { buildCashierPaidReceiptProjection } from "../../operational-session/payment/cashierPaidReceiptProjection";
import type { CashierPaidReceiptProjection } from "../../operational-session/payment/cashierPaidReceiptProjection";
import { mapOrderItemsToReceiptInvoiceLines } from "../../operational-session/payment/cashierPosOrderFreeze";
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

export type PosSettlementSaleLineInput = {
  menuItemId: number;
  quantity: number;
  notes?: string | null;
  modifiers?: readonly string[] | null;
};

export type PosSettlementInitiateCommand = {
  restaurantId: number;
  terminalId: string;
  /** Legacy Confirm of an already persisted cashier_pos Order. */
  orderId?: number;
  /** Prepared invoice intent. Confirm creates/finalizes the Order. */
  items?: readonly PosSettlementSaleLineInput[];
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
  /** Cashier complimentary: zero collection CF. Not a second financial authority. */
  complimentary?: boolean;
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
  paidReceipt: CashierPaidReceiptProjection | null;
};

export type PosSettlementInitiateOrderLookup = (orderId: number) => Promise<{
  id: number;
  restaurantId: number;
  orderingChannel?: string | null;
  status?: string | null;
  orderNumber?: string | null;
  totalAmount?: string | number | null;
  businessDay?: string | null;
  dailyDisplayNumber?: number | null;
  identityScope?: string | null;
  fulfilmentAnchorType?: string | null;
  serviceMode?: string | null;
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
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  tenders: CashierPaidReceiptProjection["tenders"];
  committedAt: string;
  currencySnapshot: { currencyCode: string; currencySymbol: string };
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
  actorDisplayName?: string | null;
  complimentary?: boolean;
}) => Promise<{
  check: PosSettlementCheckView;
  settlementRecordId: string | null;
  finalizeStageMs?: PosSettlementFinancialStageMs;
  paidReceipt?: CashierPaidReceiptProjection | null;
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
  orderId: number | null;
  itemsKey: string | null;
  paymentIntentId: string;
  paymentMethod?: SelectablePaymentMethod | null;
  settlements?: readonly StaffSettlementLineInput[];
  billDiscountAmount?: string | null;
  complimentary?: boolean;
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
        itemsKey: input.itemsKey,
        paymentIntentId: input.paymentIntentId,
        paymentMethod: input.paymentMethod ?? null,
        billDiscountAmount: input.billDiscountAmount ?? null,
        complimentary: input.complimentary === true,
        ...(settlements && !singleMethodOnly ? { settlements } : {}),
      })
    )
    .digest("hex");
}

function preparedItemsKey(
  items: readonly PosSettlementSaleLineInput[] | undefined
): string | null {
  if (!items || items.length === 0) return null;
  return [...items]
    .map((item) => `${item.menuItemId}:${item.quantity}`)
    .sort()
    .join("|");
}

function moneyKey(value: string | undefined): string {
  const trimmed = (value ?? "0.00").trim();
  return trimmed.length === 0 ? "0.00" : trimmed;
}

function tenderMethodsKey(
  command: Pick<PosSettlementInitiateCommand, "paymentMethod" | "settlements">
): string {
  if (command.settlements && command.settlements.length > 0) {
    return [...command.settlements]
      .map((line) => line.paymentMethod)
      .sort()
      .join("|");
  }
  return command.paymentMethod ?? "";
}

function cashierIntentMatchesExistingFact(input: {
  command: PosSettlementInitiateCommand;
  fact: CollectionFact;
  orderItems: readonly { menuItemId?: number | null; quantity?: number | string | null }[];
}): boolean {
  const items = input.command.items ?? [];
  const persistedKey = [...input.orderItems]
    .map((row) => `${Number(row.menuItemId)}:${Number(row.quantity ?? 1)}`)
    .sort()
    .join("|");
  if (preparedItemsKey(items) !== persistedKey) return false;
  if (input.command.complimentary) {
    return isComplimentaryCollectionFact(input.fact);
  }
  if (moneyKey(input.command.billDiscountAmount) !== moneyKey(input.fact.discountAmount)) {
    return false;
  }
  const commandTenders = tenderMethodsKey(input.command);
  const factTenders = [...input.fact.tenders]
    .map((line) => line.paymentMethod)
    .sort()
    .join("|");
  return commandTenders.length === 0 || commandTenders === factTenders;
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

function collectionFactToLookup(fact: CollectionFact): NonNullable<
  Awaited<ReturnType<PosProductionCollectionFactLookup>>
> {
  return {
    collectionFactId: fact.collectionFactId,
    checkId: fact.checkId,
    amount: fact.amount,
    paymentIntentId: fact.paymentIntentId,
    subtotal: fact.subtotal,
    discountAmount: fact.discountAmount,
    taxAmount: fact.taxAmount,
    tenders: fact.tenders,
    committedAt: fact.committedAt,
    currencySnapshot: fact.currencySnapshot,
  };
}

async function defaultProductionCollectionFactByOrder(
  input: {
    restaurantId: number;
    orderId: number;
  }
): ReturnType<PosProductionCollectionFactLookup> {
  const fact = await findProductionCollectionFactByOrderId(input);
  if (!fact) return null;
  return {
    collectionFactId: fact.collectionFactId,
    checkId: fact.checkId,
    amount: fact.amount,
    paymentIntentId: fact.paymentIntentId,
    subtotal: fact.subtotal,
    discountAmount: fact.discountAmount,
    taxAmount: fact.taxAmount,
    tenders: fact.tenders,
    committedAt: fact.committedAt,
    currencySnapshot: fact.currencySnapshot,
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
  actorDisplayName?: string | null;
  complimentary?: boolean;
}): Promise<{
  check: PosSettlementCheckView;
  settlementRecordId: string | null;
  finalizeStageMs?: PosSettlementFinancialStageMs;
  paidReceipt?: CashierPaidReceiptProjection | null;
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
    actorDisplayName: input.actorDisplayName,
    complimentary: input.complimentary === true,
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
    paidReceipt: financial.paidReceipt ?? null,
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

function posCheckIdFromFact(checkId: number | null | undefined): number {
  return checkId != null && checkId > 0 ? checkId : 0;
}

async function paidReceiptFromExistingFact(input: {
  order: NonNullable<Awaited<ReturnType<PosSettlementInitiateOrderLookup>>>;
  fact: NonNullable<Awaited<ReturnType<PosProductionCollectionFactLookup>>>;
  cashierUserId: number;
  cashierDisplayName?: string | null;
  terminalId: string;
}): Promise<CashierPaidReceiptProjection> {
  const items = (await getOrderItemsByOrderId(input.order.id)) ?? [];
  const persistedOrder = input.order;
  const invoiceNumber = await cashierInvoiceNumberForOrder({
    restaurantId: persistedOrder.restaurantId,
    orderId: persistedOrder.id,
  });
  // CF.subtotal stays on the lookup fact (taxable base). Receipt Subtotal
  // is cashierInvoicePresentationSubtotal(grandTotal, taxAmount).
  return buildCashierPaidReceiptProjection({
    freeze: {
      orderId: persistedOrder.id,
      discountAmount: input.fact.discountAmount,
      taxAmount: input.fact.taxAmount,
      grandTotal: input.fact.amount,
      tenders: input.fact.tenders,
      currencySnapshot: input.fact.currencySnapshot,
    },
    receiptInvoiceLines: mapOrderItemsToReceiptInvoiceLines(items, {
      id: persistedOrder.id,
      restaurantId: persistedOrder.restaurantId,
      orderNumber: persistedOrder.orderNumber,
      totalAmount: persistedOrder.totalAmount,
    }),
    order: persistedOrder,
    paidAt: input.fact.committedAt,
    cashierUserId: input.cashierUserId,
    cashierDisplayName: input.cashierDisplayName,
    terminalId: input.terminalId,
    invoiceNumber,
  });
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
  paidReceipt: CashierPaidReceiptProjection | null;
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
    paidReceipt: fields.paidReceipt,
  };
}

function scheduleReplayDownstream(input: {
  restaurantId: number;
  orderId: number;
  command: PosSettlementInitiateCommand;
  settlementContext: SettlementContext;
  registerId: string;
  operatorUserId: number;
  deviceId?: string | null;
}): void {
  scheduleCashierPosOperationalSettlementAfterPaid({
    restaurantId: input.restaurantId,
    orderId: input.orderId,
    billDiscountAmount: input.command.billDiscountAmount,
    settlements: resolveCommandSettlements(input.command),
    settlementContext: input.settlementContext,
    settlementContextHints: {
      registerId: input.registerId,
      operatorUserId: input.operatorUserId,
      deviceId: input.deviceId,
    },
  });
}

export class PosSettlementInitiateService {
  constructor(
    private readonly grants: PosPermissionGrantStore,
    private readonly access: PosAccessService,
    private readonly idempotency: PosSettlementInitiateIdempotencyStore,
    private readonly registerShift: PosRegisterShiftContextService = new PosRegisterShiftContextService(),
    private readonly orderLookup: PosSettlementInitiateOrderLookup = getOrderById,
    _membershipLookup: PosSettlementMembershipLookup = defaultMembershipLookup,
    private readonly checkLookup: PosSettlementCheckLookup = defaultCheckLookup,
    private readonly settlePaid: PosSettlementSettlePaid = defaultSettlePaid,
    private readonly productionCollectionFactByOrderLookup: PosProductionCollectionFactLookup = defaultProductionCollectionFactByOrder,
    private readonly placeOrder?: IdentityPlaceOrderService
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
    const preparedItems = input.command.items ?? [];
    const hasPreparedItems = preparedItems.length > 0;
    const commandOrderId = input.command.orderId;
    const hasOrderId =
      commandOrderId != null &&
      Number.isInteger(commandOrderId) &&
      commandOrderId > 0;
    if (!hasPreparedItems && !hasOrderId) {
      throw new PosSettlementInitiateError(
        "invalid_settlement",
        "Prepared invoice items are required"
      );
    }
    if (
      input.command.complimentary === true &&
      ((input.command.settlements?.length ?? 0) > 0 ||
        input.command.paymentMethod != null)
    ) {
      throw new PosSettlementInitiateError(
        "invalid_settlement",
        "Complimentary Confirm cannot collect tender"
      );
    }
    if (
      !input.command.paymentIntentId.trim() ||
      input.command.paymentIntentId.length > 128 ||
      input.command.paymentIntentId === input.command.idempotencyKey ||
      (hasOrderId && input.command.paymentIntentId === String(commandOrderId))
    ) {
      throw new PosSettlementInitiateError(
        "invalid_payment_intent",
        "A legitimate paymentIntentId is required"
      );
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

    const itemsKey = preparedItemsKey(hasPreparedItems ? preparedItems : undefined);
    let order: NonNullable<Awaited<ReturnType<PosSettlementInitiateOrderLookup>>> | null =
      null;
    const orderStarted = clock.mark();
    if (!hasPreparedItems && hasOrderId) {
      order = await this.orderLookup(commandOrderId as number);
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
      if (!isCashierFinalizableOrderingChannel(order.orderingChannel)) {
        throw new PosSettlementInitiateError(
          "order_not_eligible",
          "Order is not eligible for Cashier financial finalization"
        );
      }
      if (order.status === "cancelled") {
        throw new PosSettlementInitiateError(
          "order_not_eligible",
          "Order is not eligible"
        );
      }
    } else {
      orderLoadMs = clock.since(orderStarted);
    }

    const fingerprint = fingerprintOf({
      restaurantId: context.restaurantId,
      terminalId: context.terminalId,
      userId: context.userId,
      orderId: order?.id ?? null,
      itemsKey,
      paymentIntentId: input.command.paymentIntentId,
      paymentMethod: input.command.paymentMethod ?? null,
      settlements: input.command.settlements,
      billDiscountAmount: input.command.billDiscountAmount ?? null,
      complimentary: input.command.complimentary === true,
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
          paidReceipt: existing.paidReceipt ?? null,
        });
      }

      const contextStarted = clock.mark();
      const crmp = await this.registerShift
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
        });
      const operational = crmp.operational;
      settlementContextMs = clock.since(contextStarted);
      settlementContextCompletedAt = new Date().toISOString();
      ensureCheckMs = 0;
      checkLoadMs = 0;

      if (hasPreparedItems) {
        const existingByKey = await findCollectionFactByIdempotency({
          restaurantId: context.restaurantId,
          idempotencyKey: input.command.idempotencyKey,
        });
        if (existingByKey) {
          const persistedOrder = await this.orderLookup(existingByKey.orderId);
          if (!persistedOrder) {
            throw new PosSettlementInitiateError(
              "order_not_found",
              "Order not found"
            );
          }
          const persistedItems =
            (await getOrderItemsByOrderId(persistedOrder.id)) ?? [];
          if (
            !cashierIntentMatchesExistingFact({
              command: input.command,
              fact: existingByKey,
              orderItems: persistedItems,
            })
          ) {
            throw new PosSettlementInitiateError(
              "idempotency_conflict",
              "Idempotency key was already used for a different settlement"
            );
          }
          const factView = collectionFactToLookup(existingByKey);
          const paidReceipt = await paidReceiptFromExistingFact({
            order: persistedOrder,
            fact: factView,
            cashierUserId: context.userId,
            cashierDisplayName: input.user.name,
            terminalId: context.terminalId,
          });
          scheduleReplayDownstream({
            restaurantId: context.restaurantId,
            orderId: persistedOrder.id,
            command: input.command,
            settlementContext: crmp.settlementContext,
            registerId: operational.registerId,
            operatorUserId: context.userId,
            deviceId: operational.deviceId,
          });
          void this.idempotency
            .put({
              restaurantId: context.restaurantId,
              terminalId: context.terminalId,
              userId: context.userId,
              idempotencyKey: input.command.idempotencyKey,
              fingerprint,
              orderId: persistedOrder.id,
              checkId: posCheckIdFromFact(existingByKey.checkId),
              outcome: "paid",
              grandTotal: existingByKey.amount,
              settlementRecordId: null,
              sessionId: null,
              registerId: operational.registerId,
              financialShiftId: operational.financialShiftId,
              createdAt: new Date().toISOString(),
              paidReceipt,
            })
            .catch(() => undefined);
          return resultFrom({
            checkId: posCheckIdFromFact(existingByKey.checkId),
            orderId: persistedOrder.id,
            restaurantId: context.restaurantId,
            grandTotal: existingByKey.amount,
            settlementRecordId: null,
            sessionId: null,
            terminalId: context.terminalId,
            cashierUserId: context.userId,
            registerId: operational.registerId,
            financialShiftId: operational.financialShiftId,
            replayed: true,
            paidReceipt,
          });
        }

        const settlements = resolveCommandSettlements(input.command);
        const txnStarted = clock.mark();
        financialTransactionStartedAt = new Date(txnStarted).toISOString();
        try {
          const placeOrder =
            this.placeOrder ??
            (await import("../../order/placeOrderComposition")).identityPlaceOrderService;
          const finalized = await finalizeCashierPreparedInvoice(placeOrder, {
            restaurantId: context.restaurantId,
            terminalId: context.terminalId,
            items: preparedItems,
            billDiscountAmount: input.command.billDiscountAmount,
            settlements,
            complimentary: input.command.complimentary === true,
            paymentIntentId: input.command.paymentIntentId,
            idempotencyKey: input.command.idempotencyKey,
            actorUserId: context.userId,
            actorDisplayName: input.user.name,
            settlementContext: crmp.settlementContext,
            settlementContextHints: {
              registerId: operational.registerId,
              operatorUserId: context.userId,
              deviceId: operational.deviceId,
            },
          });
          financialTxnMs = clock.since(txnStarted);
          void this.idempotency
            .put({
              restaurantId: context.restaurantId,
              terminalId: context.terminalId,
              userId: context.userId,
              idempotencyKey: input.command.idempotencyKey,
              fingerprint,
              orderId: finalized.orderId,
              checkId: 0,
              outcome: "paid",
              grandTotal: finalized.grandTotal,
              settlementRecordId: null,
              sessionId: null,
              registerId: operational.registerId,
              financialShiftId: operational.financialShiftId,
              createdAt: new Date().toISOString(),
              paidReceipt: finalized.paidReceipt,
            })
            .catch(() => undefined);
          return resultFrom({
            checkId: 0,
            orderId: finalized.orderId,
            restaurantId: context.restaurantId,
            grandTotal: finalized.grandTotal,
            settlementRecordId: null,
            sessionId: null,
            terminalId: context.terminalId,
            cashierUserId: context.userId,
            registerId: operational.registerId,
            financialShiftId: operational.financialShiftId,
            replayed: false,
            paidReceipt: finalized.paidReceipt,
          });
        } catch (err) {
          if (err instanceof CollectionFactError) {
            throw new PosSettlementInitiateError(
              err.code === "CONFLICT"
                ? "idempotency_conflict"
                : "collection_fact_rejected",
              err.message
            );
          }
          throw err;
        }
      }

      if (!order) {
        throw new PosSettlementInitiateError("order_not_found", "Order not found");
      }

      const existingFact = await this.productionCollectionFactByOrderLookup({
        restaurantId: context.restaurantId,
        orderId: order.id,
      });
      if (existingFact) {
        // Collection Fact is the authoritative replay source. Check/ST/OS/SR
        // are downstream operational state and cannot gate Cashier success.
        const paidReceipt = await paidReceiptFromExistingFact({
          order,
          fact: existingFact,
          cashierUserId: context.userId,
          cashierDisplayName: input.user.name,
          terminalId: context.terminalId,
        });
        scheduleReplayDownstream({
          restaurantId: context.restaurantId,
          orderId: order.id,
          command: input.command,
          settlementContext: crmp.settlementContext,
          registerId: operational.registerId,
          operatorUserId: context.userId,
          deviceId: operational.deviceId,
        });
        void this.idempotency.put({
          restaurantId: context.restaurantId,
          terminalId: context.terminalId,
          userId: context.userId,
          idempotencyKey: input.command.idempotencyKey,
          fingerprint,
          orderId: order.id,
          checkId: posCheckIdFromFact(existingFact.checkId),
          outcome: "paid",
          grandTotal: existingFact.amount,
          settlementRecordId: null,
          sessionId: null,
          registerId: operational.registerId,
          financialShiftId: operational.financialShiftId,
          createdAt: new Date().toISOString(),
          paidReceipt,
        }).catch(() => undefined);
        return resultFrom({
          checkId: posCheckIdFromFact(existingFact.checkId),
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
          paidReceipt,
        });
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
          actorDisplayName: input.user.name,
          ...(input.command.complimentary === true
            ? { complimentary: true }
            : {}),
          ...(settlements && !input.command.complimentary
            ? { settlements }
            : {}),
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
        if (committedFactAfterFailure) {
          const paidReceipt = await paidReceiptFromExistingFact({
            order,
            fact: committedFactAfterFailure,
            cashierUserId: context.userId,
            cashierDisplayName: input.user.name,
            terminalId: context.terminalId,
          });
          scheduleReplayDownstream({
            restaurantId: context.restaurantId,
            orderId: order.id,
            command: input.command,
            settlementContext: crmp.settlementContext,
            registerId: operational.registerId,
            operatorUserId: context.userId,
            deviceId: operational.deviceId,
          });
          void this.idempotency.put({
            restaurantId: context.restaurantId,
            terminalId: context.terminalId,
            userId: context.userId,
            idempotencyKey: input.command.idempotencyKey,
            fingerprint,
            orderId: order.id,
            checkId: posCheckIdFromFact(committedFactAfterFailure.checkId),
            outcome: "paid",
            grandTotal: committedFactAfterFailure.amount,
            settlementRecordId: null,
            sessionId: null,
            registerId: operational.registerId,
            financialShiftId: operational.financialShiftId,
            createdAt: new Date().toISOString(),
            paidReceipt,
          }).catch(() => undefined);
          return resultFrom({
            checkId: posCheckIdFromFact(committedFactAfterFailure.checkId),
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
            paidReceipt,
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
          if (committedFact) {
            // A concurrent command may lose operational Check work after the
            // financial fact committed. Replaying that fact is still PAID.
            const paidReceipt = await paidReceiptFromExistingFact({
              order,
              fact: committedFact,
              cashierUserId: context.userId,
              cashierDisplayName: input.user.name,
              terminalId: context.terminalId,
            });
            scheduleReplayDownstream({
              restaurantId: context.restaurantId,
              orderId: order.id,
              command: input.command,
              settlementContext: crmp.settlementContext,
              registerId: operational.registerId,
              operatorUserId: context.userId,
              deviceId: operational.deviceId,
            });
            void this.idempotency.put({
              restaurantId: context.restaurantId,
              terminalId: context.terminalId,
              userId: context.userId,
              idempotencyKey: input.command.idempotencyKey,
              fingerprint,
              orderId: order.id,
              checkId: posCheckIdFromFact(committedFact.checkId),
              outcome: "paid",
              grandTotal: committedFact.amount,
              settlementRecordId: null,
              sessionId: null,
              registerId: operational.registerId,
              financialShiftId: operational.financialShiftId,
              createdAt: new Date().toISOString(),
              paidReceipt,
            }).catch(() => undefined);
            return resultFrom({
              checkId: posCheckIdFromFact(committedFact.checkId),
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
              paidReceipt,
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
        paidReceipt: settled.paidReceipt ?? null,
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
        paidReceipt: settled.paidReceipt ?? null,
      });
    });
  }
}
