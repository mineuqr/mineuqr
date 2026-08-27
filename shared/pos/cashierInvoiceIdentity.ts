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
