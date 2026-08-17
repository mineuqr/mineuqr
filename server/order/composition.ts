import { DrizzleOrderRepository } from "./infrastructure/persistence/DrizzleOrderRepository";
import { AdvanceOrderStatusService } from "./application/AdvanceOrderStatusService";
import { AdvanceOrderLifecycleService } from "./application/AdvanceOrderLifecycleService";
import { CompleteCashierPosOperationalService } from "./application/CompleteCashierPosOperationalService";
import { orderOutboxRepository } from "./eventInfrastructureComposition";

const orderRepository = new DrizzleOrderRepository(orderOutboxRepository);

export const advanceOrderStatusService = new AdvanceOrderStatusService(
  orderRepository
);

export const advanceOrderLifecycleService = new AdvanceOrderLifecycleService(
  orderRepository
);

export const completeCashierPosOperationalService =
  new CompleteCashierPosOperationalService(advanceOrderStatusService);

export { orderRepository };
