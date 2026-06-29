import type { OrderStatus } from "../value-objects/OrderStatus";

const ALLOWED_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  pending: ["preparing", "cancelled"],
  preparing: ["ready", "cancelled"],
  ready: ["served", "cancelled"],
  served: [],
  cancelled: [],
};

export class OrderLifecyclePolicy {
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    if (from === to) return false;
    return ALLOWED_TRANSITIONS[from].includes(to);
  }
}
