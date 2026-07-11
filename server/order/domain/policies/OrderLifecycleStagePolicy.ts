import type { OrderLifecycleStage } from "../value-objects/OrderLifecycleStage";

const ALLOWED_LIFECYCLE_TRANSITIONS: Record<
  OrderLifecycleStage,
  readonly OrderLifecycleStage[]
> = {
  active: ["completed"],
  completed: ["archived"],
  archived: [],
};

/**
 * ORDER-LIFECYCLE-ARCHIVE-1 — monotonic lifecycle governance.
 * ACTIVE → COMPLETED → ARCHIVED only.
 */
export class OrderLifecycleStagePolicy {
  static canTransition(from: OrderLifecycleStage, to: OrderLifecycleStage): boolean {
    if (from === to) return false;
    return ALLOWED_LIFECYCLE_TRANSITIONS[from].includes(to);
  }
}
