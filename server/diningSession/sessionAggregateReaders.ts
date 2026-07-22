/**
 * SESSION-AGGREGATES-1 Phase B — aggregate-first workspace readers with computed fallback.
 */
import type { SelectDiningSession } from "../../drizzle/schema";
import { OPS_EVENT } from "../_core/opsTaxonomy";
import { opsLog } from "../_core/opsLog";
import type { SessionLinkedOrderRow } from "../db";
import { computeOrdersTotalAmount } from "./sessionOrderTotals";

export type AggregateSource = "maintained" | "computed" | "check";

export type SessionAggregateFallbackReason =
  | "missing_total_orders"
  | "missing_total_amount"
  | "invalid_value";

export type ResolvedSessionAggregates = {
  orderCount: number;
  ordersTotalAmount: string;
  aggregateSource: AggregateSource;
};

export type ResolveSessionAggregatesInput = {
  session: Pick<SelectDiningSession, "id" | "totalOrders" | "totalAmount">;
  orderRows: ReadonlyArray<SessionLinkedOrderRow>;
  restaurantId: number;
  procedure?: string;
};

function computeSessionAggregatesFromOrders(
  orderRows: ReadonlyArray<SessionLinkedOrderRow>
): Pick<ResolvedSessionAggregates, "orderCount" | "ordersTotalAmount"> {
  return {
    orderCount: orderRows.length,
    ordersTotalAmount: computeOrdersTotalAmount(orderRows),
  };
}

/** Exported for unit tests. */
export function getMaintainedAggregateFallbackReason(
  session: Pick<SelectDiningSession, "totalOrders" | "totalAmount">
): SessionAggregateFallbackReason | null {
  if (session.totalOrders == null) {
    return "missing_total_orders";
  }
  if (session.totalAmount == null) {
    return "missing_total_amount";
  }
  if (!Number.isInteger(session.totalOrders) || session.totalOrders < 0) {
    return "invalid_value";
  }
  const amount = Number.parseFloat(String(session.totalAmount));
  if (!Number.isFinite(amount) || amount < 0) {
    return "invalid_value";
  }
  return null;
}

function logAggregateReaderFallback(input: {
  restaurantId: number;
  sessionId: number;
  reason: SessionAggregateFallbackReason;
  procedure?: string;
}): void {
  opsLog({
    type: OPS_EVENT.session_aggregate_reader_fallback,
    category: "ORDER",
    severity: "info",
    ts: new Date().toISOString(),
    restaurantId: input.restaurantId,
    procedure: input.procedure,
    metadata: {
      sessionId: input.sessionId,
      reason: input.reason,
    },
  });
}

export function resolveSessionAggregates(
  input: ResolveSessionAggregatesInput
): ResolvedSessionAggregates {
  const fallbackReason = getMaintainedAggregateFallbackReason(input.session);

  if (fallbackReason) {
    logAggregateReaderFallback({
      restaurantId: input.restaurantId,
      sessionId: input.session.id,
      reason: fallbackReason,
      procedure: input.procedure,
    });

    return {
      ...computeSessionAggregatesFromOrders(input.orderRows),
      aggregateSource: "computed",
    };
  }

  return {
    orderCount: input.session.totalOrders,
    ordersTotalAmount: Number.parseFloat(String(input.session.totalAmount)).toFixed(2),
    aggregateSource: "maintained",
  };
}
