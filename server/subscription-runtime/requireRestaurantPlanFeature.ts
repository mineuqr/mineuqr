/**
 * COMMERCIAL-PLAN-CAPABILITY-GATING-IMPLEMENTATION-1
 * TRPC adapter: restaurant owner → requireFeature(canonical Projection key).
 * Does not resolve capabilities itself. No owner-role bypass.
 */

import { TRPCError } from "@trpc/server";
import type { FeatureKey } from "@commercial/featureKeys";
import { getRestaurantById } from "../db";
import { requireFeature } from "./enforcement";

const FORBIDDEN_MESSAGE = "غير مصرح بالوصول";

export async function requireRestaurantPlanFeature(
  restaurantId: number,
  featureKey: FeatureKey,
  now?: Date
): Promise<void> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) {
    throw new TRPCError({ code: "FORBIDDEN", message: FORBIDDEN_MESSAGE });
  }
  try {
    await requireFeature(restaurant.userId, featureKey, now);
  } catch (err) {
    const code = (err as Error & { code?: string }).code;
    if (code === "COMMERCIAL_ENTITLEMENT_DENIED") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: FORBIDDEN_MESSAGE,
      });
    }
    throw new TRPCError({
      code: "FORBIDDEN",
      message: FORBIDDEN_MESSAGE,
    });
  }
}
