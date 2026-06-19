import { and, eq, inArray } from "drizzle-orm";
import { diningSessions } from "../../drizzle/schema";
import {
  DINING_SESSION_ACTIVE_OPEN_GUARD,
  DINING_SESSION_ACTIVE_STATUSES,
} from "../diningSession/sessionTypes";

/** Active session row filter for a restaurant (ops overview, tables board). */
export function activeDiningSessionRestaurantConditions(restaurantId: number) {
  return and(
    eq(diningSessions.restaurantId, restaurantId),
    eq(diningSessions.openGuard, DINING_SESSION_ACTIVE_OPEN_GUARD),
    inArray(diningSessions.status, [...DINING_SESSION_ACTIVE_STATUSES])
  );
}

/** Active session state only — combine with table join keys in JOIN ON clauses. */
export function activeDiningSessionStateConditions() {
  return and(
    eq(diningSessions.openGuard, DINING_SESSION_ACTIVE_OPEN_GUARD),
    inArray(diningSessions.status, [...DINING_SESSION_ACTIVE_STATUSES])
  );
}
