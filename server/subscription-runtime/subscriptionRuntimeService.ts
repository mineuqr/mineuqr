/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 * Canonical Subscription Runtime Service — owns commercial entitlement resolution.
 */

import { getCommercialEntitlementsFromContext } from "@commercial/getCommercialEntitlements";
import type { CommercialEntitlementsResult } from "@commercial/getCommercialEntitlements";
import type { SubscriptionStatus, UserRole } from "@commercial/planTypes";
import { buildCommercialContextFromDb } from "../commercial/buildCommercialContextFromDb";
import { getSubscriptionsByUser, getUserById } from "../db";
import { pickUserLevelSubscription } from "../subscriptionResolver";
import { commercialRuntimeAuthorityObservability } from "../services/commercial-catalog/runtimeAuthorityObservability";
import {
  getCachedEntitlements,
  invalidateEntitlementCache,
  setCachedEntitlements,
} from "./cache";
import {
  denyEntitlementsFailClosed,
  resolveEntitlementsFromLivePlan,
} from "./entitlementResolver";
import { syncCommercialLifecycle } from "./lifecycleSync";
import { getLifecycleSignals } from "./lifecycleOverlay";
import { loadBoundLivePlan } from "./snapshotLoader";

export type SubscriptionRuntimeResolveOptions = {
  now?: Date;
  /** Bypass short-lived cache. */
  bypassCache?: boolean;
  /** Opt-in decision cache (default off — prefer correctness + lifecycle signal freshness). */
  useCache?: boolean;
};

/**
 * Canonical runtime owner for commercial entitlements.
 * Bound → live plan capabilities. Unbound → Legacy Bridge only.
 */
export async function resolveOwnerEntitlements(
  ownerId: number,
  options: SubscriptionRuntimeResolveOptions = {}
): Promise<CommercialEntitlementsResult> {
  const now = options.now ?? new Date();
  const useCache = options.useCache === true && options.bypassCache !== true;

  if (useCache) {
    const cached = getCachedEntitlements(ownerId, now);
    if (cached) return cached;
  }

  const rows = await getSubscriptionsByUser(ownerId);
  const canonical = pickUserLevelSubscription(rows, now);

  if (!canonical?.id) {
    commercialRuntimeAuthorityObservability.recordLegacyBridgeUsed(
      "subscriptionRuntime:no_subscription"
    );
    commercialRuntimeAuthorityObservability.recordBindingCoverage(false);
    const context = await buildCommercialContextFromDb(ownerId, now);
    const legacy = getCommercialEntitlementsFromContext(context);
    const result = {
      ...legacy,
      meta: { commercialResolutionSource: "legacy_bridge" },
    } as CommercialEntitlementsResult;
    if (useCache) setCachedEntitlements(ownerId, result, now);
    return result;
  }

  const loaded = await loadBoundLivePlan(canonical.id);
  commercialRuntimeAuthorityObservability.recordBindingCoverage(loaded.binding);

  const user = await getUserById(ownerId);
  const role = (user?.role ?? "user") as UserRole;
  const dbStatus = canonical.status as SubscriptionStatus;
  const trialEndsAt = canonical.trialEndsAt ?? null;
  const currentPeriodEnd = canonical.currentPeriodEnd ?? null;
  const signals = getLifecycleSignals(canonical.id);

  if (loaded.ok) {
    const lifecycle = syncCommercialLifecycle({
      dbStatus,
      trialEndsAt,
      currentPeriodEnd,
      now,
      signals,
    });

    const result = resolveEntitlementsFromLivePlan({
      ownerId,
      role,
      planId: loaded.data.planId,
      catalogPlanCode: loaded.data.catalogPlanCode,
      featureKeys: loaded.data.featureKeys,
      limits: loaded.data.limits,
      chargedTerms: loaded.data.chargedTerms,
      legacyPlanId: loaded.data.legacyPlanId ?? canonical.planId,
      lifecycle,
      dbStatus,
      trialEndsAt,
      currentPeriodEnd,
      now,
    });

    commercialRuntimeAuthorityObservability.recordLivePlanResolved(canonical.id);
    if (useCache) setCachedEntitlements(ownerId, result, now);
    return result;
  }

  if (loaded.binding && loaded.reason === "live_plan_unreadable") {
    commercialRuntimeAuthorityObservability.recordSnapshotCreationFailure(
      `bound_live_plan_unreadable:${loaded.planId}`
    );
    const denied = denyEntitlementsFailClosed({
      ownerId,
      role,
      planId: loaded.planId,
      legacyPlanId: loaded.legacyPlanId,
      now,
    });
    if (useCache) setCachedEntitlements(ownerId, denied, now);
    return denied;
  }

  // Unbound — Legacy Bridge ONLY
  commercialRuntimeAuthorityObservability.recordLegacyBridgeUsed(
    "subscriptionRuntime:unbound"
  );
  const context = await buildCommercialContextFromDb(ownerId, now);
  const legacy = getCommercialEntitlementsFromContext(context);
  const result = {
    ...legacy,
    meta: { commercialResolutionSource: "legacy_bridge" },
  } as CommercialEntitlementsResult;
  if (useCache) setCachedEntitlements(ownerId, result, now);
  return result;
}

export function notifySubscriptionLifecycleChanged(ownerId: number): void {
  invalidateEntitlementCache(ownerId);
}

export const subscriptionRuntimeService = {
  resolveOwnerEntitlements,
  notifySubscriptionLifecycleChanged,
  invalidateEntitlementCache,
};
