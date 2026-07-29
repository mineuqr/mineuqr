/**
 * COMMERCIAL-CATALOG-PLATFORM-FOUNDATION-1
 * Plan Version publication lifecycle (CC-02 · CC-16).
 */

export const PLAN_VERSION_LIFECYCLE_STATES = [
  "draft",
  "published",
  "deprecated",
  "retired",
] as const;

export type PlanVersionLifecycleState =
  (typeof PLAN_VERSION_LIFECYCLE_STATES)[number];

/** States in which the commercial payload is immutable. */
export const IMMUTABLE_PLAN_VERSION_STATES: readonly PlanVersionLifecycleState[] =
  ["published", "deprecated", "retired"] as const;

export const ALLOWED_PLAN_VERSION_TRANSITIONS: Record<
  PlanVersionLifecycleState,
  readonly PlanVersionLifecycleState[]
> = {
  draft: ["published"],
  published: ["deprecated", "retired"],
  deprecated: ["retired"],
  retired: [],
};

export function isPlanVersionImmutable(
  state: PlanVersionLifecycleState
): boolean {
  return (IMMUTABLE_PLAN_VERSION_STATES as readonly string[]).includes(state);
}

export function canTransitionPlanVersion(
  from: PlanVersionLifecycleState,
  to: PlanVersionLifecycleState
): boolean {
  return ALLOWED_PLAN_VERSION_TRANSITIONS[from].includes(to);
}
