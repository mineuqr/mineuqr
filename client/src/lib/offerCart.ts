/** PR-CUX-1B-POLISH-3 — synthetic cart line ids for orderable offers (no menuItem link). */

export const OFFER_CART_MENU_ITEM_ID_BASE = 1_000_000_000;

export function offerToCartMenuItemId(offerId: number): number {
  return OFFER_CART_MENU_ITEM_ID_BASE + offerId;
}

export function isOfferCartMenuItemId(menuItemId: number): boolean {
  return menuItemId >= OFFER_CART_MENU_ITEM_ID_BASE;
}

export function cartMenuItemIdToOfferId(menuItemId: number): number {
  return menuItemId - OFFER_CART_MENU_ITEM_ID_BASE;
}
