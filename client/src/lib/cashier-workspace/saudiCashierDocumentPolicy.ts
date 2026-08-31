/**
 * SAUDI-TAX-INVOICE-CASHIER-DOCUMENT-UNIFICATION-1
 * Presentation policy only: Saudi customer-facing post-payment document.
 * Does not generate Tax Invoices. Does not change Collection Fact / PAID.
 */

/**
 * When true, Cashier presents the persisted Saudi Tax Invoice as the primary
 * customer-facing post-payment document (not the operational Paid Receipt).
 */
export function isSaudiEInvoiceCustomerFacingDocument(
  countryCode: string | null | undefined
): boolean {
  return String(countryCode ?? "").trim().toUpperCase() === "SA";
}
