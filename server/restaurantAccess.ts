import type { SelectUser } from "../drizzle/schema";
import { getRestaurantById } from "./db";
import { TRPCError } from "@trpc/server";

type AuthContext = { user: SelectUser };

const FORBIDDEN_MESSAGE = "غير مصرح بالوصول";

/**
 * Ensures the authenticated user owns the restaurant or is an admin.
 * Throws FORBIDDEN if the restaurant is missing or access is denied.
 */
export async function assertRestaurantAccess(
  ctx: AuthContext,
  restaurantId: number
): Promise<void> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    throw new TRPCError({ code: "FORBIDDEN", message: FORBIDDEN_MESSAGE });
  }
  if (restaurant.userId !== ctx.user.id && ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: FORBIDDEN_MESSAGE });
  }
}
