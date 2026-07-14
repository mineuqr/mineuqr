import type { orderReadOrderLineItems } from "../../../../../drizzle/schema";
import type { OrderCategoryProjection } from "../../domain/contracts/categoryProjectionContracts";
import type { OrderOfferProjection } from "../../domain/contracts/offerProjectionContracts";
import {
  classifyOrderLineProjectionType,
  isOfferOrderLineMenuItemId,
  ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
  ORDER_LINE_PROJECTION_TYPE_OFFER,
} from "../../domain/contracts/lineProjectionContracts";
import type {
  ActiveOrderLineItemDto,
  MenuItemOrderLineItemDto,
  OfferOrderLineItemDto,
} from "../../domain/contracts/queryContracts";
import { orderOfferProjectionBuilder } from "../../projections/builders/OrderOfferProjectionBuilder";
import { parseStoredCategoryProjection } from "./parseStoredCategoryProjection";
import { parseStoredOfferProjection } from "./parseStoredOfferProjection";

type LineItemRow = typeof orderReadOrderLineItems.$inferSelect;

function mapMenuItemRow(row: LineItemRow, category: OrderCategoryProjection): MenuItemOrderLineItemDto {
  return {
    projectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
    lineItemId: row.lineItemId,
    menuItemId: row.menuItemId,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    quantity: row.quantity,
    price: String(row.price),
    // Persisted read table does not yet store itemNotes (projection follow-up).
    itemNotes: null,
    category,
  };
}

function mapOfferRow(row: LineItemRow, offer: OrderOfferProjection): OfferOrderLineItemDto {
  return {
    projectionType: ORDER_LINE_PROJECTION_TYPE_OFFER,
    lineItemId: row.lineItemId,
    menuItemId: 0,
    nameAr: row.nameAr,
    nameEn: row.nameEn,
    quantity: row.quantity,
    price: String(row.price),
    itemNotes: null,
    offer,
  };
}

/**
 * Maps persisted order_read_order_line_items to canonical read DTOs.
 * Offer lines never parse categoryProjection as menu category data.
 */
export function mapStoredOrderReadLineItem(row: LineItemRow): ActiveOrderLineItemDto {
  const storedType = row.lineProjectionType ?? classifyOrderLineProjectionType(row.menuItemId);

  if (storedType === ORDER_LINE_PROJECTION_TYPE_OFFER || isOfferOrderLineMenuItemId(row.menuItemId)) {
    const offer =
      row.offerProjection != null
        ? parseStoredOfferProjection(row.offerProjection, row.lineItemId)
        : orderOfferProjectionBuilder.buildFromSnapshot({
            titleAr: row.nameAr,
            titleEn: row.nameEn,
            updatedAt: new Date().toISOString(),
          });
    return mapOfferRow(row, offer);
  }

  if (row.categoryProjection == null) {
    throw new Error(`Menu item line ${row.lineItemId} is missing categoryProjection`);
  }

  return mapMenuItemRow(
    row,
    parseStoredCategoryProjection(row.categoryProjection, row.lineItemId)
  );
}

export function toPersistedLineItemColumns(item: ActiveOrderLineItemDto): {
  menuItemId: number;
  nameAr: string;
  nameEn: string | null;
  quantity: number;
  price: string;
  lineProjectionType: typeof ORDER_LINE_PROJECTION_TYPE_MENU_ITEM | typeof ORDER_LINE_PROJECTION_TYPE_OFFER;
  categoryProjection: OrderCategoryProjection | null;
  offerProjection: OrderOfferProjection | null;
} {
  if (item.projectionType === ORDER_LINE_PROJECTION_TYPE_OFFER) {
    return {
      menuItemId: 0,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      quantity: item.quantity,
      price: item.price,
      lineProjectionType: ORDER_LINE_PROJECTION_TYPE_OFFER,
      categoryProjection: null,
      offerProjection: item.offer,
    };
  }

  return {
    menuItemId: item.menuItemId,
    nameAr: item.nameAr,
    nameEn: item.nameEn,
    quantity: item.quantity,
    price: item.price,
    lineProjectionType: ORDER_LINE_PROJECTION_TYPE_MENU_ITEM,
    categoryProjection: item.category,
    offerProjection: null,
  };
}
