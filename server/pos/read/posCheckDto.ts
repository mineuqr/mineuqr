/**
 * CASHIER-POS-CHECK-READ-CONTRACT-1
 * Operational POS DTO for an Order's Check. Check remains financial SSOT.
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
};
