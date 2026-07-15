/**
 * WAITER-ORDERING-FOUNDATION-1 — Waiter channel adapter for Order Identity facts.
 *
 * Channel supplies table + table_service + staff placeAuth.
 * Ordering Platform owns types. Business Identity scope is server-forced (WAITER).
 */

import {
  createTableFulfilmentAnchor,
  type OrderingFulfilmentAnchor,
  type OrderingServiceMode,
} from "@shared/ordering-platform/orderingIdentityContract";
import type { CheckoutIdentitySubmit } from "../checkout/checkoutTypes";

export const WAITER_TABLE_SERVICE_MODE: OrderingServiceMode = "table_service";

export function createWaiterTableFulfilmentAnchor(input: {
  tableId: number;
  tableNumber: number;
  fulfilmentLabel?: string;
}): OrderingFulfilmentAnchor {
  return createTableFulfilmentAnchor(input);
}

/** Build Client Platform identity submit facts for waiter table workspace. */
export function buildWaiterTableCheckoutIdentity(input: {
  tableId: number;
  tableNumber: number;
  fulfilmentLabel?: string;
}): CheckoutIdentitySubmit {
  return {
    serviceMode: WAITER_TABLE_SERVICE_MODE,
    fulfilmentAnchor: createWaiterTableFulfilmentAnchor(input),
    placeAuth: "staff",
  };
}
