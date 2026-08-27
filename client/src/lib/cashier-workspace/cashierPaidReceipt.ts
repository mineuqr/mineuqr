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
