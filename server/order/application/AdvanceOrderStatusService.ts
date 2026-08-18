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
      // CASHIER-ORDER-VISIBILITY-AND-NOTIFICATION-1 — served/cancelled with
      // leftover operational lifecycle must complete so listActive drops them.
      if (
        order.lifecycleStage === "active" &&
        (command.targetStatus === "served" || command.targetStatus === "cancelled")
      ) {
        const expectedUpdatedAt = order.toPersistedProps().updatedAt;
        const changedAt = new Date().toISOString().slice(0, 19).replace("T", " ");
        order.advanceLifecycleStage("completed", changedAt);
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

  /**
   * CASHIER-ORDER-AND-CHECKOUT-LATENCY-FORENSICS-1
   * Apply consecutive legal transitions on one load and one persist.
   * Used by cashier_pos تم التقديم so the first click reaches served +
   * lifecycleStage completed without intermediate projection windows.
   */
  async executeSequential(command: {
    orderId: number;
    targetStatuses: readonly OrderStatus[];
    actor: OrderActor;
  }): Promise<AdvanceOrderStatusResult> {
    const order = await this.repository.findById(command.orderId);
    if (!order) {
      throw new OrderNotFoundError();
    }

    const previousStatus = order.status;
    if (command.targetStatuses.length === 0) {
      return {
        events: [],
        previousStatus,
        newStatus: previousStatus,
      };
    }

    const expectedUpdatedAt = order.toPersistedProps().updatedAt;
    const changedAt = new Date().toISOString().slice(0, 19).replace("T", " ");

    for (const targetStatus of command.targetStatuses) {
      if (order.status === targetStatus) {
        continue;
      }
      if (targetStatus === "served") {
        await assertOrderCompletable({
          restaurantId: order.restaurantId,
          orderId: command.orderId,
          sessionId: order.sessionId,
        });
      }
      order.advanceStatus(targetStatus, command.actor, changedAt);
    }

    const events = order.pullDomainEvents();
    const newStatus = order.status;
    if (
      order.lifecycleStage === "active" &&
      (newStatus === "served" || newStatus === "cancelled")
    ) {
      order.advanceLifecycleStage("completed", changedAt);
      events.push(...order.pullDomainEvents());
    }

    if (events.length === 0) {
      return { events, previousStatus, newStatus };
    }

    await this.repository.save(order, {
      expectedUpdatedAt,
      domainEvents: events,
    });
    order.clearDomainEvents();

    return { events, previousStatus, newStatus };
  }
}
