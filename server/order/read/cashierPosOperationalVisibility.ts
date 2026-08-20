/**
 * CASHIER-ORDER-VISIBILITY-AND-NOTIFICATION-1
 * Cashier POS Orders exist before payment (Check enrollment). They are not
 * operationally listed until a Paid/Complimentary Check exists.
 * Not a second Order. Not a frontend hide.
 */

import { and, eq, exists, inArray, isNull, ne, or, sql } from "drizzle-orm";
import { QueryBuilder } from "drizzle-orm/mysql-core";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";
import { COLLECTION_FACT_PRODUCTION_PURPOSE } from "@shared/operational-session/payment/collection-fact";
import {
  checkOrderMembership,
  operationalChecks,
  orderReadOrders,
  paymentCollectionFacts,
} from "../../../drizzle/schema";
import { isCashierPosOrderingChannel } from "../application/cashierPosOrderLifecycle";

export { isCashierPosOrderingChannel };

export function isCashierPosOperationallyListed(input: {
  orderingChannel?: string | null;
  paidCheck: boolean;
  productionCollectionFact?: boolean;
}): boolean {
  if (!isCashierPosOrderingChannel(input.orderingChannel)) return true;
  return input.paidCheck || input.productionCollectionFact === true;
}

/**
 * SQL: list cashier_pos only when an active membership points at a
 * paid or complimentary Check. Other channels unchanged.
 * Column names come from Drizzle table objects only.
 */
export function cashierPosPaidOperationalVisibilitySql() {
  const qb = new QueryBuilder();
  const paidCheckMembership = qb
    .select({ present: sql`1` })
    .from(checkOrderMembership)
    .innerJoin(
      operationalChecks,
      and(
        eq(checkOrderMembership.checkId, operationalChecks.id),
        eq(operationalChecks.restaurantId, checkOrderMembership.restaurantId)
      )
    )
    .where(
      and(
        eq(checkOrderMembership.orderId, orderReadOrders.orderId),
        eq(checkOrderMembership.restaurantId, orderReadOrders.restaurantId),
        eq(checkOrderMembership.active, 1),
        inArray(operationalChecks.outcome, ["paid", "complimentary"])
      )
    );

  const productionCollectionFact = qb
    .select({ present: sql`1` })
    .from(paymentCollectionFacts)
    .where(
      and(
        eq(paymentCollectionFacts.orderId, orderReadOrders.orderId),
        eq(paymentCollectionFacts.restaurantId, orderReadOrders.restaurantId),
        eq(paymentCollectionFacts.purpose, COLLECTION_FACT_PRODUCTION_PURPOSE),
        eq(
          paymentCollectionFacts.orderingChannel,
          ORDERING_CHANNEL_CASHIER_POS
        )
      )
    );

  return or(
    isNull(orderReadOrders.orderingChannel),
    ne(orderReadOrders.orderingChannel, ORDERING_CHANNEL_CASHIER_POS),
    exists(paidCheckMembership),
    exists(productionCollectionFact)
  );
}
