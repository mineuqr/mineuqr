/**
 * CASHIER-ORDER-VISIBILITY-AND-NOTIFICATION-1
 * Cashier POS Orders exist before payment (Check enrollment). They are not
 * operationally listed until a Paid/Complimentary Check exists.
 * Not a second Order. Not a frontend hide.
 */

import { sql } from "drizzle-orm";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { orderReadOrders } from "../../../drizzle/schema";
import { isCashierPosOrderingChannel } from "../application/cashierPosOrderLifecycle";

export { isCashierPosOrderingChannel };

export function isCashierPosOperationallyListed(input: {
  orderingChannel?: string | null;
  paidCheck: boolean;
}): boolean {
  if (!isCashierPosOrderingChannel(input.orderingChannel)) return true;
  return input.paidCheck;
}

/**
 * SQL: list cashier_pos only when an active membership points at a
 * paid or complimentary Check. Other channels unchanged.
 */
export function cashierPosPaidOperationalVisibilitySql() {
  return sql`
    (
      ${orderReadOrders.orderingChannel} is null
      or ${orderReadOrders.orderingChannel} <> ${ORDERING_CHANNEL_CASHIER_POS}
      or exists (
        select 1
        from check_order_membership m
        inner join operational_checks c
          on c.id = m.check_id
         and c.restaurant_id = m.restaurant_id
        where m.order_id = ${orderReadOrders.orderId}
          and m.restaurant_id = ${orderReadOrders.restaurantId}
          and m.active = 1
          and c.outcome in ('paid', 'complimentary')
      )
    )
  `;
}
