import type { OrderLifecycleStage } from "../../../domain/value-objects/OrderLifecycleStage";
import { isOperationalLifecycleStage } from "../../../domain/value-objects/OrderLifecycleStage";

/** Read-side lifecycle helpers — never infer lifecycle from operational status. */
export function operationalLifecycleFilter(): OrderLifecycleStage {
  return "active";
}

export function isOrderInOperationalLifecycle(lifecycle: OrderLifecycleStage): boolean {
  return isOperationalLifecycleStage(lifecycle);
}
