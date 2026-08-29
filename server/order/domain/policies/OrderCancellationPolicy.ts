import type { OrderStatus } from "../value-objects/OrderStatus";
import { isTerminalOrderStatus } from "../value-objects/OrderStatus";
import type { OrderActor } from "../value-objects/OrderActor";
import {
  assertCanAdvanceOrder,
  assertCanCancelOrder,
  canCancelOrder,
} from "../value-objects/OrderActor";
import { AccessDeniedError } from "../errors/OrderDomainErrors";

export class OrderCancellationPolicy {
  static canCancel(status: OrderStatus, actor: OrderActor): boolean {
    if (!canCancelOrder(actor)) return false;
    // ORDER-CANCELLATION-AFTER-ACCEPTANCE-CLOSE-1 — only pre-accept pending.
    return status === "pending";
  }

  static assertCanAdvance(actor: OrderActor): void {
    try {
      assertCanAdvanceOrder(actor);
    } catch {
      throw new AccessDeniedError();
    }
  }

  static assertCanCancel(status: OrderStatus, actor: OrderActor): void {
    if (!canCancelOrder(actor)) {
      throw new AccessDeniedError();
    }
    if (isTerminalOrderStatus(status)) {
      return;
    }
  }
}
