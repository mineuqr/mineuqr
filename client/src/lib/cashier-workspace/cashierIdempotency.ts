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
