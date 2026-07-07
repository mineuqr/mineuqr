/**
 * ORDER-READ-OFFER-PROJECTION-1 — explicit line projection discrimination.
 */
export const ORDER_LINE_PROJECTION_TYPE_MENU_ITEM = "MenuItem" as const;
export const ORDER_LINE_PROJECTION_TYPE_OFFER = "Offer" as const;

export type OrderLineProjectionType =
  | typeof ORDER_LINE_PROJECTION_TYPE_MENU_ITEM
  | typeof ORDER_LINE_PROJECTION_TYPE_OFFER;

/** Canonical write-model sentinel for offer lines (PR-CUX-1B-POLISH-3). */
export const OFFER_ORDER_LINE_MENU_ITEM_ID = 0 as const;

export function isOfferOrderLineMenuItemId(menuItemId: number): boolean {
  return menuItemId === OFFER_ORDER_LINE_MENU_ITEM_ID;
}

export function classifyOrderLineProjectionType(menuItemId: number): OrderLineProjectionType {
  return isOfferOrderLineMenuItemId(menuItemId)
    ? ORDER_LINE_PROJECTION_TYPE_OFFER
    : ORDER_LINE_PROJECTION_TYPE_MENU_ITEM;
}
