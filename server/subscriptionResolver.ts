import type { userSubscriptions } from "../drizzle/schema";
import { parseStoredUtcInstant } from "@shared/utils/timezone";
import {
  resolveSubscriptionEntitlement,
  type UserSubscriptionRow,
} from "./subscriptionEntitlement";

export type { UserSubscriptionRow };

/** Whether the row is entitled right now (delegates to resolveSubscriptionEntitlement). */
export function subscriptionEntitledNow(
  sub: Pick<UserSubscriptionRow, "status" | "trialEndsAt" | "currentPeriodEnd">,
  now: Date = new Date()
): boolean {
  return resolveSubscriptionEntitlement(sub as UserSubscriptionRow, now).isEntitled;
}

/** Relevant period end for ranking active/trial rows (newest period wins ties). */
export function subscriptionPeriodEndInstant(
  sub: Pick<UserSubscriptionRow, "status" | "trialEndsAt" | "currentPeriodEnd">
): Date | null {
  if (sub.status === "trial") {
    return parseStoredUtcInstant(sub.trialEndsAt);
  }
  return parseStoredUtcInstant(sub.currentPeriodEnd);
}

/**
 * Lower rank = higher priority when picking a canonical row.
 * 0 — trial/active and entitled now
 * 1 — trial/active but period elapsed
 * 2 — canceled / expired
 */
export function subscriptionCanonicalRank(
  sub: UserSubscriptionRow,
  now: Date = new Date()
): number {
  if (sub.status === "trial" || sub.status === "active") {
    return subscriptionEntitledNow(sub, now) ? 0 : 1;
  }
  return 2;
}

/**
 * Deterministic ordering for duplicate or competing subscription rows.
 */
export function compareSubscriptionsCanonical(
  a: UserSubscriptionRow,
  b: UserSubscriptionRow,
  now: Date = new Date()
): number {
  const rankDiff = subscriptionCanonicalRank(a, now) - subscriptionCanonicalRank(b, now);
  if (rankDiff !== 0) return rankDiff;

  const endA = subscriptionPeriodEndInstant(a);
  const endB = subscriptionPeriodEndInstant(b);
  if (endA && endB) {
    const endDiff = endB.getTime() - endA.getTime();
    if (endDiff !== 0) return endDiff;
  } else if (endA && !endB) return -1;
  else if (!endA && endB) return 1;

  return b.id - a.id;
}

/**
 * Pick one canonical row from a set (e.g. all rows for a restaurant).
 * Safe for duplicates — never uses bare limit(1).
 */
export function pickCanonicalSubscription(
  rows: UserSubscriptionRow[],
  now: Date = new Date()
): UserSubscriptionRow | undefined {
  if (rows.length === 0) return undefined;
  return [...rows].sort((a, b) => compareSubscriptionsCanonical(a, b, now))[0];
}

/** OAuth / account-level rows (restaurantId = 0), canonical pick. */
export function pickUserLevelSubscription(
  rows: UserSubscriptionRow[],
  now: Date = new Date()
): UserSubscriptionRow | undefined {
  return pickCanonicalSubscription(
    rows.filter((r) => r.restaurantId === 0),
    now
  );
}

/**
 * Ordering resolution: restaurant-scoped canonical row first, then user-level (restaurantId 0).
 */
export function resolveOrderingSubscriptionRow(
  restaurantId: number,
  userSubscriptions: UserSubscriptionRow[],
  now: Date = new Date()
): UserSubscriptionRow | undefined {
  const scoped = pickCanonicalSubscription(
    userSubscriptions.filter((s) => s.restaurantId === restaurantId),
    now
  );
  if (scoped) return scoped;
  return pickUserLevelSubscription(userSubscriptions, now);
}
