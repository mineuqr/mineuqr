/**
 * Session-local Confirm attempt identity. Not a second idempotency store.
 * Survives lost HTTP responses / refresh so the same key is retried.
 */

import type { CashierSaleAttemptLine } from "./cashierInvoiceView";

export type CashierPendingSaleAttempt = {
  idempotencyKey: string;
  paymentIntentId?: string;
  items: readonly CashierSaleAttemptLine[];
  /**
   * Incoming Confirm owner. Positive orderId binds the attempt to that Order.
   * Absent/null is POS (no Incoming Order) or a pre-scope legacy record.
   */
  orderId?: number | null;
};

function positiveOrderId(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value > 0
    ? value
    : null;
}

/**
 * CASHIER-INCOMING-CONFIRM-PENDING-ATTEMPT-SCOPE-1
 * orderId is identity. Item snapshot is same-Order retry validation only.
 * A legacy attempt without orderId cannot apply to a known Incoming Order.
 */
export function cashierPendingSaleAttemptAppliesToOrder(
  attempt: Pick<CashierPendingSaleAttempt, "orderId"> | null,
  currentOrderId: number | null
): boolean {
  if (!attempt) return false;
  const stored = positiveOrderId(attempt.orderId);
  const current = positiveOrderId(currentOrderId);
  if (current != null) return stored === current;
  return stored == null;
}

function storageKey(restaurantId: number): string {
  return `cashier-pending-sale:${restaurantId}`;
}

export function readCashierPendingSaleAttempt(
  restaurantId: number
): CashierPendingSaleAttempt | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(restaurantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CashierPendingSaleAttempt;
    if (
      typeof parsed?.idempotencyKey !== "string" ||
      parsed.idempotencyKey.length < 8 ||
      !Array.isArray(parsed.items) ||
      parsed.items.length === 0
    ) {
      return null;
    }
    const items: CashierSaleAttemptLine[] = [];
    for (const row of parsed.items) {
      if (
        !Number.isInteger(row?.menuItemId) ||
        row.menuItemId <= 0 ||
        !Number.isInteger(row?.quantity) ||
        row.quantity < 1
      ) {
        return null;
      }
      items.push({ menuItemId: row.menuItemId, quantity: row.quantity });
    }
    return {
      idempotencyKey: parsed.idempotencyKey,
      paymentIntentId:
        typeof parsed.paymentIntentId === "string" &&
        parsed.paymentIntentId.length >= 8
          ? parsed.paymentIntentId
          : undefined,
      items,
      orderId: positiveOrderId(parsed.orderId),
    };
  } catch {
    return null;
  }
}

export function writeCashierPendingSaleAttempt(
  restaurantId: number,
  attempt: CashierPendingSaleAttempt
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(restaurantId), JSON.stringify(attempt));
  } catch {
    /* private mode / quota — fail closed */
  }
}

export function clearCashierPendingSaleAttempt(restaurantId: number): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(restaurantId));
  } catch {
    /* ignore */
  }
}
