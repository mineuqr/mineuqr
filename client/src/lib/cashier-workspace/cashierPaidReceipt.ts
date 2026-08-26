/**
 * CASHIER-POST-PAYMENT-PRINT-UX-1
 * Paid invoice/receipt snapshot for Cashier print. Not Settlement Record. Not Check.
 * Amounts come from the Confirm HTTP result (Collection Fact / PAID), not a live ticket.
 */

import type { SelectablePaymentMethod } from "@shared/operational-session";

export type CashierPaidReceiptLine = Readonly<{
  description: string;
  quantity: number;
  lineTotal: string;
}>;

export type CashierPaidReceiptTender = Readonly<{
  paymentMethod: SelectablePaymentMethod;
  amount: string;
}>;

export type CashierPaidReceiptSnapshot = Readonly<{
  orderId: number;
  orderNumber: string;
  displayReference: string;
  grandTotal: string;
  restaurantName: string;
  currencySymbol: string;
  lines: readonly CashierPaidReceiptLine[];
  tenders: readonly CashierPaidReceiptTender[];
  paidAt: string;
}>;

export function buildCashierPaidReceiptSnapshot(input: {
  orderId: number;
  grandTotal: string;
  orderNumber?: string | null;
  displayReference?: string | null;
  restaurantName?: string | null;
  currencySymbol?: string | null;
  ticketLines?: readonly {
    nameAr: string;
    nameEn: string | null;
    price: string;
    quantity: number;
  }[];
  tenders: readonly { paymentMethod: SelectablePaymentMethod; amount?: string }[];
  language: "ar" | "en";
  paidAt?: string;
}): CashierPaidReceiptSnapshot {
  const grandTotal = input.grandTotal;
  const lines = (input.ticketLines ?? []).map((line) => ({
    description:
      input.language === "ar"
        ? line.nameAr || line.nameEn || "item"
        : line.nameEn || line.nameAr || "item",
    quantity: line.quantity,
    lineTotal: (Number.parseFloat(line.price) * line.quantity).toFixed(2),
  }));
  const tenders = input.tenders.map((tender) => ({
    paymentMethod: tender.paymentMethod,
    amount: tender.amount && tender.amount.length > 0 ? tender.amount : grandTotal,
  }));
  return {
    orderId: input.orderId,
    orderNumber: input.orderNumber?.trim() || String(input.orderId),
    displayReference:
      input.displayReference?.trim() ||
      input.orderNumber?.trim() ||
      String(input.orderId),
    grandTotal,
    restaurantName: input.restaurantName?.trim() || "",
    currencySymbol: input.currencySymbol?.trim() || "",
    lines,
    tenders,
    paidAt: input.paidAt ?? new Date().toISOString(),
  };
}

export function formatCashierReceiptMoney(
  amount: string,
  currencySymbol: string
): string {
  if (!currencySymbol) return amount;
  return `${amount} ${currencySymbol}`;
}
