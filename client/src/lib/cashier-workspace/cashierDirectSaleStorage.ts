/**
 * Preserve direct-sale checkout across Register Ops navigation.
 * Dashboard URL remains SSOT; this is presentation snapshot only.
 */

import type { SelectablePaymentMethod } from "@shared/operational-session";

export type CashierDirectSalePhase = "payment" | "paid";

export type CashierDirectSaleSnapshot = {
  v: 1;
  orderId: number;
  orderNumber: string;
  displayReference: string;
  totalAmount: string;
  checkId: number | null;
  phase: CashierDirectSalePhase;
  paymentMethod: SelectablePaymentMethod | null;
  cashReceived: string;
  paid:
    | {
        checkId: number;
        orderId: number;
        grandTotal: string;
        settlementRecordId: string | null;
        paymentMethod: SelectablePaymentMethod;
      }
    | null;
};

function storageKey(restaurantId: number): string {
  return `cashier-direct-sale:${restaurantId}`;
}

export function readCashierDirectSale(
  restaurantId: number
): CashierDirectSaleSnapshot | null {
  if (typeof sessionStorage === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(storageKey(restaurantId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CashierDirectSaleSnapshot;
    if (parsed?.v !== 1 || !Number.isInteger(parsed.orderId)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function writeCashierDirectSale(
  restaurantId: number,
  snapshot: CashierDirectSaleSnapshot
): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(restaurantId), JSON.stringify(snapshot));
  } catch {
    /* private mode / quota — fail closed */
  }
}

export function clearCashierDirectSale(restaurantId: number): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(restaurantId));
  } catch {
    /* ignore */
  }
}
