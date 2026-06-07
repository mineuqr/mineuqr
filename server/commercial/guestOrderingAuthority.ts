import { getRestaurantById } from "../db";
import { getCommercialEntitlements } from "./getCommercialEntitlements";

/** Guest ordering probe shape (order.canOrder). */
export type GuestOrderingAllowed = {
  canOrder: boolean;
};

/**
 * ASN-5 Wave A — single canonical guest ordering authority.
 *
 * restaurantId → ownerId → getCommercialEntitlements → features.ordering
 */
export async function resolveGuestOrderingAllowed(
  restaurantId: number,
  now: Date = new Date()
): Promise<GuestOrderingAllowed> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    return { canOrder: false };
  }

  const { entitlements } = await getCommercialEntitlements(restaurant.userId, now);
  return { canOrder: entitlements.features.ordering === true };
}
