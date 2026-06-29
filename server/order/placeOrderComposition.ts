import { DrizzleOrderRepository } from "./infrastructure/persistence/DrizzleOrderRepository";
import {
  orderNumberAdapter,
  orderPricingAdapter,
  trackingTokenAdapter,
} from "./infrastructure/adapters/OrderInfrastructureAdapters";
import { PlaceOrderService } from "./application/PlaceOrderService";

const orderRepository = new DrizzleOrderRepository();

export const placeOrderService = new PlaceOrderService(
  orderRepository,
  orderPricingAdapter,
  orderNumberAdapter,
  trackingTokenAdapter
);
