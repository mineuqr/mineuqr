import type { OrderOfferProjection } from "../../domain/contracts/offerProjectionContracts";

export type OfferBackfillLineItemCursor = {
  restaurantId: number;
  orderId: number;
  lineItemId: number;
};

export type OfferBackfillLineItemRow = {
  restaurantId: number;
  orderId: number;
  lineItemId: number;
  menuItemId: number;
  nameAr: string;
  nameEn: string | null;
  offerProjection: unknown;
  lineProjectionType: string | null;
};

export type OfferBackfillBatchCounts = {
  totalOfferRows: number;
  legacyOfferRows: number;
};

export type OfferBackfillLineItemStore = {
  countRows(restaurantId?: number): Promise<OfferBackfillBatchCounts>;
  listLegacyBatch(input: {
    batchSize: number;
    restaurantId?: number;
    resumeAfter?: OfferBackfillLineItemCursor;
  }): Promise<OfferBackfillLineItemRow[]>;
  updateOfferProjections(
    updates: Array<{
      restaurantId: number;
      orderId: number;
      lineItemId: number;
      offerProjection: OrderOfferProjection;
    }>
  ): Promise<void>;
};
