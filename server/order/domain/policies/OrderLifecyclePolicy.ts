/**
 * ORDER-LIFECYCLE-GUARD-1 — single operational transition matrix.
 * Channels (Kiosk / Waiter / Table QR / POS) do not define a second machine.
 * Cancel is pending-only. No backward restore transitions.
 */
import type { OrderStatus } from "../value-objects/OrderStatus";

export const ORDER_LIFECYCLE_ALLOWED_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  pending: ["preparing", "cancelled"],
  preparing: ["ready"],
  ready: ["served"],
  served: [],
  cancelled: [],
};

export class OrderLifecyclePolicy {
  static canTransition(from: OrderStatus, to: OrderStatus): boolean {
    if (from === to) return false;
    return ORDER_LIFECYCLE_ALLOWED_TRANSITIONS[from].includes(to);
  }
}
