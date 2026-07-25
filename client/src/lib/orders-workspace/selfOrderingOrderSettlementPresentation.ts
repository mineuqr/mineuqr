/**
 * SELF-ORDERING-ORDER-SETTLEMENT-ADOPTION-1 — presentation helpers.
 *
 * Detects Self Ordering / Counter Pickup sessionless Orders for settle from
 * Orders Workspace. Money path remains StaffCounterPickupSettlementService.
 */

export function isSessionlessSelfOrderingOrder(order: {
  sessionId?: number | null;
}): boolean {
  return order.sessionId == null;
}

export function unpaidOrderIdSet(
  rows: readonly Readonly<{ orderId: number }>[] | undefined
): ReadonlySet<number> {
  return new Set((rows ?? []).map((r) => r.orderId));
}

export function unpaidGrandTotalForOrder(
  rows: readonly Readonly<{ orderId: number; grandTotal: string }>[] | undefined,
  orderId: number
): string | null {
  const hit = (rows ?? []).find((r) => r.orderId === orderId);
  return hit?.grandTotal ?? null;
}
