import { and, asc, eq, gt, or, sql } from "drizzle-orm";
import { getDb } from "../../../../db";
import { orderReadOrderLineItems } from "../../../../../drizzle/schema";
import type { OrderCategoryProjection } from "../../domain/contracts/categoryProjectionContracts";
import type {
  CategoryBackfillBatchCounts,
  CategoryBackfillLineItemCursor,
  CategoryBackfillLineItemRow,
  CategoryBackfillLineItemStore,
} from "./CategoryBackfillLineItemStore";

const legacyProjectionCondition = sql`(
  ${orderReadOrderLineItems.categoryProjection} IS NULL
  OR JSON_TYPE(${orderReadOrderLineItems.categoryProjection}) = 'NULL'
  OR JSON_EXTRACT(${orderReadOrderLineItems.categoryProjection}, '$.categoryId') IS NULL
  OR CAST(JSON_EXTRACT(${orderReadOrderLineItems.categoryProjection}, '$.categoryId') AS SIGNED) < 1
)`;

function cursorCondition(cursor: CategoryBackfillLineItemCursor) {
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

export class DrizzleCategoryBackfillLineItemStore implements CategoryBackfillLineItemStore {
  async countRows(restaurantId?: number): Promise<CategoryBackfillBatchCounts> {
    const db = await getDb();
    if (!db) return { totalRows: 0, legacyRows: 0 };

    const tenantFilter =
      restaurantId != null ? eq(orderReadOrderLineItems.restaurantId, restaurantId) : undefined;

    const legacyQuery = db
      .select({ count: sql<number>`count(*)` })
      .from(orderReadOrderLineItems)
      .where(tenantFilter ? and(tenantFilter, legacyProjectionCondition) : legacyProjectionCondition);

    const [[totalRow], [legacyRow]] = await Promise.all([
      tenantFilter
        ? db.select({ count: sql<number>`count(*)` }).from(orderReadOrderLineItems).where(tenantFilter)
        : db.select({ count: sql<number>`count(*)` }).from(orderReadOrderLineItems),
      legacyQuery,
    ]);

    return {
      totalRows: Number(totalRow?.count ?? 0),
      legacyRows: Number(legacyRow?.count ?? 0),
    };
  }

  async listLegacyBatch(input: {
    batchSize: number;
    restaurantId?: number;
    resumeAfter?: CategoryBackfillLineItemCursor;
  }): Promise<CategoryBackfillLineItemRow[]> {
    const db = await getDb();
    if (!db) return [];

    const filters = [legacyProjectionCondition];
    if (input.restaurantId != null) {
      filters.push(eq(orderReadOrderLineItems.restaurantId, input.restaurantId));
    }
    if (input.resumeAfter) {
      filters.push(cursorCondition(input.resumeAfter)!);
    }

    const rows = await db
      .select({
        restaurantId: orderReadOrderLineItems.restaurantId,
        orderId: orderReadOrderLineItems.orderId,
        lineItemId: orderReadOrderLineItems.lineItemId,
        menuItemId: orderReadOrderLineItems.menuItemId,
        categoryProjection: orderReadOrderLineItems.categoryProjection,
      })
      .from(orderReadOrderLineItems)
      .where(and(...filters))
      .orderBy(
        asc(orderReadOrderLineItems.restaurantId),
        asc(orderReadOrderLineItems.orderId),
        asc(orderReadOrderLineItems.lineItemId)
      )
      .limit(input.batchSize);

    return rows;
  }

  async updateCategoryProjections(
    updates: Array<{
      restaurantId: number;
      orderId: number;
      lineItemId: number;
      categoryProjection: OrderCategoryProjection;
    }>
  ): Promise<void> {
    if (updates.length === 0) return;

    const db = await getDb();
    if (!db) return;

    await db.transaction(async (tx) => {
      for (const update of updates) {
        await tx
          .update(orderReadOrderLineItems)
          .set({ categoryProjection: update.categoryProjection })
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

export const drizzleCategoryBackfillLineItemStore = new DrizzleCategoryBackfillLineItemStore();
