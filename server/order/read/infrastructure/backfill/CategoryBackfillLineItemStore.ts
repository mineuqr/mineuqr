import type { OrderCategoryProjection } from "../../domain/contracts/categoryProjectionContracts";

export type CategoryBackfillLineItemRow = {
  restaurantId: number;
  orderId: number;
  lineItemId: number;
  menuItemId: number;
  categoryProjection: unknown;
};

export type CategoryBackfillLineItemCursor = {
  restaurantId: number;
  orderId: number;
  lineItemId: number;
};

export type CategoryBackfillBatchCounts = {
  totalRows: number;
  legacyRows: number;
};

export interface CategoryBackfillLineItemStore {
  countRows(restaurantId?: number): Promise<CategoryBackfillBatchCounts>;
  listLegacyBatch(input: {
    batchSize: number;
    restaurantId?: number;
    resumeAfter?: CategoryBackfillLineItemCursor;
  }): Promise<CategoryBackfillLineItemRow[]>;
  updateCategoryProjections(
    updates: Array<{
      restaurantId: number;
      orderId: number;
      lineItemId: number;
      categoryProjection: OrderCategoryProjection;
    }>
  ): Promise<void>;
}
