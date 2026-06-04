import {
  pickCanonicalSubscription,
  pickUserLevelSubscription,
  type UserSubscriptionRow,
} from "./subscriptionResolver";

export type ActivationTargetOptions = {
  subscriptionId?: number;
  restaurantId?: number;
  planId?: number;
};

/**
 * Pick exactly one subscription row to activate/update (pure, testable).
 * Priority: explicit id → restaurant scope → plan match → user-level (0) → canonical best.
 */
export function resolveSubscriptionForActivationFromRows(
  rows: UserSubscriptionRow[],
  options: ActivationTargetOptions = {}
): UserSubscriptionRow | undefined {
  if (rows.length === 0) return undefined;

  if (options.subscriptionId != null) {
    const byId = rows.find((r) => r.id === options.subscriptionId);
    if (byId) return byId;
  }

  if (options.restaurantId != null) {
    const scoped = pickCanonicalSubscription(
      rows.filter((r) => r.restaurantId === options.restaurantId)
    );
    if (scoped) return scoped;
  }

  if (options.planId != null) {
    return pickCanonicalSubscription(
      rows.filter((r) => r.planId === options.planId)
    );
  }

  const userLevel = pickUserLevelSubscription(rows);
  if (userLevel) return userLevel;

  return pickCanonicalSubscription(rows);
}
