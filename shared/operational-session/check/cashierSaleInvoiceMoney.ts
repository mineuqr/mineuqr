/**
 * CASHIER-SALE-INVOICE-TAX-PROJECTION-1
 * Maps computeCheckMoney into Cashier SALE/INVOICE presentation fields.
 * Does not replace computeCheckMoney. Does not invent a tax formula.
 *
 * Domain computeCheckMoney.subtotal = post-discount taxable base
 * (inclusive: tax-inclusive base; exclusive: pre-tax base).
 *
 * Cashier invoice Subtotal = pre-tax residual = grandTotal − taxAmount.
 */

import { computeCheckMoney, type CheckMoneyResult } from "./checkMoney";
import type { TaxPolicySnapshot } from "./checkContract";

export type CashierSaleInvoiceMoneyProjection = Readonly<{
  /** Catalog / line-sum value before tax engine (chargesSubtotal). */
  itemValue: string;
  /** Pre-tax Subtotal on the Cashier invoice. Not computeCheckMoney.subtotal. */
  subtotal: string;
  taxAmount: string;
  grandTotal: string;
  billDiscountAmount: string;
}>;

function parseMoney(value: string): number {
  const n = Number.parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function roundMoney(value: number): string {
  if (!Number.isFinite(value)) return "0.00";
  return (Math.round((value + Number.EPSILON) * 100) / 100).toFixed(2);
}

/** Presentation Subtotal: pre-tax amount implied by engine grand total and VAT. */
export function cashierInvoicePresentationSubtotal(
  computed: Pick<CheckMoneyResult, "grandTotal" | "taxAmount">
): string {
  return roundMoney(parseMoney(computed.grandTotal) - parseMoney(computed.taxAmount));
}

export function projectCashierSaleInvoiceMoney(input: {
  chargesSubtotal: string;
  billDiscountAmount: string;
  taxPolicySnapshot: TaxPolicySnapshot;
}): CashierSaleInvoiceMoneyProjection {
  const computed = computeCheckMoney({
    chargesSubtotal: input.chargesSubtotal,
    billDiscountAmount: input.billDiscountAmount,
    taxPolicySnapshot: input.taxPolicySnapshot,
  });
  return {
    itemValue: input.chargesSubtotal,
    subtotal: cashierInvoicePresentationSubtotal(computed),
    taxAmount: computed.taxAmount,
    grandTotal: computed.grandTotal,
    billDiscountAmount: input.billDiscountAmount,
  };
}
