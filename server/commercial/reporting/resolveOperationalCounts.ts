import { eq } from "drizzle-orm";
import { restaurants } from "../../../drizzle/schema";
import { getAllUsers, getDb, getExtendedAdminStats } from "../../db";

export type OperationalCountsResult = {
  counts: {
    totalUsers: number;
    totalRestaurants: number;
    activeRestaurants: number;
    totalMenuItems: number;
    totalCategories: number;
    totalOffers: number;
  };
  restaurantDistribution: Array<{
    ownerId: number;
    ownerEmail: string | null;
    restaurantCount: number;
    activeRestaurantCount: number;
  }>;
};

/** Lightweight counts for dashboard / overview snapshot (matches EXEC-7C path). */
export async function resolveDashboardEntityCounts(): Promise<{
  totalUsers: number;
  activeRestaurants: number;
}> {
  const extended = await getExtendedAdminStats();
  const db = await getDb();
  const activeRestaurants = db
    ? (
        await db
          .select({ id: restaurants.id })
          .from(restaurants)
          .where(eq(restaurants.isActive, true))
      ).length
    : 0;

  return {
    totalUsers: extended?.totalUsers ?? 0,
    activeRestaurants,
  };
}

/** Full operational entity counts — ADMIN-UX-1E operational report only. */
export async function resolveOperationalCounts(): Promise<OperationalCountsResult> {
  const extended = await getExtendedAdminStats();
  const users = await getAllUsers();
  const userById = new Map(users.map((u) => [u.id, u]));

  const db = await getDb();
  const restaurantRows = db ? await db.select().from(restaurants) : [];

  const distributionMap = new Map<
    number,
    { restaurantCount: number; activeRestaurantCount: number }
  >();

  for (const row of restaurantRows) {
    const current = distributionMap.get(row.userId) ?? {
      restaurantCount: 0,
      activeRestaurantCount: 0,
    };
    current.restaurantCount += 1;
    if (row.isActive) current.activeRestaurantCount += 1;
    distributionMap.set(row.userId, current);
  }

  const restaurantDistribution = Array.from(distributionMap.entries())
    .map(([ownerId, counts]) => ({
      ownerId,
      ownerEmail: userById.get(ownerId)?.email ?? null,
      restaurantCount: counts.restaurantCount,
      activeRestaurantCount: counts.activeRestaurantCount,
    }))
    .sort((a, b) => a.ownerId - b.ownerId);

  const activeRestaurants = restaurantRows.filter((r) => r.isActive).length;

  return {
    counts: {
      totalUsers: extended?.totalUsers ?? 0,
      totalRestaurants: extended?.totalRestaurants ?? 0,
      activeRestaurants,
      totalMenuItems: extended?.totalMenuItems ?? 0,
      totalCategories: extended?.totalCategories ?? 0,
      totalOffers: extended?.totalOffers ?? 0,
    },
    restaurantDistribution,
  };
}
