/**
 * CASHIER-PAID-RECEIPT-DATA-COMPLETENESS-1
 * Client snapshot of the Confirm HTTP paid-receipt projection.
 * Does not recalculate money. Does not use the live ticket.
 */

import type { CanonicalMonetaryPaymentMethod } from "@shared/operational-session";
import type { CashierLang } from "./cashierCopy";

export type CashierPaidReceiptInvoiceLine = Readonly<{
  nameAr: string;
  nameEn: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}>;

export type CashierPaidReceiptTender = Readonly<{
  paymentMethod: CanonicalMonetaryPaymentMethod;
  amount: string;
}>;

export type CashierPaidReceiptProjection = Readonly<{
  orderId: number;
  orderNumber: string;
  displayReference: string;
  invoiceNumber?: string | null;
  paidAt: string;
  cashierUserId: number;
  cashierDisplayName: string;
  terminalId: string;
  currencySymbol: string;
  lines: readonly CashierPaidReceiptInvoiceLine[];
  subtotal: string;
  discountAmount: string;
  taxAmount: string;
  grandTotal: string;
  tenders: readonly CashierPaidReceiptTender[];
}>;

export type CashierPaidReceiptSnapshot = CashierPaidReceiptProjection &
  Readonly<{
    restaurantName: string;
  }>;

export function buildCashierPaidReceiptSnapshot(input: {
  projection: CashierPaidReceiptProjection;
  restaurantName?: string | null;
}): CashierPaidReceiptSnapshot {
  return {
    ...input.projection,
    restaurantName: input.restaurantName?.trim() || "",
  };
}

export function formatCashierReceiptMoney(
  amount: string,
  currencySymbol: string
): string {
  if (!currencySymbol) return amount;
  return `${amount} ${currencySymbol}`;
}

/** Item-row unit/total: authoritative amount string without currency suffix. */
export function formatCashierReceiptLineAmount(amount: string): string {
  return amount;
}

/** Receipt header: Arabic uses "مطعم …" when the stored name is not already prefixed. */
export function formatCashierReceiptRestaurantHeading(
  restaurantName: string,
  language: CashierLang
): string {
  const trimmed = restaurantName.trim();
  if (!trimmed) return "";
  if (language === "ar") {
    if (/^مطعم(\s|$)/u.test(trimmed)) return trimmed;
    return `مطعم ${trimmed}`;
  }
  return trimmed;
}

export function formatCashierReceiptDateTime(
  iso: string,
  language: CashierLang
): { date: string; time: string } {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) {
    return { date: iso, time: "" };
  }
  const locale = language === "ar" ? "ar-SA-u-ca-gregory-nu-latn" : "en-GB";
  return {
    date: new Intl.DateTimeFormat(locale, {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(parsed),
    time: new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    }).format(parsed),
  };
}

/**
 * CASHIER-PAID-RECEIPT-PRINT-ISOLATION-1 —
 * Same window.print() path as operational ticket / shift-closing.
 * Body class hides the app shell (display:none) so #root min-height cannot
 * produce blank first/second pages in print preview.
 */
export const CASHIER_PAID_RECEIPT_PRINT_ROOT_ID =
  "cashier-paid-receipt-print" as const;

export const CASHIER_PAID_RECEIPT_PRINT_BODY_CLASS =
  "printing-cashier-paid-receipt" as const;

/** Operator-validated thermal receipt paper (Chrome print preview default). */
export const CASHIER_PAID_RECEIPT_PAPER_WIDTH_MM = 72.1;
export const CASHIER_PAID_RECEIPT_PAPER_HEIGHT_MM = 180;

const CASHIER_PAID_RECEIPT_PAGE_STYLE_ID =
  "cashier-paid-receipt-print-page-style" as const;

/**
 * Injects a temporary @page rule so Chrome/Edge print headers/footers
 * (URL / title) lose margin space for this print only.
 */
function installCashierPaidReceiptPageStyle(): HTMLStyleElement {
  const existing = document.getElementById(CASHIER_PAID_RECEIPT_PAGE_STYLE_ID);
  if (existing) existing.remove();
  const style = document.createElement("style");
  style.id = CASHIER_PAID_RECEIPT_PAGE_STYLE_ID;
  style.textContent = `
@media print {
  @page {
    size: ${CASHIER_PAID_RECEIPT_PAPER_WIDTH_MM}mm ${CASHIER_PAID_RECEIPT_PAPER_HEIGHT_MM}mm;
    margin: 0;
  }
}
`.trim();
  document.head.appendChild(style);
  return style;
}

export function printCashierPaidReceipt(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const body = document.body;
  body.classList.add(CASHIER_PAID_RECEIPT_PRINT_BODY_CLASS);
  const pageStyle = installCashierPaidReceiptPageStyle();

  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    body.classList.remove(CASHIER_PAID_RECEIPT_PRINT_BODY_CLASS);
    pageStyle.remove();
    window.removeEventListener("afterprint", cleanup);
  };

  window.addEventListener("afterprint", cleanup);
  window.print();
  window.setTimeout(cleanup, 2_000);
}
