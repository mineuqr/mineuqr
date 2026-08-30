/**
 * CASHIER-INVOICE-IDENTITY-IMPLEMENTATION-1
 * Cashier-owned invoice identity. Not Order identity. Not Collection Fact.
 */

export const CASHIER_INVOICE_IDENTITY_PROGRAM_ID =
  "CASHIER-INVOICE-IDENTITY-IMPLEMENTATION-1" as const;

export const CASHIER_INVOICE_NUMBER_PAD = 6 as const;

export type CashierInvoiceAssignment = Readonly<{
  restaurantId: number;
  orderId: number;
  sequenceNumber: number;
  invoiceNumber: string;
}>;

export function formatCashierInvoiceNumber(sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    return "";
  }
  return String(sequenceNumber).padStart(CASHIER_INVOICE_NUMBER_PAD, "0");
}

/**
 * Parse human-facing Cashier Invoice Number (`000050` / `50`).
 * Rejects ST-/RF- prefixes — those are Settlement/Refund document identities.
 */
export function parseCashierInvoiceNumber(raw: string): number | null {
  const value = raw.trim();
  if (!value) return null;
  if (/^(ST|RF)-/i.test(value)) return null;
  if (!/^\d{1,12}$/.test(value)) return null;
  const sequenceNumber = Number.parseInt(value, 10);
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) return null;
  return sequenceNumber;
}
