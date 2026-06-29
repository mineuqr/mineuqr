import { DrizzleOrderRepository } from "./infrastructure/persistence/DrizzleOrderRepository";
import { AdvanceOrderStatusService } from "./application/AdvanceOrderStatusService";

const orderRepository = new DrizzleOrderRepository();

export const advanceOrderStatusService = new AdvanceOrderStatusService(
  orderRepository
);

export { orderRepository };
