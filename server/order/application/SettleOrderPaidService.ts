/**
 * SELF-ORDERING-SETTLEMENT-ADOPTION-1 — Order → Check settle façade.
 * UNIFIED-POS-FINANCIAL-AUTHORITY-1 — QR cannot establish financial truth.
 * Financial settlement requires Cashier Confirm → Collection Fact → PAID.
 */

import { getOrderById } from "../../db";

export class SettleOrderPaidError extends Error {
  readonly code:
    | "ORDER_NOT_FOUND"
    | "TRACKING_MISMATCH"
    | "CHECK_NOT_FOUND"
    | "CHECK_NOT_SETTLEABLE"
    | "SETTLEMENT_RECORD_MISSING"
    | "FINANCIAL_REQUIRES_CASHIER";

  constructor(
    code: SettleOrderPaidError["code"],
    message: string
  ) {
    super(message);
    this.name = "SettleOrderPaidError";
    this.code = code;
  }
}

export type SettleOrderPaidResult = Readonly<{
  orderId: number;
  checkId: number;
  settlementRecordId: string;
  settlementNumber: string;
  grandTotal: string;
  currencyCode: string;
  currencySymbol: string;
  paymentMethodSummary: string;
  alreadySettled: boolean;
  settlementContext: import("@shared/crmp").SettlementContext;
}>;

/**
 * Guest QR settle is closed. Cashier Confirm is the financial boundary.
 */
export async function settleOrderPaid(input: {
  restaurantId: number;
  orderId: number;
  trackingToken: string;
  settlements?: readonly unknown[];
  registerId?: string | null;
  deviceId?: string | null;
  operatorUserId?: number | null;
  operationalScreenId?: string | null;
}): Promise<SettleOrderPaidResult> {
  const order = await getOrderById(input.orderId);
  if (!order || order.restaurantId !== input.restaurantId) {
    throw new SettleOrderPaidError("ORDER_NOT_FOUND", "Order not found");
  }
  if (
    !order.trackingToken ||
    order.trackingToken !== input.trackingToken
  ) {
    throw new SettleOrderPaidError(
      "TRACKING_MISMATCH",
      "Order tracking token mismatch"
    );
  }

  throw new SettleOrderPaidError(
    "FINANCIAL_REQUIRES_CASHIER",
    "Financial settlement requires Cashier Confirm"
  );
}
