import { DrizzleOrderRepository } from "./infrastructure/persistence/DrizzleOrderRepository";
import {
  orderNumberAdapter,
  orderPricingAdapter,
  trackingTokenAdapter,
} from "./infrastructure/adapters/OrderInfrastructureAdapters";
import { PlaceOrderService } from "./application/PlaceOrderService";
import { IdentityPlaceOrderService } from "./application/IdentityPlaceOrderService";
import { orderOutboxRepository } from "./eventInfrastructureComposition";
import { businessIdentityAllocator } from "./business-identity/composition";

const orderRepository = new DrizzleOrderRepository(
  orderOutboxRepository,
  businessIdentityAllocator
);

export const placeOrderService = new PlaceOrderService(
  orderRepository,
  orderPricingAdapter,
  orderNumberAdapter,
  trackingTokenAdapter
);

/** NON-TABLE-PLACE-ORDER-1 — identity-driven PlaceOrder (channel-agnostic). */
export const identityPlaceOrderService = new IdentityPlaceOrderService(
  placeOrderService
);

export { businessIdentityAllocator } from "./business-identity/composition";
