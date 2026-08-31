/**
 * SAUDI-TAX-INVOICE-PHASE-1
 * Human Tax Invoice number formatting — Compliance plane (not Cashier invoice).
 */

export const SAUDI_TAX_INVOICE_NUMBER_PAD = 6 as const;

export function formatSaudiTaxInvoiceNumber(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) return "";
  return String(sequenceNumber).padStart(SAUDI_TAX_INVOICE_NUMBER_PAD, "0");
}
