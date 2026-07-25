/**
 * SETTLEMENT-PAYMENT-METHOD-CAPTURE-1 — staff settlement line DTOs.
 *
 * Reusable by Session Mark Paid and future operational clients.
 * Amount may be omitted for a single tender — domain fills Check grandTotal.
 * Multi-tender lines require explicit amounts that sum to grandTotal.
 */

import type { AcceptedSettlementPaymentMethod } from "./paymentMethod";

export type StaffSettlementLineInput = Readonly<{
  paymentMethod: AcceptedSettlementPaymentMethod;
  /** Decimal string; required when more than one line is supplied. */
  amount?: string;
}>;
