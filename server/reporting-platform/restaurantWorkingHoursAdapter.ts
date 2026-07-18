/**
 * REPORTING-BUSINESS-DAY-ADOPTION-1 — load restaurant opening hours for reporting.
 * Reuses Business Identity opening-time resolver (no duplicate hour parsing).
 */

import type { NormalizedWorkingHours } from "@shared/reporting-platform";
import { restaurantOpeningTimeResolver } from "../order/business-identity/infrastructure/RestaurantOpeningTimeResolver";

export async function loadRestaurantWorkingHoursForReporting(
  restaurantId: number
): Promise<NormalizedWorkingHours> {
  return restaurantOpeningTimeResolver.getWorkingHours(restaurantId);
}
