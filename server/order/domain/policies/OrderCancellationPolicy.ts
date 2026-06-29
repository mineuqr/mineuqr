import type { OrderStatus } from "../value-objects/OrderStatus";
import { isTerminalOrderStatus } from "../value-objects/OrderStatus";
import type { OrderActor } from "../value-objects/OrderActor";
import { isStaffActor } from "../value-objects/OrderActor";
import { AccessDeniedError } from "../errors/OrderDomainErrors";

export class OrderCancellationPolicy {
  static canCancel(status: OrderStatus, actor: OrderActor): boolean {
    if (!isStaffActor(actor)) return false;
    return !isTerminalOrderStatus(status);
  }

  static assertCanCancel(status: OrderStatus, actor: OrderActor): void {
    if (!isStaffActor(actor)) {
      throw new AccessDeniedError();
    }
    if (isTerminalOrderStatus(status)) {
      return;
    }
  }
}
