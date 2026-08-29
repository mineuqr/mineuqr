import { opsLog } from "../../_core/opsLog";
import { OPS_EVENT } from "../../_core/opsTaxonomy";

/**
 * ORDER-CREATE-LEGACY-FALLBACK-OUTBOX-SAFETY-1 — Order creation is atomic:
 * Order + Order Items + OrderCreated Outbox commit together or not at all.
 * Emitted when the create transaction fails and the create is refused, so a
 * refused create is distinguishable from a silent legacy fallback commit.
 * Never carries sessionToken, credentials, or customer payload.
 */
export type OrderCreatePersistenceFailureReason =
  | "transaction_failed"
  | "database_unavailable";

export function logOrderCreatePersistenceFailed(ctx: {
  restaurantId?: number;
  orderingChannel?: string;
  correlationId?: string;
  reason: OrderCreatePersistenceFailureReason;
  attempts?: number;
  error?: string;
}): void {
  opsLog({
    type: OPS_EVENT.order_create_persistence_failed,
    category: "ORDER",
    severity: "error",
    ts: new Date().toISOString(),
    restaurantId: ctx.restaurantId ?? null,
    correlationId: ctx.correlationId,
    metadata: {
      orderingChannel: ctx.orderingChannel,
      degradedReason: ctx.reason,
      attempts: ctx.attempts,
      error: ctx.error,
    },
  });
}

/**
 * ORDER-LIFECYCLE-ATOMICITY-AND-SESSION-CONSISTENCY-HARDENING-1 — Order status /
 * lifecycle updates are atomic: the Order row change + its required
 * OrderStatusChanged Outbox commit together or not at all. Emitted when the
 * update transaction fails and the update is refused, replacing the legacy
 * fallback that committed a status change while discarding its Outbox event.
 * Never carries sessionToken, trackingToken, credentials, or customer payload.
 */
export function logOrderUpdatePersistenceFailed(ctx: {
  orderId?: number;
  restaurantId?: number;
  correlationId?: string;
  reason: OrderCreatePersistenceFailureReason;
  attempts?: number;
  error?: string;
}): void {
  opsLog({
    type: OPS_EVENT.order_update_persistence_failed,
    category: "ORDER",
    severity: "error",
    ts: new Date().toISOString(),
    restaurantId: ctx.restaurantId ?? null,
    correlationId: ctx.correlationId,
    metadata: {
      orderId: ctx.orderId,
      degradedReason: ctx.reason,
      attempts: ctx.attempts,
      error: ctx.error,
    },
  });
}
