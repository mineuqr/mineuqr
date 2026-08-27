/**
 * REFUND-CF-ANCHOR-1 — load production Collection Facts and resolve original-sale identity.
 * Infrastructure only. Domain resolveRefundOriginalSaleAnchor remains pure.
 */

import {
  resolveRefundOriginalSaleAnchor,
  type RefundOriginalSaleAnchor,
  type RefundProductionFactCandidate,
} from "@shared/operational-session";
import type { SessionDbClient } from "../../diningSession/sessionRepository";
import { listActiveOrderIdsForCheck } from "./checkOrderMembershipRepository";
import { listProductionCollectionFactsForRefundAnchor } from "../payment/collection-fact/collectionFactRepository";

function toCandidate(
  fact: Awaited<
    ReturnType<typeof listProductionCollectionFactsForRefundAnchor>
  >[number]
): RefundProductionFactCandidate {
  return {
    collectionFactId: fact.collectionFactId,
    restaurantId: fact.restaurantId,
    orderId: fact.orderId,
    paymentIntentId: fact.paymentIntentId,
    purpose: fact.purpose,
    amount: fact.amount,
    discountAmount: fact.discountAmount,
    currencyCode: fact.currencyCode,
    tenders: fact.tenders,
    checkId: fact.checkId,
    committedAt: fact.committedAt,
    businessDay: fact.businessDay,
    actorId: fact.actorId,
    terminalId: fact.terminalId,
    orderingChannel: String(fact.orderingChannel),
  };
}

export async function resolveRefundOriginalSaleAnchorForCheck(
  input: { restaurantId: number; checkId: number },
  client?: SessionDbClient
): Promise<RefundOriginalSaleAnchor> {
  const orderIds = await listActiveOrderIdsForCheck(
    input.restaurantId,
    input.checkId,
    client
  );
  // Query failure must propagate. Empty rows are the only "no production CF"
  // case that may enter the legacy SR original-amount path.
  const facts = await listProductionCollectionFactsForRefundAnchor(
    {
      restaurantId: input.restaurantId,
      checkId: input.checkId,
      orderIds,
    },
    client
  );
  return resolveRefundOriginalSaleAnchor({
    restaurantId: input.restaurantId,
    checkId: input.checkId,
    orderIds,
    facts: facts.map(toCandidate),
  });
}
