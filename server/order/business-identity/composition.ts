import { DrizzleBusinessIdentityAllocator } from "./infrastructure/DrizzleBusinessIdentityAllocator";
import { restaurantOpeningTimeResolver } from "./infrastructure/RestaurantOpeningTimeResolver";

export const businessIdentityAllocator = new DrizzleBusinessIdentityAllocator(
  restaurantOpeningTimeResolver
);

export {
  businessIdentityMetrics,
  BUSINESS_IDENTITY_METRIC_NAMES,
} from "./observability/BusinessIdentityMetrics";
export { BUSINESS_IDENTITY_RETRY_POLICY } from "./config/businessIdentityRetryPolicy";
