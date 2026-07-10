import { DrizzleBusinessIdentityAllocator } from "./infrastructure/DrizzleBusinessIdentityAllocator";
import { restaurantOpeningTimeResolver } from "./infrastructure/RestaurantOpeningTimeResolver";

export const businessIdentityAllocator = new DrizzleBusinessIdentityAllocator(
  restaurantOpeningTimeResolver
);
