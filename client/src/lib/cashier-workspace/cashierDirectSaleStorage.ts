/**
 * Preserve prepared SALE/INVOICE across Register Ops navigation.
 * Dashboard URL remains SSOT; this is presentation snapshot only.
 * CASHIER-SALE-INVOICE-UX-REALIGNMENT-1 — retains sale.create money/lines.
 */

import type { SelectablePaymentMethod } from "@shared/operational-session";
import type {
  CashierInvoiceLineView,
  CashierSaleCreateMoney,
} from "./cashierInvoiceView";

export type CashierDirectSalePhase = "ticket" | "payment" | "paid";

export type CashierDirectSaleInvoiceSnapshot = {
  createdAt: string;
  money: CashierSaleCreateMoney;
  lines: readonly CashierInvoiceLineView[];
};

export type CashierDirectSaleSnapshot = {
  v: 1 | 2 | 3 | 4;
  orderId: number;
  orderNumber: string;
  displayReference: string;
  totalAmount: string;
  checkId: number | null;
  phase: CashierDirectSalePhase;
  paymentMethod: SelectablePaymentMethod | null;
  cashReceived: string;
  /** Presentation-only card amount. Omitted on older snapshots. */
  cardTender?: string;
  /** SALE-CUSTOMER-LINK-1 — draft Customer selection for resume. */
  selectedCustomer?: { id: number; displayName: string } | null;
  /** Prepared invoice from sale.create. Omitted on v1 snapshots. */
  invoice?: CashierDirectSaleInvoiceSnapshot;
  paid:
    | {
        checkId: number;
        orderId: number;
        grandTotal: string;
        settlementRecordId: string | null;
        paymentMethod: SelectablePaymentMethod;
        settlements?: readonly {
          paymentMethod: SelectablePaymentMethod;
          amount?: string;
        }[];
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
    if (
      (parsed?.v !== 1 &&
        parsed?.v !== 2 &&
        parsed?.v !== 3 &&
        parsed?.v !== 4) ||
      !Number.isInteger(parsed.orderId)
    ) {
      return null;
    }
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
