import { getRestaurantById } from "../db";
import { hasFeature } from "../subscription-runtime";

/** Guest ordering probe shape (order.canOrder). */
export type GuestOrderingAllowed = {
  canOrder: boolean;
};

/** Same-request restaurant already loaded by public ordering authorization. */
export type GuestOrderingRestaurantRow = {
  id?: number;
  userId?: number;
};

function isReusableGuestOrderingRestaurant(
  restaurantId: number,
  restaurantRow: GuestOrderingRestaurantRow | null | undefined
): restaurantRow is GuestOrderingRestaurantRow & { userId: number } {
  return (
    restaurantRow != null &&
    restaurantRow.userId != null &&
    (restaurantRow.id == null || restaurantRow.id === restaurantId)
  );
}

/**
 * ASN-5 Wave A — single canonical guest ordering authority.
 *
 * restaurantId → ownerId → Subscription Runtime hasFeature("ordering")
 *
 * Optional `restaurantRow` reuses a restaurant already loaded in this request.
 * Entitlement (`hasFeature`) still runs. Mismatched/incomplete rows re-load.
 */
export async function resolveGuestOrderingAllowed(
  restaurantId: number,
  now: Date = new Date(),
  restaurantRow?: GuestOrderingRestaurantRow | null
): Promise<GuestOrderingAllowed> {
  const restaurant = isReusableGuestOrderingRestaurant(restaurantId, restaurantRow)
    ? restaurantRow
    : await getRestaurantById(restaurantId);
  if (!restaurant) {
    return { canOrder: false };
  }
  if (restaurant.userId == null) {
    return { canOrder: false };
  }

  const canOrder = await hasFeature(restaurant.userId, "ordering", now);
  return { canOrder };
}
