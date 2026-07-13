import { describe, expect, it } from "vitest";
import {
  cartMenuItemIdToOfferId,
  isOfferCartMenuItemId,
  offerToCartMenuItemId,
  OFFER_CART_MENU_ITEM_ID_BASE,
} from "@shared/ordering-platform/offerCartIdentity";

describe("ORDERING-PLATFORM-ARCHITECTURE-1 offerCartIdentity", () => {
  it("defines canonical offer cart id base", () => {
    expect(OFFER_CART_MENU_ITEM_ID_BASE).toBe(1_000_000_000);
  });

  it("round-trips offer id encoding", () => {
    const offerId = 55;
    const cartId = offerToCartMenuItemId(offerId);
    expect(isOfferCartMenuItemId(cartId)).toBe(true);
    expect(cartMenuItemIdToOfferId(cartId)).toBe(offerId);
  });
});
