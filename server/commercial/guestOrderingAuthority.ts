import { getRestaurantById } from "../db";
import { hasFeature } from "../subscription-runtime";

/** Guest ordering probe shape (order.canOrder). */
export type GuestOrderingAllowed = {
  canOrder: boolean;
};

/**
 * ASN-5 Wave A — single canonical guest ordering authority.
 *
 * restaurantId → ownerId → Subscription Runtime hasFeature("ordering")
 */
export async function resolveGuestOrderingAllowed(
  restaurantId: number,
  now: Date = new Date()
): Promise<GuestOrderingAllowed> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    return { canOrder: false };
  }

  const canOrder = await hasFeature(restaurant.userId, "ordering", now);
  return { canOrder };
}
