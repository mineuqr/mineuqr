import type { OrderCategoryProjection } from "../../domain/contracts/categoryProjectionContracts";
import { isUpgradedCategoryProjection } from "../persistence/categoryProjectionValidation";
import type {
  CategoryBackfillBatchCounts,
  CategoryBackfillLineItemCursor,
  CategoryBackfillLineItemRow,
  CategoryBackfillLineItemStore,
} from "./CategoryBackfillLineItemStore";

function compareCursor(a: CategoryBackfillLineItemRow, b: CategoryBackfillLineItemCursor): number {
  if (a.restaurantId !== b.restaurantId) return a.restaurantId - b.restaurantId;
  if (a.orderId !== b.orderId) return a.orderId - b.orderId;
  return a.lineItemId - b.lineItemId;
}

export class InMemoryCategoryBackfillLineItemStore implements CategoryBackfillLineItemStore {
  private readonly rows: CategoryBackfillLineItemRow[] = [];

  seed(rows: CategoryBackfillLineItemRow[]): void {
    this.rows.length = 0;
    this.rows.push(
      ...rows.map((row) => ({
        ...row,
        categoryProjection: row.categoryProjection,
      }))
    );
    this.rows.sort((a, b) => {
      if (a.restaurantId !== b.restaurantId) return a.restaurantId - b.restaurantId;
      if (a.orderId !== b.orderId) return a.orderId - b.orderId;
      return a.lineItemId - b.lineItemId;
    });
  }

  async countRows(restaurantId?: number): Promise<CategoryBackfillBatchCounts> {
    const scoped =
      restaurantId != null
        ? this.rows.filter((row) => row.restaurantId === restaurantId)
        : this.rows;
    const legacyRows = scoped.filter(
      (row) =>
        row.menuItemId > 0 &&
        !isUpgradedCategoryProjection(row.categoryProjection, row.lineItemId)
    ).length;
    return { totalRows: scoped.length, legacyRows };
  }

  async listLegacyBatch(input: {
    batchSize: number;
    restaurantId?: number;
    resumeAfter?: CategoryBackfillLineItemCursor;
  }): Promise<CategoryBackfillLineItemRow[]> {
    let legacy = this.rows.filter(
      (row) =>
        row.menuItemId > 0 &&
        (input.restaurantId == null || row.restaurantId === input.restaurantId) &&
        !isUpgradedCategoryProjection(row.categoryProjection, row.lineItemId)
    );

    if (input.resumeAfter) {
      legacy = legacy.filter((row) => compareCursor(row, input.resumeAfter!) > 0);
    }

    return legacy.slice(0, input.batchSize);
  }

  async updateCategoryProjections(
    updates: Array<{
      restaurantId: number;
      orderId: number;
      lineItemId: number;
      categoryProjection: OrderCategoryProjection;
    }>
  ): Promise<void> {
    for (const update of updates) {
      const row = this.rows.find(
        (candidate) =>
          candidate.restaurantId === update.restaurantId &&
          candidate.orderId === update.orderId &&
          candidate.lineItemId === update.lineItemId
      );
      if (row) {
        row.categoryProjection = update.categoryProjection;
      }
    }
  }
}
