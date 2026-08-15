import { TRPCError } from "@trpc/server";
import { getRestaurantStats, getRestaurantsByUser } from "./db";
import { checkLimit, resolveOwnerEntitlements } from "./subscription-runtime";

export type PlanLimits = {
  maxRestaurants: number;
  maxItemsPerRestaurant: number;
  maxCategories: number;
};

const UNLIMITED_QUOTA = Number.MAX_SAFE_INTEGER;

function commercialLimitToQuota(value: number | null | undefined): number {
  return value == null ? UNLIMITED_QUOTA : value;
}

/**
 * COMMERCIAL-LIVE-PLANS-LIMITS-REPAIR-1
 * Quota adapter from the entitlement hub only. No PLAN_LIMITS, no
 * subscription_plans.maxRestaurants, no Basic fallback.
 */
export async function resolvePlanLimitsForUser(
  userId: number,
  _restaurantId?: number
): Promise<PlanLimits> {
  const result = await resolveOwnerEntitlements(userId);
  return {
    maxRestaurants: commercialLimitToQuota(result.entitlements.limits.restaurants),
    maxItemsPerRestaurant: commercialLimitToQuota(result.entitlements.limits.items),
    maxCategories: commercialLimitToQuota(result.entitlements.limits.categories),
  };
}

function locationWord(max: number): string {
  return max === 1 ? "موقع" : "مواقع";
}

export async function assertRestaurantCreateAllowed(userId: number): Promise<void> {
  const restaurants = await getRestaurantsByUser(userId);
  const decision = await checkLimit({
    ownerId: userId,
    limitKey: "restaurants",
    proposedTotal: restaurants.length + 1,
  });
  if (!decision.allowed) {
    const cap = decision.cap ?? 0;
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `خطتك الحالية تسمح بحد أقصى ${cap} ${locationWord(cap)}.`,
    });
  }
}

export async function assertCategoryCreateAllowed(
  userId: number,
  restaurantId: number
): Promise<void> {
  const stats = await getRestaurantStats(restaurantId);
  const decision = await checkLimit({
    ownerId: userId,
    limitKey: "categories",
    proposedTotal: stats.totalCategories + 1,
  });
  if (!decision.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `خطتك الحالية تسمح بحد أقصى ${decision.cap ?? 0} فئات لهذا الموقع.`,
    });
  }
}

export async function assertMenuItemCreateAllowed(
  userId: number,
  restaurantId: number
): Promise<void> {
  const stats = await getRestaurantStats(restaurantId);
  const decision = await checkLimit({
    ownerId: userId,
    limitKey: "items",
    proposedTotal: stats.totalItems + 1,
  });
  if (!decision.allowed) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: `خطتك الحالية تسمح بحد أقصى ${decision.cap ?? 0} أصناف لهذا الموقع.`,
    });
  }
}
