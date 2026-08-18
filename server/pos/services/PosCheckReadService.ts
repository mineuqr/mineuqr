/**
 * CASHIER-POS-CHECK-READ-CONTRACT-1
 * POS-authorized read of Check-owned payable state for an Order.
 * Reuses membership + getCheckById. Does not own Check. Does not settle.
 * Does not read Order Settlement projection.
 */

import type { CheckOutcome, OperationalCheck } from "@shared/operational-session";
import { CHECK_OUTCOMES } from "@shared/operational-session";
import type { SelectUser } from "../../../drizzle/schema";
import { getOrderById } from "../../db";
import { getCheckById } from "../../operational-session/check/CheckService";
import { findBlockingMembershipForOrder } from "../../operational-session/check/checkOrderMembershipRepository";
import type { PosPermissionGrantStore } from "../infrastructure/PosPermissionGrantStore";
import type { PosOrderCheckDto } from "../read/posCheckDto";
import { PosAccessService } from "./PosAccessService";
import { PosReadError } from "./PosReadError";
import { requirePosReadContext } from "./requirePosReadContext";

export type PosCheckReadOrderLookup = (orderId: number) => Promise<{
  id: number;
  restaurantId: number;
} | null>;

export type PosCheckReadMembershipLookup = (
  restaurantId: number,
  orderId: number
) => Promise<{ checkId: number; checkOutcome: string } | null>;

export type PosCheckReadCheckLookup = (input: {
  restaurantId: number;
  checkId: number;
}) => Promise<Pick<
  OperationalCheck,
  "id" | "restaurantId" | "outcome" | "grandTotal" | "subtotal" | "taxAmount"
> | null>;

function assertCheckOutcome(value: string): CheckOutcome {
  if (!(CHECK_OUTCOMES as readonly string[]).includes(value)) {
    throw new PosReadError("check_not_eligible", "Check outcome is invalid");
  }
  return value as CheckOutcome;
}

async function defaultMembershipLookup(
  restaurantId: number,
  orderId: number
): Promise<{ checkId: number; checkOutcome: string } | null> {
  const row = await findBlockingMembershipForOrder(restaurantId, orderId);
  if (!row) return null;
  return { checkId: row.membership.checkId, checkOutcome: row.checkOutcome };
}

export class PosCheckReadService {
  constructor(
    private readonly grants: PosPermissionGrantStore,
    private readonly access: PosAccessService,
    private readonly orderLookup: PosCheckReadOrderLookup = getOrderById,
    private readonly membershipLookup: PosCheckReadMembershipLookup = defaultMembershipLookup,
    private readonly checkLookup: PosCheckReadCheckLookup = getCheckById
  ) {}

  async getByOrder(input: {
    user: SelectUser;
    command: { restaurantId: number; terminalId: string; orderId: number };
  }): Promise<PosOrderCheckDto | null> {
    const context = await requirePosReadContext(this.access, this.grants, {
      user: input.user,
      restaurantId: input.command.restaurantId,
      terminalId: input.command.terminalId,
      procedure: "pos.read.check.getByOrder",
    });
    if (
      !Number.isInteger(input.command.orderId) ||
      input.command.orderId <= 0
    ) {
      throw new PosReadError("not_found", "Order not found");
    }

    const order = await this.orderLookup(input.command.orderId);
    if (!order || order.restaurantId !== context.restaurantId) {
      throw new PosReadError("not_found", "Order not found");
    }

    const membership = await this.membershipLookup(
      context.restaurantId,
      order.id
    );
    if (!membership) {
      return null;
    }

    const check = await this.checkLookup({
      restaurantId: context.restaurantId,
      checkId: membership.checkId,
    });
    if (!check) {
      throw new PosReadError("not_found", "Check not found");
    }
    if (check.restaurantId !== context.restaurantId) {
      throw new PosReadError("not_found", "Check not found");
    }

    return {
      checkId: check.id,
      orderId: order.id,
      restaurantId: context.restaurantId,
      outcome: assertCheckOutcome(check.outcome),
      grandTotal: String(check.grandTotal),
      subtotal: String(check.subtotal),
      taxAmount: String(check.taxAmount),
    };
  }
}
