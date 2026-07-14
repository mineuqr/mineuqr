/**
 * ORDER-READ-OFFER-PROJECTION-1 — client mirror of canonical offer line projection.
 */
export type OrderOfferProjection = Readonly<{
  lineKind: "offer";
  offerId: number | null;
  titleAr: string;
  titleEn: string | null;
  source: "order_line_snapshot";
  version: number;
  updatedAt: string;
}>;

export const ORDER_LINE_PROJECTION_TYPE_MENU_ITEM = "MenuItem" as const;
export const ORDER_LINE_PROJECTION_TYPE_OFFER = "Offer" as const;

export type MenuItemKitchenLineItem = {
  projectionType: typeof ORDER_LINE_PROJECTION_TYPE_MENU_ITEM;
  lineItemId: number;
  menuItemId: number;
  nameAr: string;
  nameEn: string | null;
  quantity: number;
  price: string;
  itemNotes: string | null;
  category: import("./categoryProjection").OrderCategoryProjection;
};

export type OfferKitchenLineItem = {
  projectionType: typeof ORDER_LINE_PROJECTION_TYPE_OFFER;
  lineItemId: number;
  menuItemId: 0;
  nameAr: string;
  nameEn: string | null;
  quantity: number;
  price: string;
  itemNotes: string | null;
  offer: OrderOfferProjection;
};

export type KitchenLineItemDto = MenuItemKitchenLineItem | OfferKitchenLineItem;

export function isMenuItemKitchenLine(
  item: KitchenLineItemDto
): item is MenuItemKitchenLineItem {
  return item.projectionType === ORDER_LINE_PROJECTION_TYPE_MENU_ITEM;
}

export function isOfferKitchenLine(item: KitchenLineItemDto): item is OfferKitchenLineItem {
  return item.projectionType === ORDER_LINE_PROJECTION_TYPE_OFFER;
}
