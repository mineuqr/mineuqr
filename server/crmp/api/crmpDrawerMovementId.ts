/**
 * CRMP-DRAWER-MOVEMENT-API-1 — deterministic movement identity for retries.
 * Reuses crmp_drawer_movements.movementId uniqueness. No new column.
 */

import { createHash } from "node:crypto";

export function drawerMovementIdForRetry(input: {
  restaurantId: number;
  registerId: string;
  financialShiftId: string;
  actorUserId: number;
  idempotencyKey: string;
}): string {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        restaurantId: input.restaurantId,
        registerId: input.registerId,
        financialShiftId: input.financialShiftId,
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
      })
    )
    .digest("hex");
  return `mov_${digest}`;
}

/** Deterministic final-count identity for close retries. Reuses countId uniqueness. */
export function drawerCountIdForCloseRetry(input: {
  restaurantId: number;
  registerId: string;
  financialShiftId: string;
  actorUserId: number;
  idempotencyKey: string;
}): string {
  const digest = createHash("sha256")
    .update(
      JSON.stringify({
        kind: "financial_shift_close",
        restaurantId: input.restaurantId,
        registerId: input.registerId,
        financialShiftId: input.financialShiftId,
        actorUserId: input.actorUserId,
        idempotencyKey: input.idempotencyKey,
      })
    )
    .digest("hex");
  return `cnt_${digest}`;
}
