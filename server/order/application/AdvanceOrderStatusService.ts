import type { OrderStatus } from "../domain/value-objects/OrderStatus";
import type { OrderActor } from "../domain/value-objects/OrderActor";
import type { OrderDomainEvent } from "../domain/events/OrderDomainEvents";
import { OrderNotFoundError } from "../domain/errors/OrderDomainErrors";
import type { OrderRepository } from "../repositories/OrderRepository";
import { assertOrderCompletable } from "../../operational-session/check/lifecycleSettlementGuardService";

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

    // LIFECYCLE-SETTLEMENT-GUARDS-1 — sessionless complete requires settled Check.
    // Waiter / Table QR serve remains allowed while unpaid (Session close is guarded).
    if (command.targetStatus === "served") {
      await assertOrderCompletable({
        restaurantId: order.restaurantId,
        orderId: command.orderId,
        sessionId: order.sessionId,
      });
    }

    const expectedUpdatedAt = order.toPersistedProps().updatedAt;
    const changedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

    order.advanceStatus(command.targetStatus, command.actor, changedAt);
    const events = order.pullDomainEvents();

    if (
      order.lifecycleStage === "active" &&
      (command.targetStatus === "served" || command.targetStatus === "cancelled")
    ) {
      order.advanceLifecycleStage("completed", changedAt);
      events.push(...order.pullDomainEvents());
    }

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
