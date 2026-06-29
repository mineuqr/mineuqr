import type { OrderStatus } from "../domain/value-objects/OrderStatus";
import type { OrderActor } from "../domain/value-objects/OrderActor";
import type { OrderDomainEvent } from "../domain/events/OrderDomainEvents";
import { OrderNotFoundError } from "../domain/errors/OrderDomainErrors";
import type { OrderRepository } from "../repositories/OrderRepository";

export type AdvanceOrderStatusCommand = {
  orderId: number;
  targetStatus: OrderStatus;
  actor: OrderActor;
};

export type AdvanceOrderStatusResult = {
  events: OrderDomainEvent[];
  previousStatus: OrderStatus;
  newStatus: OrderStatus;
};

export class AdvanceOrderStatusService {
  constructor(private readonly repository: OrderRepository) {}

  async execute(
    command: AdvanceOrderStatusCommand
  ): Promise<AdvanceOrderStatusResult> {
    const order = await this.repository.findById(command.orderId);
    if (!order) {
      throw new OrderNotFoundError();
    }

    const previousStatus = order.status;
    if (previousStatus === command.targetStatus) {
      return {
        events: [],
        previousStatus,
        newStatus: command.targetStatus,
      };
    }

    const expectedUpdatedAt = order.toPersistedProps().updatedAt;
    const changedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

    order.advanceStatus(command.targetStatus, command.actor, changedAt);
    const events = order.pullDomainEvents();

    await this.repository.save(order, {
      expectedUpdatedAt,
      domainEvents: events,
    });
    order.clearDomainEvents();

    return {
      events,
      previousStatus,
      newStatus: command.targetStatus,
    };
  }
}
