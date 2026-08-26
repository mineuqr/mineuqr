/**
 * CASHIER-PASS-2-INVOICE-IDENTITY-1
 * Session-local sale.create attempt identity. Not a second idempotency store.
 * Survives lost HTTP responses / refresh so the same key is retried.
 */

import type { CashierSaleAttemptLine } from "./cashierInvoiceView";

export type CashierPendingSaleAttempt = {
  idempotencyKey: string;
  items: readonly CashierSaleAttemptLine[];
};

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
    return { idempotencyKey: parsed.idempotencyKey, items };
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
