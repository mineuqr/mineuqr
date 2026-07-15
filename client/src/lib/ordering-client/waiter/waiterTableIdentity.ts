/**
 * WAITER-ORDERING-FOUNDATION-1 — Waiter channel adapter for Order Identity facts.
 * WAITER-SCREEN-HOSTED-AUTH-ADOPTION-1 — placeAuth staff | device.
 *
 * Channel supplies table + table_service + placeAuth.
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
  /** Dashboard staff vs Screen Runtime device. Default: staff. */
  placeAuth?: "staff" | "device";
}): CheckoutIdentitySubmit {
  return {
    serviceMode: WAITER_TABLE_SERVICE_MODE,
    fulfilmentAnchor: createWaiterTableFulfilmentAnchor(input),
    placeAuth: input.placeAuth ?? "staff",
  };
}
