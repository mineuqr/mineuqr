/**
 * Re-export tenant ownership guard under STAB-SEC-1A naming convention.
 * Implementation lives in restaurantAccess.ts — no duplicate logic.
 */
export {
  assertRestaurantAccess as assertRestaurantOwnership,
  assertRestaurantAccess,
} from "./restaurantAccess";
