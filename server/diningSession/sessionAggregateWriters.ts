/**
 * SESSION-AGGREGATES-1 Phase A — write-only session aggregate maintenance.
 * Readers (workspace, dashboards) are unchanged until Phase B.
 */
import { getOrdersBySessionId, type SessionLinkedOrderRow } from "../db";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { opsLog } from "../_core/opsLog";
import { computeOrdersTotalAmount } from "./sessionOrderTotals";
import { findSessionById, updateSessionAggregates } from "./sessionRepository";
import { DiningSessionValidationError } from "./sessionTypes";
import { recalculateOpenCheckForSession } from "../operational-session/check/CheckService";
import { dualWriteEnrollOrderForSession } from "../operational-session/check/checkMembershipService";

export type IncrementSessionAggregatesForOrderInput = {
  restaurantId: number;
  sessionId: number;
  orderTotalAmount: string;
  /** CHECK-GENERALIZATION-M1 — dual-write membership when provided. */
  orderId?: number;
};

export type DecrementSessionAggregatesForCancelledOrderInput = {
  restaurantId: number;
  sessionId: number;
  orderTotalAmount: string;
};

function assertPositiveInteger(value: number, field: string): void {
  if (!Number.isInteger(value) || value <= 0) {
    throw new DiningSessionValidationError(`Invalid ${field}`);
  }
}

function computeNonCancelledOrderCount(
  orderRows: ReadonlyArray<Pick<SessionLinkedOrderRow, "status">>
): number {
  return orderRows.reduce(
    (count, row) => (row.status === "cancelled" ? count : count + 1),
    0
  );
}

function amountsEqual(a: string | null | undefined, b: string): boolean {
  const left = Number.parseFloat(String(a ?? "0"));
  const right = Number.parseFloat(b);
  if (!Number.isFinite(left) || !Number.isFinite(right)) return false;
  return Math.abs(left - right) < 0.005;
}

/** DEV/OPS — compare maintained columns vs read-time computation; never blocks callers. */
export async function logSessionAggregateDriftIfAny(input: {
  restaurantId: number;
  sessionId: number;
  procedure?: string;
}): Promise<void> {
  try {
    const session = await findSessionById(input.sessionId);
    if (!session || session.restaurantId !== input.restaurantId) {
      return;
    }

    const orderRows = await getOrdersBySessionId(input.restaurantId, input.sessionId);
    const computedOrders = computeNonCancelledOrderCount(orderRows);
    const computedAmount = computeOrdersTotalAmount(orderRows);
    const maintainedOrders = session.totalOrders ?? 0;
    const maintainedAmount = session.totalAmount ?? "0.00";

    if (
      maintainedOrders === computedOrders &&
      amountsEqual(maintainedAmount, computedAmount)
    ) {
      return;
    }

    opsLog({
      type: OPS_EVENT.session_aggregate_drift_detected,
      category: "ORDER",
      severity: "warn",
      ts: new Date().toISOString(),
      restaurantId: input.restaurantId,
      procedure: input.procedure,
      metadata: {
        sessionId: input.sessionId,
        maintainedOrders,
        computedOrders,
        maintainedAmount: String(maintainedAmount),
        computedAmount,
      },
    });
  } catch {
    /* drift monitoring is best-effort */
  }
}

/**
 * Phase A — increment session rollups after a linked order is created.
 * Non-blocking for order.create: failures are ops-logged only.
 */
export async function incrementSessionAggregatesForOrder(
  input: IncrementSessionAggregatesForOrderInput,
  options?: { procedure?: string }
): Promise<void> {
  assertPositiveInteger(input.restaurantId, "restaurantId");
  assertPositiveInteger(input.sessionId, "sessionId");

  const amount = Number.parseFloat(input.orderTotalAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new DiningSessionValidationError("Invalid orderTotalAmount");
  }

  await updateSessionAggregates({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    totalOrdersDelta: 1,
    totalAmountDelta: input.orderTotalAmount,
  });

  // CHECK-GENERALIZATION-M1 — dual-write membership (best-effort).
  if (input.orderId != null) {
    await dualWriteEnrollOrderForSession({
      restaurantId: input.restaurantId,
      sessionId: input.sessionId,
      orderId: input.orderId,
      enrolledReason: "session_attach",
    });
  }

  // CHECK-MANAGEMENT-ARCHITECTURE-1 — open Check totals follow Session order money.
  // M1: Session discovery remains authoritative (no membership-based subtotal).
  await recalculateOpenCheckForSession({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
  });

  await logSessionAggregateDriftIfAny({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    procedure: options?.procedure,
  });
}

/**
 * Phase A.1 — decrement session rollups when a linked order is cancelled.
 * Call only when transitioning into cancelled from a non-cancelled status.
 */
export async function decrementSessionAggregatesForCancelledOrder(
  input: DecrementSessionAggregatesForCancelledOrderInput,
  options?: { procedure?: string }
): Promise<void> {
  assertPositiveInteger(input.restaurantId, "restaurantId");
  assertPositiveInteger(input.sessionId, "sessionId");

  const amount = Number.parseFloat(input.orderTotalAmount);
  if (!Number.isFinite(amount) || amount < 0) {
    throw new DiningSessionValidationError("Invalid orderTotalAmount");
  }

  await updateSessionAggregates({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    totalOrdersDelta: -1,
    totalAmountDelta: (-amount).toFixed(2),
  });

  await recalculateOpenCheckForSession({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
  });

  await logSessionAggregateDriftIfAny({
    restaurantId: input.restaurantId,
    sessionId: input.sessionId,
    procedure: options?.procedure,
  });
}
