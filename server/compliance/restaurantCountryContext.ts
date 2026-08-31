/**
 * MULTI-COUNTRY-COMPLIANCE-LAYER-FOUNDATION-1
 * Server-authoritative restaurant country resolution for compliance routing.
 */

import { normalizeCountryCode } from "@shared/compliance";
import { getRestaurantById } from "../db";

export async function resolveAuthoritativeRestaurantCountryCode(
  restaurantId: number
): Promise<string | null> {
  const restaurant = await getRestaurantById(restaurantId);
  if (!restaurant) return null;
  return normalizeCountryCode(restaurant.countryCode);
}
