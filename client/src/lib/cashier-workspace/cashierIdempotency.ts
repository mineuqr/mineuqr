/**
 * POS-CASHIER-WORKSPACE-IMPLEMENTATION-1
 * Client idempotency keys for existing POS commands. Not domain identity.
 */

export function newCashierIdempotencyKey(kind: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `cashier-${kind}-${rand}`;
}

/** Payment-attempt identity. Distinct from orderId, idempotencyKey, and collectionFactId. */
export function newCashierPaymentIntentId(): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `cpi_${rand}`;
}
