import { parseStoredUtcInstant } from "@shared/utils/timezone";
import {
  getRestaurantById,
  getTrialEndDate,
  isSubscriptionActive,
  restaurantAllowsTableOrdering,
} from "../db";
import { getCommercialEntitlements } from "./getCommercialEntitlements";

/** Legacy-compatible trial status shape (subscription.checkTrialStatus). */
export type LegacyTrialStatusRead = {
  isActive: boolean;
  trialEndDate: Date | null;
};

/**
 * PG-1C.4C Wave 1 — trial status read via CommercialContext authority.
 *
 * Primary: getCommercialEntitlements → context dates + plan resolution.
 * Parity fallback: when account-level context is NONE but restaurant-scoped
 * rows exist (self-service register), legacy helpers preserve behavior.
 */
export async function resolveTrialStatusRead(
  userId: number,
  now: Date = new Date()
): Promise<LegacyTrialStatusRead> {
  const { context, entitlements } = await getCommercialEntitlements(userId, now);

  const isActive =
    entitlements.plan !== "NONE"
      ? true
      : await isSubscriptionActive(userId);

  const trialEndFromContext = context.subscription?.trialEndsAt
    ? parseStoredUtcInstant(context.subscription.trialEndsAt)
    : null;
  const trialEndDate = trialEndFromContext ?? (await getTrialEndDate(userId));

  return { isActive, trialEndDate };
}

/** Guest ordering probe shape (order.canOrder). */
export type CanOrderRead = {
  canOrder: boolean;
};

/**
 * PG-1C.4C Wave 1 — guest ordering probe via owner entitlements.features.ordering.
 *
 * When account-level plan is NONE, delegates entirely to legacy ordering resolution
 * (restaurant-scoped subscription row). Otherwise combines legacy + entitlements
 * so restaurant-scoped overrides remain visible until Wave 2 scope normalization.
 */
export async function resolveCanOrderRead(
  restaurantId: number,
  now: Date = new Date()
): Promise<CanOrderRead> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    return { canOrder: false };
  }

  const { entitlements } = await getCommercialEntitlements(restaurant.userId, now);
  const legacy = await restaurantAllowsTableOrdering(restaurantId);

  if (entitlements.plan === "NONE") {
    return { canOrder: legacy };
  }

  return {
    canOrder: legacy || entitlements.features.ordering === true,
  };
}
