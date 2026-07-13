/**
 * ORDERING-PLATFORM-ARCHITECTURE-1 — canonical offer cart line identity.
 * Single source of truth for synthetic menuItemId encoding used by all ordering channels.
 */

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
