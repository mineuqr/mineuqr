import { eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { restaurants } from "../../../../drizzle/schema";
import {
  resolveNormalizedOpeningHours,
  type NormalizedWorkingHours,
} from "../../../../shared/utils/businessDay";

const cache = new Map<number, NormalizedWorkingHours>();

export class RestaurantOpeningTimeResolver {
  async getWorkingHours(restaurantId: number): Promise<NormalizedWorkingHours> {
    const cached = cache.get(restaurantId);
    if (cached) return cached;

    const db = await getDb();
    if (!db) {
      return resolveNormalizedOpeningHours(null);
    }

    const [row] = await db
      .select({ workingHours: restaurants.workingHours })
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    const hours = resolveNormalizedOpeningHours(row?.workingHours ?? null);
    cache.set(restaurantId, hours);
    return hours;
  }

  clearCache(): void {
    cache.clear();
  }
}

export const restaurantOpeningTimeResolver = new RestaurantOpeningTimeResolver();
