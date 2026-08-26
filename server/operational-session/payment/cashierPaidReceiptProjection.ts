/**
 * CASHIER-PAID-RECEIPT-DATA-COMPLETENESS-1
 * Display projection of an already committed Cashier payment.
 * Not a financial write. Not Collection Fact schema. Not Check.
 *
 * CASHIER-PAID-RECEIPT-SUBTOTAL-PRESENTATION-1
 * Receipt Subtotal is the Cashier invoice pre-tax presentation
 * (cashierInvoicePresentationSubtotal). Freeze/CF.subtotal stays taxable base.
 */

import { resolveOrderDisplayIdentity } from "../../order/business-identity/application/OrderDisplayIdentityResolver";
import {
  cashierInvoicePresentationSubtotal,
  type CanonicalMonetaryPaymentMethod,
} from "@shared/operational-session";
import type { CashierPaidMoneyFreeze } from "./collection-fact/commitCashierProductionCollectionFact";

export type CashierPaidReceiptInvoiceLine = Readonly<{
  nameAr: string;
  nameEn: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
}>;

export type CashierPaidReceiptTenderProjection = Readonly<{
  paymentMethod: CanonicalMonetaryPaymentMethod;
  amount: string;
}>;

export type CashierPaidReceiptProjection = Readonly<{
  orderId: number;
  orderNumber: string;
  displayReference: string;
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
  tenders: readonly CashierPaidReceiptTenderProjection[];
}>;

export function buildCashierPaidReceiptProjection(input: {
  freeze: Pick<
    CashierPaidMoneyFreeze,
    | "orderId"
    | "discountAmount"
    | "taxAmount"
    | "grandTotal"
    | "tenders"
    | "currencySnapshot"
  >;
  receiptInvoiceLines: readonly CashierPaidReceiptInvoiceLine[];
  order: {
    id: number;
    orderNumber?: string | null;
    businessDay?: string | null;
    dailyDisplayNumber?: number | null;
    identityScope?: string | null;
    fulfilmentAnchorType?: string | null;
    serviceMode?: string | null;
  };
  paidAt: string;
  cashierUserId: number;
  cashierDisplayName?: string | null;
  terminalId: string;
}): CashierPaidReceiptProjection {
  const orderNumber =
    input.order.orderNumber?.trim() || String(input.order.id);
  const displayReference = resolveOrderDisplayIdentity({
    orderNumber,
    businessDay: input.order.businessDay ?? null,
    dailyDisplayNumber: input.order.dailyDisplayNumber ?? null,
    identityScope: input.order.identityScope ?? "POS",
    fulfilmentAnchorType: input.order.fulfilmentAnchorType,
    serviceMode: input.order.serviceMode,
  }).displayReference;
  return {
    orderId: input.freeze.orderId,
    orderNumber,
    displayReference,
    paidAt: input.paidAt,
    cashierUserId: input.cashierUserId,
    cashierDisplayName: input.cashierDisplayName?.trim() || "",
    terminalId: input.terminalId,
    currencySymbol: input.freeze.currencySnapshot.currencySymbol ?? "",
    lines: input.receiptInvoiceLines,
    subtotal: cashierInvoicePresentationSubtotal({
      grandTotal: input.freeze.grandTotal,
      taxAmount: input.freeze.taxAmount,
    }),
    discountAmount: input.freeze.discountAmount,
    taxAmount: input.freeze.taxAmount,
    grandTotal: input.freeze.grandTotal,
    tenders: input.freeze.tenders.map((tender) => ({
      paymentMethod: tender.paymentMethod,
      amount: tender.amount,
    })),
  };
}
