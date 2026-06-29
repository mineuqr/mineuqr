import { DrizzleOrderRepository } from "./infrastructure/persistence/DrizzleOrderRepository";
import {
  orderNumberAdapter,
  orderPricingAdapter,
  trackingTokenAdapter,
} from "./infrastructure/adapters/OrderInfrastructureAdapters";
import { PlaceOrderService } from "./application/PlaceOrderService";
import { orderOutboxRepository } from "./eventInfrastructureComposition";

const orderRepository = new DrizzleOrderRepository(orderOutboxRepository);

export const placeOrderService = new PlaceOrderService(
  orderRepository,
  orderPricingAdapter,
  orderNumberAdapter,
  trackingTokenAdapter
);
