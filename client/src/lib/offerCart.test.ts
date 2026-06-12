import { describe, expect, it } from "vitest";
import {
  cartMenuItemIdToOfferId,
  isOfferCartMenuItemId,
  offerToCartMenuItemId,
} from "./offerCart";

describe("offerCart PR-CUX-1B-POLISH-3", () => {
  it("maps offer ids to distinct cart menu item ids", () => {
    expect(offerToCartMenuItemId(42)).toBe(1_000_000_042);
    expect(isOfferCartMenuItemId(1_000_000_042)).toBe(true);
    expect(isOfferCartMenuItemId(42)).toBe(false);
    expect(cartMenuItemIdToOfferId(1_000_000_042)).toBe(42);
  });
});
