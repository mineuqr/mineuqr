import type { OrderLifecycleStage } from "../domain/value-objects/OrderLifecycleStage";
import { OrderNotFoundError } from "../domain/errors/OrderDomainErrors";
import type { OrderDomainEvent } from "../domain/events/OrderDomainEvents";
import type { OrderRepository } from "../repositories/OrderRepository";

export type AdvanceOrderLifecycleCommand = {
  orderId: number;
  targetStage: OrderLifecycleStage;
};

export type AdvanceOrderLifecycleResult = {
  events: OrderDomainEvent[];
  previousStage: OrderLifecycleStage;
  newStage: OrderLifecycleStage;
};

/**
 * ORDER-LIFECYCLE-ARCHIVE-1 — sole entry point for lifecycle stage transitions.
 */
export class AdvanceOrderLifecycleService {
  constructor(private readonly repository: OrderRepository) {}

  async execute(
    command: AdvanceOrderLifecycleCommand
  ): Promise<AdvanceOrderLifecycleResult> {
    const order = await this.repository.findById(command.orderId);
    if (!order) {
      throw new OrderNotFoundError();
    }

    const previousStage = order.lifecycleStage;
    if (previousStage === command.targetStage) {
      return {
        events: [],
        previousStage,
        newStage: command.targetStage,
      };
    }

    const expectedUpdatedAt = order.toPersistedProps().updatedAt;
    const changedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

    order.advanceLifecycleStage(command.targetStage, changedAt);
    const events = order.pullDomainEvents();

    await this.repository.save(order, {
      expectedUpdatedAt,
      domainEvents: events,
    });
    order.clearDomainEvents();

    return {
      events,
      previousStage,
      newStage: command.targetStage,
    };
  }
}
