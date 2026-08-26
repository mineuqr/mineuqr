/**
 * ORDERS-POS-KITCHEN-LIFECYCLE-1
 * Walks cashier_pos Orders to served using existing lifecycle transitions.
 * Does not invent statuses. Settlement guard runs before any walk step.
 */
import { InvalidTransitionError } from "../domain/errors/OrderDomainErrors";
import type { OrderActor } from "../domain/value-objects/OrderActor";
import type { OrderStatus } from "../domain/value-objects/OrderStatus";
import type { AdvanceOrderStatusService } from "./AdvanceOrderStatusService";
import { assertCashierPosOrderCompletable } from "./cashierPosOperationalCompletionGuard";
import {
  isCashierPosOrderingChannel,
  nextCashierPosServeStep,
} from "./cashierPosOrderLifecycle";

export class CompleteCashierPosOperationalError extends Error {
  readonly code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "CompleteCashierPosOperationalError";
    this.code = code;
  }
}

export class CompleteCashierPosOperationalService {
  constructor(private readonly advance: AdvanceOrderStatusService) {}

  async execute(input: {
    orderId: number;
    restaurantId: number;
    sessionId: number | null | undefined;
    orderingChannel: string | null | undefined;
    currentStatus: OrderStatus;
    actor: OrderActor;
  }): Promise<{ previousStatus: OrderStatus; newStatus: OrderStatus }> {
    if (!isCashierPosOrderingChannel(input.orderingChannel)) {
      throw new CompleteCashierPosOperationalError(
        "not_cashier_pos",
        "Operational complete walk is only for cashier_pos Orders"
      );
    }

    const previousStatus = input.currentStatus;
    if (previousStatus === "served") {
      const completed = await this.advance.execute({
        orderId: input.orderId,
        targetStatus: "served",
        actor: input.actor,
      });
      return { previousStatus, newStatus: completed.newStatus };
    }
    if (previousStatus === "cancelled") {
      throw new InvalidTransitionError(previousStatus, "served");
    }

    await assertCashierPosOrderCompletable({
      restaurantId: input.restaurantId,
      orderId: input.orderId,
    });

    const targetStatuses: OrderStatus[] = [];
    let current: OrderStatus = previousStatus;
    for (;;) {
      if (current === "served") {
        break;
      }
      const next = nextCashierPosServeStep(current);
      if (!next) {
        throw new InvalidTransitionError(current, "served");
      }
      targetStatuses.push(next);
      current = next;
    }

    const walked = await this.advance.executeSequential({
      orderId: input.orderId,
      targetStatuses,
      actor: input.actor,
      settlementAlreadyAsserted: true,
    });

    return { previousStatus, newStatus: walked.newStatus };
  }
}
