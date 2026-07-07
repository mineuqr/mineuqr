import { and, asc, eq, gt, or, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orderReadOrderLineItems } from "../../../../../drizzle/schema";
import { ORDER_LINE_PROJECTION_TYPE_OFFER } from "../../domain/contracts/lineProjectionContracts";
import type { OrderOfferProjection } from "../../domain/contracts/offerProjectionContracts";
import { isCanonicalOfferProjection } from "../persistence/parseStoredOfferProjection";
import type {
  OfferBackfillBatchCounts,
  OfferBackfillLineItemCursor,
  OfferBackfillLineItemRow,
  OfferBackfillLineItemStore,
} from "./OfferBackfillLineItemStore";

const offerLineCondition = sql`${orderReadOrderLineItems.menuItemId} = 0`;

const legacyOfferProjectionCondition = sql`(
  ${orderReadOrderLineItems.lineProjectionType} IS NULL
  OR ${orderReadOrderLineItems.lineProjectionType} <> ${ORDER_LINE_PROJECTION_TYPE_OFFER}
  OR ${orderReadOrderLineItems.offerProjection} IS NULL
  OR JSON_TYPE(${orderReadOrderLineItems.offerProjection}) = 'NULL'
  OR JSON_EXTRACT(${orderReadOrderLineItems.offerProjection}, '$.lineKind') IS NULL
  OR JSON_EXTRACT(${orderReadOrderLineItems.offerProjection}, '$.lineKind') <> 'offer'
)`;

function cursorCondition(cursor: OfferBackfillLineItemCursor) {
  return or(
    gt(orderReadOrderLineItems.restaurantId, cursor.restaurantId),
    and(
      eq(orderReadOrderLineItems.restaurantId, cursor.restaurantId),
      gt(orderReadOrderLineItems.orderId, cursor.orderId)
    ),
    and(
      eq(orderReadOrderLineItems.restaurantId, cursor.restaurantId),
      eq(orderReadOrderLineItems.orderId, cursor.orderId),
      gt(orderReadOrderLineItems.lineItemId, cursor.lineItemId)
    )
  );
}

export class DrizzleOfferBackfillLineItemStore implements OfferBackfillLineItemStore {
  async countRows(restaurantId?: number): Promise<OfferBackfillBatchCounts> {
    const db = await getDb();
    if (!db) return { totalOfferRows: 0, legacyOfferRows: 0 };

    const tenantFilter =
      restaurantId != null ? eq(orderReadOrderLineItems.restaurantId, restaurantId) : undefined;
    const offerFilter = tenantFilter
      ? and(tenantFilter, offerLineCondition)
      : offerLineCondition;
    const legacyFilter = tenantFilter
      ? and(tenantFilter, offerLineCondition, legacyOfferProjectionCondition)
      : and(offerLineCondition, legacyOfferProjectionCondition);

    const [[totalRow], [legacyRow]] = await Promise.all([
      db.select({ count: sql<number>`count(*)` }).from(orderReadOrderLineItems).where(offerFilter),
      db.select({ count: sql<number>`count(*)` }).from(orderReadOrderLineItems).where(legacyFilter),
    ]);

    return {
      totalOfferRows: Number(totalRow?.count ?? 0),
      legacyOfferRows: Number(legacyRow?.count ?? 0),
    };
  }

  async listLegacyBatch(input: {
    batchSize: number;
    restaurantId?: number;
    resumeAfter?: OfferBackfillLineItemCursor;
  }): Promise<OfferBackfillLineItemRow[]> {
    const db = await getDb();
    if (!db) return [];

    const filters = [offerLineCondition, legacyOfferProjectionCondition];
    if (input.restaurantId != null) {
      filters.push(eq(orderReadOrderLineItems.restaurantId, input.restaurantId));
    }
    if (input.resumeAfter) {
      filters.push(cursorCondition(input.resumeAfter)!);
    }

    return db
      .select({
        restaurantId: orderReadOrderLineItems.restaurantId,
        orderId: orderReadOrderLineItems.orderId,
        lineItemId: orderReadOrderLineItems.lineItemId,
        menuItemId: orderReadOrderLineItems.menuItemId,
        nameAr: orderReadOrderLineItems.nameAr,
        nameEn: orderReadOrderLineItems.nameEn,
        offerProjection: orderReadOrderLineItems.offerProjection,
        lineProjectionType: orderReadOrderLineItems.lineProjectionType,
      })
      .from(orderReadOrderLineItems)
      .where(and(...filters))
      .orderBy(
        asc(orderReadOrderLineItems.restaurantId),
        asc(orderReadOrderLineItems.orderId),
        asc(orderReadOrderLineItems.lineItemId)
      )
      .limit(input.batchSize);
  }

  async updateOfferProjections(
    updates: Array<{
      restaurantId: number;
      orderId: number;
      lineItemId: number;
      offerProjection: OrderOfferProjection;
    }>
  ): Promise<void> {
    if (updates.length === 0) return;

    const db = await getDb();
    if (!db) return;

    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(orderReadOrderLineItems)
          .set({
            lineProjectionType: ORDER_LINE_PROJECTION_TYPE_OFFER,
            offerProjection: update.offerProjection,
            categoryProjection: null,
          })
          .where(
            and(
              eq(orderReadOrderLineItems.restaurantId, update.restaurantId),
              eq(orderReadOrderLineItems.orderId, update.orderId),
              eq(orderReadOrderLineItems.lineItemId, update.lineItemId)
            )
          );
      }
    });
  }
}

export function isUpgradedOfferProjection(value: unknown, lineItemId: number): boolean {
  return isCanonicalOfferProjection(value, lineItemId);
}

export const drizzleOfferBackfillLineItemStore = new DrizzleOfferBackfillLineItemStore();
