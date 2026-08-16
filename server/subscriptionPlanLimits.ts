import { TRPCError } from "@trpc/server";
import { eq, sql } from "drizzle-orm";
import {
  categories,
  menuItems,
  restaurants,
  type InsertCategory,
  type InsertMenuItem,
  type InsertRestaurant,
} from "../drizzle/schema";
import {
  getRestaurantById,
  getRestaurantStats,
  getRestaurantsByUser,
  createCategory,
  createMenuItem,
  createRestaurant,
} from "./db";
import {
  checkLimit,
  resolveOwnerEntitlements,
  withCommercialLimitOccupancy,
  throwCommercialOccupancyTrpcError,
} from "./subscription-runtime";
import {
  requireRestaurantRowForUpdate,
  RestaurantGoneError,
} from "./db/restaurantRowLock";

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

function mapOccupancyError(error: unknown, atLimitMessage: (cap: number) => string): never {
  if (error instanceof RestaurantGoneError) {
    throw new TRPCError({ code: "NOT_FOUND", message: "المطعم غير موجود" });
  }
  throwCommercialOccupancyTrpcError(error, atLimitMessage);
}

export async function createRestaurantWithCommercialLimit(
  data: InsertRestaurant
): Promise<{ id: number }> {
  const ownerUserId = data.userId;
  try {
    return await withCommercialLimitOccupancy({
      scope: { kind: "owner", scopeId: ownerUserId, ownerUserId },
      limitKey: "restaurants",
      occupancyDelta: 1,
      decide: (proposedTotal) =>
        checkLimit({
          ownerId: ownerUserId,
          limitKey: "restaurants",
          proposedTotal,
        }),
      countOccupancy: async (tx) => {
        if (!tx) {
          const rows = await getRestaurantsByUser(ownerUserId);
          return rows.length;
        }
        const rows = await tx
          .select({ id: restaurants.id })
          .from(restaurants)
          .where(eq(restaurants.userId, ownerUserId));
        return rows.length;
      },
      create: async (tx) => {
        if (!tx) return createRestaurant(data);
        const result = await tx.insert(restaurants).values(data);
        return { id: result[0].insertId };
      },
    });
  } catch (error) {
    mapOccupancyError(error, (cap) => `خطتك الحالية تسمح بحد أقصى ${cap} ${locationWord(cap)}.`);
  }
}

export async function createCategoryWithCommercialLimit(
  data: InsertCategory
): Promise<{ id: number }> {
  const restaurant = await getRestaurantById(data.restaurantId);
  if (!restaurant) {
    throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" });
  }
  try {
    return await withCommercialLimitOccupancy({
      scope: {
        kind: "restaurant",
        scopeId: data.restaurantId,
        ownerUserId: restaurant.userId,
      },
      limitKey: "categories",
      occupancyDelta: 1,
      decide: (proposedTotal) =>
        checkLimit({
          ownerId: restaurant.userId,
          limitKey: "categories",
          proposedTotal,
        }),
      countOccupancy: async (tx) => {
        if (!tx) {
          const stats = await getRestaurantStats(data.restaurantId);
          return stats.totalCategories;
        }
        await requireRestaurantRowForUpdate(tx, data.restaurantId);
        const [row] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(categories)
          .where(eq(categories.restaurantId, data.restaurantId));
        return Number(row?.count ?? 0);
      },
      create: async (tx) => {
        if (!tx) return createCategory(data);
        const result = await tx.insert(categories).values(data);
        return { id: result[0].insertId };
      },
    });
  } catch (error) {
    mapOccupancyError(
      error,
      (cap) => `خطتك الحالية تسمح بحد أقصى ${cap} فئات لهذا الموقع.`
    );
  }
}

export async function createMenuItemWithCommercialLimit(
  data: InsertMenuItem
): Promise<{ id: number }> {
  const restaurant = await getRestaurantById(data.restaurantId);
  if (!restaurant) {
    throw new TRPCError({ code: "FORBIDDEN", message: "غير مصرح بالوصول" });
  }
  try {
    return await withCommercialLimitOccupancy({
      scope: {
        kind: "restaurant",
        scopeId: data.restaurantId,
        ownerUserId: restaurant.userId,
      },
      limitKey: "items",
      occupancyDelta: 1,
      decide: (proposedTotal) =>
        checkLimit({
          ownerId: restaurant.userId,
          limitKey: "items",
          proposedTotal,
        }),
      countOccupancy: async (tx) => {
        if (!tx) {
          const stats = await getRestaurantStats(data.restaurantId);
          return stats.totalItems;
        }
        await requireRestaurantRowForUpdate(tx, data.restaurantId);
        const [row] = await tx
          .select({ count: sql<number>`count(*)` })
          .from(menuItems)
          .where(eq(menuItems.restaurantId, data.restaurantId));
        return Number(row?.count ?? 0);
      },
      create: async (tx) => {
        if (!tx) return createMenuItem(data);
        const result = await tx.insert(menuItems).values(data);
        return { id: result[0].insertId };
      },
    });
  } catch (error) {
    mapOccupancyError(
      error,
      (cap) => `خطتك الحالية تسمح بحد أقصى ${cap} أصناف لهذا الموقع.`
    );
  }
}
