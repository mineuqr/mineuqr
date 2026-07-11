/**
 * ORDER-LIFECYCLE-ARCHIVE-1 — lifecycle dimension independent of operational status.
 */
export const ORDER_LIFECYCLE_STAGES = ["active", "completed", "archived"] as const;

export type OrderLifecycleStage = (typeof ORDER_LIFECYCLE_STAGES)[number];

export const DEFAULT_ORDER_LIFECYCLE_STAGE: OrderLifecycleStage = "active";

export function assertOrderLifecycleStage(value: string): OrderLifecycleStage {
  if (!(ORDER_LIFECYCLE_STAGES as readonly string[]).includes(value)) {
    throw new Error(`Invalid order lifecycle stage: ${value}`);
  }
  return value as OrderLifecycleStage;
}

/** Operational workspaces include orders in the active lifecycle stage only. */
export function isOperationalLifecycleStage(stage: OrderLifecycleStage): boolean {
  return stage === "active";
}
