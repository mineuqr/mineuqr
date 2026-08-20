/**
 * CASHIER-DOWNSTREAM-SETTLEMENT-RECOVERY-1
 * Read existing Collection Fact + Check + SR rows. No new table. No CF mutation.
 */

import { and, asc, eq, isNotNull, isNull, or } from "drizzle-orm";
import {
  operationalChecks,
  paymentCollectionFacts,
  settlementRecords,
} from "../../../../drizzle/schema";
import { getDb } from "../../../db";
import { COLLECTION_FACT_PRODUCTION_PURPOSE } from "@shared/operational-session/payment/collection-fact";
import { ORDERING_CHANNEL_CASHIER_POS } from "@shared/ordering-platform/orderingChannelRegistry";

export type CashierDownstreamRecoveryObligation = Readonly<{
  restaurantId: number;
  paymentIntentId: string;
  collectionFactId: string;
  orderId: number;
  checkId: number;
  committedAt: string;
  checkOutcome: string;
}>;

export async function listIncompleteCashierDownstreamObligations(
  limit = 50
): Promise<CashierDownstreamRecoveryObligation[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db
    .select({
      restaurantId: paymentCollectionFacts.restaurantId,
      paymentIntentId: paymentCollectionFacts.paymentIntentId,
      collectionFactId: paymentCollectionFacts.collectionFactId,
      orderId: paymentCollectionFacts.orderId,
      checkId: paymentCollectionFacts.checkId,
      committedAt: paymentCollectionFacts.committedAt,
      checkOutcome: operationalChecks.outcome,
    })
    .from(paymentCollectionFacts)
    .innerJoin(
      operationalChecks,
      and(
        eq(operationalChecks.id, paymentCollectionFacts.checkId),
        eq(operationalChecks.restaurantId, paymentCollectionFacts.restaurantId)
      )
    )
    .leftJoin(
      settlementRecords,
      and(
        eq(settlementRecords.checkId, operationalChecks.id),
        eq(settlementRecords.restaurantId, operationalChecks.restaurantId),
        eq(settlementRecords.recordKind, "settlement")
      )
    )
    .where(
      and(
        eq(paymentCollectionFacts.purpose, COLLECTION_FACT_PRODUCTION_PURPOSE),
        eq(
          paymentCollectionFacts.orderingChannel,
          ORDERING_CHANNEL_CASHIER_POS
        ),
        isNotNull(paymentCollectionFacts.checkId),
        or(
          eq(operationalChecks.outcome, "open"),
          and(
            eq(operationalChecks.outcome, "paid"),
            isNull(settlementRecords.id)
          )
        )
      )
    )
    .orderBy(asc(paymentCollectionFacts.committedAt))
    .limit(limit);

  const seen = new Set<string>();
  const obligations: CashierDownstreamRecoveryObligation[] = [];
  for (const row of rows) {
    if (row.checkId == null) continue;
    if (seen.has(row.collectionFactId)) continue;
    seen.add(row.collectionFactId);
    obligations.push({
      restaurantId: row.restaurantId,
      paymentIntentId: row.paymentIntentId,
      collectionFactId: row.collectionFactId,
      orderId: row.orderId,
      checkId: row.checkId,
      committedAt: String(row.committedAt),
      checkOutcome: row.checkOutcome,
    });
  }
  return obligations;
}
