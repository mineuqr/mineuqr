/**
 * POS-SETTLEMENT-INITIATE-IMPLEMENTATION-1
 * POS Settlement Initiation is a command into the existing Check / Financial
 * Settlement Platform. POS does not own Check, Settlement, Register, or totals.
 */

import { createHash } from "node:crypto";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import {
  CHECK_TERMINAL_OUTCOMES,
  type SelectablePaymentMethod,
  type StaffSettlementLineInput,
} from "@shared/operational-session";
import { opsLog } from "../../_core/opsLog";
import { getOrderById } from "../../db";
import {
  CheckTransitionError,
  ensureCheckForOrder,
  getCheckById,
  settleCheckPaidByIdDetailed,
} from "../../operational-session/check/CheckService";
import { findBlockingMembershipForOrder } from "../../operational-session/check/checkOrderMembershipRepository";
import { assertRestaurantPosScope } from "../authorization/assertRestaurantPosScope";
import type { PosSettlementInitiateIdempotencyStore } from "../infrastructure/PosSettlementInitiateIdempotencyStore";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";
import { PosAccessService } from "./PosAccessService";
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
  /** Canonical catalog key forwarded to Check. Not a POS amount. */
  paymentMethod?: SelectablePaymentMethod;
  /**
   * Existing Check staff settlement lines. When present, forwarded as-is.
   * Multi-line amounts must sum to Check grandTotal (Check-owned validation).
   */
  settlements?: readonly StaffSettlementLineInput[];
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

export type PosSettlementEnsureCheck = (input: {
  restaurantId: number;
  orderId: number;
}) => Promise<{ id: number; outcome: string }>;

export type PosSettlementSettlePaid = (input: {
  restaurantId: number;
  checkId: number;
  settlementContextHints: {
    registerId: string;
    operatorUserId: number;
    deviceId?: string | null;
  };
  settlements?: readonly StaffSettlementLineInput[];
}) => Promise<{
  check: PosSettlementCheckView;
  settlementRecordId: string | null;
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
  paymentMethod?: SelectablePaymentMethod | null;
  settlements?: readonly StaffSettlementLineInput[];
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
        paymentMethod: input.paymentMethod ?? null,
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
  checkId: number;
  settlementContextHints: {
    registerId: string;
    operatorUserId: number;
    deviceId?: string | null;
  };
  settlements?: readonly StaffSettlementLineInput[];
}): Promise<{
  check: PosSettlementCheckView;
  settlementRecordId: string | null;
}> {
  const financial = await settleCheckPaidByIdDetailed({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    settlements: input.settlements,
    settlementContextHints: {
      registerId: input.settlementContextHints.registerId,
      operatorUserId: input.settlementContextHints.operatorUserId,
      deviceId: input.settlementContextHints.deviceId,
    },
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
  };
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
    private readonly ensureCheck: PosSettlementEnsureCheck | null = ensureCheckForOrder
  ) {}

  async initiate(input: {
    user: SelectUser;
    command: PosSettlementInitiateCommand;
  }): Promise<PosSettlementInitiateResult> {
    assertIdempotencyKey(input.command.idempotencyKey);
    if (!Number.isInteger(input.command.orderId) || input.command.orderId <= 0) {
      throw new PosSettlementInitiateError("order_not_found", "Order is invalid");
    }

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

    const order = await this.orderLookup(input.command.orderId);
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
      paymentMethod: input.command.paymentMethod ?? null,
      settlements: input.command.settlements,
    });
    const idempotencyKey = {
      restaurantId: context.restaurantId,
      terminalId: context.terminalId,
      userId: context.userId,
      idempotencyKey: input.command.idempotencyKey,
    };

    return this.idempotency.runExclusive(idempotencyKey, async () => {
      const existing = await this.idempotency.get(idempotencyKey);
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

      const [foundMembership, operational] = await Promise.all([
        this.membershipLookup(context.restaurantId, order.id),
        this.registerShift
          .requireForSettlement({
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
      let membership = foundMembership;
      if (!membership && this.ensureCheck) {
        try {
          const created = await this.ensureCheck({
            restaurantId: context.restaurantId,
            orderId: order.id,
          });
          membership = {
            checkId: created.id,
            checkOutcome: created.outcome,
          };
        } catch {
          // CASHIER-ORDER-AND-CHECKOUT-LATENCY-FORENSICS-1 — background
          // pos.check.intake may win the create race. Re-read membership
          // instead of failing the first تأكيد الدفع as check_not_found.
          membership = await this.membershipLookup(
            context.restaurantId,
            order.id
          );
        }
      }
      if (!membership) {
        throw new PosSettlementInitiateError(
          "check_not_found",
          "Check not found"
        );
      }

      const check = await this.checkLookup({
        restaurantId: context.restaurantId,
        checkId: membership.checkId,
      });
      if (!check) {
        throw new PosSettlementInitiateError(
          "check_not_found",
          "Check not found"
        );
      }
      if (check.restaurantId !== context.restaurantId) {
        throw new PosSettlementInitiateError(
          "check_wrong_restaurant",
          "Check does not belong to this restaurant"
        );
      }
      if ((CHECK_TERMINAL_OUTCOMES as readonly string[]).includes(check.outcome)) {
        throw new PosSettlementInitiateError(
          "check_already_terminal",
          "Check is already terminal"
        );
      }
      if (check.outcome !== "open") {
        throw new PosSettlementInitiateError(
          "check_not_eligible",
          "Check is not eligible for settlement initiation"
        );
      }

      const settlements = resolveCommandSettlements(input.command);

      let settled: Awaited<ReturnType<PosSettlementSettlePaid>>;
      try {
        settled = await this.settlePaid({
          restaurantId: context.restaurantId,
          checkId: check.id,
          settlementContextHints: {
            registerId: operational.registerId,
            operatorUserId: context.userId,
            deviceId: operational.deviceId,
          },
          ...(settlements ? { settlements } : {}),
        });
      } catch (err) {
        if (err instanceof CheckTransitionError) {
          const raced = await this.checkLookup({
            restaurantId: context.restaurantId,
            checkId: check.id,
          });
          if (
            raced &&
            raced.restaurantId === context.restaurantId &&
            raced.outcome === "paid"
          ) {
            await this.idempotency.put({
              restaurantId: context.restaurantId,
              terminalId: context.terminalId,
              userId: context.userId,
              idempotencyKey: input.command.idempotencyKey,
              fingerprint,
              orderId: order.id,
              checkId: raced.id,
              outcome: "paid",
              grandTotal: raced.grandTotal,
              settlementRecordId: null,
              sessionId: raced.sessionId,
              registerId: operational.registerId,
              financialShiftId: operational.financialShiftId,
              createdAt: new Date().toISOString(),
            });
            return resultFrom({
              checkId: raced.id,
              orderId: order.id,
              restaurantId: context.restaurantId,
              grandTotal: raced.grandTotal,
              settlementRecordId: null,
              sessionId: raced.sessionId,
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
      if (settled.check.outcome !== "paid") {
        throw new PosSettlementInitiateError(
          "check_not_eligible",
          "Check is not eligible for settlement initiation"
        );
      }

      await this.idempotency.put({
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
      });

      opsLog({
        type: "pos_settlement_initiate",
        category: "ORDER",
        severity: "info",
        ts: new Date().toISOString(),
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
