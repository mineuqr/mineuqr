/**
 * POS-CHECK-INTAKE-IMPLEMENTATION-1
 * POS Check Intake is a command into the existing Check Domain.
 * POS does not own Check, Settlement, Register, or pricing.
 */

import { createHash } from "node:crypto";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { opsLog } from "../../_core/opsLog";
import { getOrderById } from "../../db";
import { ensureCheckForOrder } from "../../operational-session/check/CheckService";
import { CheckMembershipError } from "../../operational-session/check/checkMembershipService";
import type { OperationalCheck } from "@shared/operational-session";
import { assertRestaurantPosScope } from "../authorization/assertRestaurantPosScope";
import type { PosCheckIntakeIdempotencyStore } from "../infrastructure/PosCheckIntakeIdempotencyStore";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";
import { PosAccessService } from "./PosAccessService";
import type { SelectUser } from "../../../drizzle/schema";

export class PosCheckIntakeError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "PosCheckIntakeError";
    this.code = code;
  }
}

export type PosCheckIntakeCommand = {
  restaurantId: number;
  terminalId: string;
  orderId: number;
  idempotencyKey: string;
};

export type PosCheckIntakeResult = {
  checkId: number;
  orderId: number;
  restaurantId: number;
  outcome: "open";
  sessionId: null;
  orderingChannel: typeof ORDERING_CHANNEL_CASHIER_POS;
  terminalId: string;
  cashierUserId: number;
  replayed: boolean;
};

export type PosCheckIntakeOrderLookup = (orderId: number) => Promise<{
  id: number;
  restaurantId: number;
  orderingChannel?: string | null;
  status?: string | null;
} | null>;

export type PosCheckEnsure = (input: {
  restaurantId: number;
  orderId: number;
}) => Promise<Pick<OperationalCheck, "id" | "restaurantId" | "sessionId" | "outcome">>;

const AUTH_DENIED_CODES = new Set([
  "pos_permission_denied",
  "terminal_not_found",
  "terminal_foreign",
  "terminal_inactive",
  "entitlement_unavailable",
]);

function fingerprintOf(input: {
  restaurantId: number;
  terminalId: string;
  userId: number;
  orderId: number;
}): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        restaurantId: input.restaurantId,
        terminalId: input.terminalId,
        userId: input.userId,
        orderId: input.orderId,
      })
    )
    .digest("hex");
}

function assertIdempotencyKey(key: string): void {
  if (!key.trim() || key.length < 8 || key.length > 128) {
    throw new PosCheckIntakeError("invalid_idempotency_key", "Idempotency key is required");
  }
}

export class PosCheckIntakeService {
  constructor(
    private readonly grants: PosPermissionGrantStore,
    private readonly access: PosAccessService,
    private readonly idempotency: PosCheckIntakeIdempotencyStore,
    private readonly orderLookup: PosCheckIntakeOrderLookup = getOrderById,
    private readonly ensureCheck: PosCheckEnsure = ensureCheckForOrder
  ) {}

  async intake(input: {
    user: SelectUser;
    command: PosCheckIntakeCommand;
  }): Promise<PosCheckIntakeResult> {
    assertIdempotencyKey(input.command.idempotencyKey);
    if (!Number.isInteger(input.command.orderId) || input.command.orderId <= 0) {
      throw new PosCheckIntakeError("order_not_found", "Order is invalid");
    }

    const scope = await assertRestaurantPosScope(
      { user: input.user },
      input.command.restaurantId,
      this.grants,
      "pos.check.intake"
    );
    const decision = await this.access.resolvePosTerminalAccess({
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      userId: input.user.id,
      requiredPermission: "CHECK_INTAKE",
      restaurantScope: scope.kind,
    });
    if (!decision.allowed || !decision.context) {
      throw new PosCheckIntakeError(
        AUTH_DENIED_CODES.has(decision.reasonCode)
          ? decision.reasonCode
          : "pos_permission_denied",
        "غير مصرح بالوصول"
      );
    }
    const context = decision.context;
    if (
      !context.permissions.includes("POS_ACCESS") ||
      !context.permissions.includes("CHECK_INTAKE")
    ) {
      throw new PosCheckIntakeError("pos_permission_denied", "غير مصرح بالوصول");
    }

    const order = await this.orderLookup(input.command.orderId);
    if (!order) {
      throw new PosCheckIntakeError("order_not_found", "Order not found");
    }
    if (order.restaurantId !== context.restaurantId) {
      throw new PosCheckIntakeError(
        "order_wrong_restaurant",
        "Order does not belong to this restaurant"
      );
    }
    if (order.orderingChannel !== ORDERING_CHANNEL_CASHIER_POS) {
      throw new PosCheckIntakeError(
        "order_not_eligible",
        "Order is not a direct POS Sale"
      );
    }
    if (order.status === "cancelled") {
      throw new PosCheckIntakeError("order_not_eligible", "Order is not eligible");
    }

    const fingerprint = fingerprintOf({
      restaurantId: context.restaurantId,
      terminalId: context.terminalId,
      userId: context.userId,
      orderId: order.id,
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
          throw new PosCheckIntakeError(
            "idempotency_conflict",
            "Idempotency key was already used for a different intake"
          );
        }
        return {
          checkId: existing.checkId,
          orderId: existing.orderId,
          restaurantId: context.restaurantId,
          outcome: "open",
          sessionId: null,
          orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
          terminalId: context.terminalId,
          cashierUserId: context.userId,
          replayed: true,
        };
      }

      let check: Awaited<ReturnType<PosCheckEnsure>>;
      try {
        check = await this.ensureCheck({
          restaurantId: context.restaurantId,
          orderId: order.id,
        });
      } catch (err) {
        if (err instanceof CheckMembershipError) {
          throw new PosCheckIntakeError(
            "order_not_eligible",
            "Order is already enrolled on a terminal Check"
          );
        }
        throw err;
      }

      if (check.restaurantId !== context.restaurantId) {
        throw new PosCheckIntakeError(
          "order_wrong_restaurant",
          "Check does not belong to this restaurant"
        );
      }
      if (check.outcome !== "open") {
        throw new PosCheckIntakeError(
          "check_not_open",
          "Check is not in an intake-eligible state"
        );
      }
      if (check.sessionId != null) {
        throw new PosCheckIntakeError(
          "order_not_eligible",
          "POS Check Intake must remain sessionless"
        );
      }

      await this.idempotency.put({
        restaurantId: context.restaurantId,
        terminalId: context.terminalId,
        userId: context.userId,
        idempotencyKey: input.command.idempotencyKey,
        fingerprint,
        orderId: order.id,
        checkId: check.id,
        outcome: "open",
        sessionId: null,
        createdAt: new Date().toISOString(),
      });

      opsLog({
        type: "pos_check_intake",
        category: "ORDER",
        severity: "info",
        ts: new Date().toISOString(),
        actorId: context.userId,
        restaurantId: context.restaurantId,
        action: "pos.check.intake",
        metadata: {
          orderId: order.id,
          checkId: check.id,
          terminalId: context.terminalId,
          orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        },
      });

      return {
        checkId: check.id,
        orderId: order.id,
        restaurantId: context.restaurantId,
        outcome: "open",
        sessionId: null,
        orderingChannel: ORDERING_CHANNEL_CASHIER_POS,
        terminalId: context.terminalId,
        cashierUserId: context.userId,
        replayed: false,
      };
    });
  }
}
