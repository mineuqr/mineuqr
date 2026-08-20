/**
 * CASHIER-POS-CHECK-READ-CONTRACT-1
 * Operational POS DTO for an Order's Check.
 * Check remains the operational bill. Production Collection Fact is Cashier
 * financial authority — `financiallyPaid` does not rewrite Check.outcome.
 * Copies Check-owned fields. No tax/grandTotal calculation.
 */

import type { CheckOutcome } from "@shared/operational-session";

export type PosOrderCheckDto = {
  checkId: number;
  orderId: number;
  restaurantId: number;
  outcome: CheckOutcome;
  grandTotal: string;
  subtotal: string;
  taxAmount: string;
  /** Copied from Check. Not calculated here. */
  billDiscountAmount: string;
  /** Production cashier Collection Fact id when one exists for this order. */
  collectionFactId: string | null;
  /** True when a production cashier Collection Fact is committed. Not Check PAID. */
  financiallyPaid: boolean;
};
