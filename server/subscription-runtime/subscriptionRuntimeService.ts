/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 * Canonical Subscription Runtime Service — owns commercial entitlement resolution.
 */

import { getCommercialEntitlementsFromContext } from "@commercial/getCommercialEntitlements";
import type { CommercialEntitlementsResult } from "@commercial/getCommercialEntitlements";
import type { SubscriptionStatus, UserRole } from "@commercial/planTypes";
import { buildCommercialContextFromDb } from "../commercial/buildCommercialContextFromDb";
import { getSubscriptionsByUser, getUserById } from "../db";
import { isPlatformOwner } from "../platform-owner-access/identity";
import { resolvePlatformOwnerEntitlements } from "../platform-owner-access/entitlements";
import { loadOwnerAccessMode } from "../platform-owner-access/service";
import { pickUserLevelSubscription } from "../subscriptionResolver";
import { commercialRuntimeAuthorityObservability } from "../services/commercial-catalog/runtimeAuthorityObservability";
import {
  getCachedEntitlements,
  invalidateEntitlementCache,
  setCachedEntitlements,
  type EntitlementCacheScope,
} from "./cache";
import {
  denyEntitlementsFailClosed,
  resolveEntitlementsFromLivePlan,
} from "./entitlementResolver";
import { deriveCommercialAccountState } from "./commercialAccountState";
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

function withAccountState(
  result: CommercialEntitlementsResult,
  input: {
    ownerExempt: boolean;
    hasCanonicalCustomerSubscription: boolean;
    entitlementsEnabled: boolean;
  }
): CommercialEntitlementsResult {
  const derived = deriveCommercialAccountState(input);
  return {
    ...result,
    meta: {
      ...(result.meta ?? {}),
      commercialAccountState: derived.state,
      commercialAccountStateReason: derived.reason,
    },
  };
}

function cacheScopeForOwnerState(state: {
  ok: boolean;
  mode?: string;
  simulatedPlanCode?: string | null;
}): EntitlementCacheScope {
  return {
    kind: "platform_owner",
    mode: state.ok ? state.mode : "invalid",
    simulatedPlanCode: state.simulatedPlanCode ?? null,
  };
}

/**
 * Canonical runtime owner for commercial entitlements.
 * Platform Owner (ENV.ownerOpenId) is evaluated before customer subscription.
 * Bound → live plan capabilities. Unbound → Legacy Bridge only.
 */
export async function resolveOwnerEntitlements(
  ownerId: number,
  options: SubscriptionRuntimeResolveOptions = {}
): Promise<CommercialEntitlementsResult> {
  const now = options.now ?? new Date();
  const useCache = options.useCache === true && options.bypassCache !== true;
  const user = await getUserById(ownerId);
  const role = (user?.role ?? "user") as UserRole;

  if (user && isPlatformOwner(user)) {
    const state = await loadOwnerAccessMode(user.openId);
    const scope = cacheScopeForOwnerState(state);
    if (useCache) {
      const cached = getCachedEntitlements(ownerId, now, scope);
      if (cached) return cached;
    }
    const result = withAccountState(
      await resolvePlatformOwnerEntitlements({
        ownerId,
        role,
        now,
        state,
      }),
      {
        ownerExempt: true,
        hasCanonicalCustomerSubscription: false,
        entitlementsEnabled: true,
      }
    );
    if (useCache) setCachedEntitlements(ownerId, result, now, undefined, scope);
    return result;
  }

  const customerScope: EntitlementCacheScope = { kind: "customer" };
  if (useCache) {
    const cached = getCachedEntitlements(ownerId, now, customerScope);
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
    const result = withAccountState(
      {
        ...legacy,
        meta: { commercialResolutionSource: "legacy_bridge" },
      } as CommercialEntitlementsResult,
      {
        ownerExempt: false,
        hasCanonicalCustomerSubscription: false,
        entitlementsEnabled: legacy.entitlements.plan !== "NONE",
      }
    );
    if (useCache) setCachedEntitlements(ownerId, result, now, undefined, customerScope);
    return result;
  }

  const loaded = await loadBoundLivePlan(canonical.id);
  commercialRuntimeAuthorityObservability.recordBindingCoverage(loaded.binding);

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
    const stamped = withAccountState(result, {
      ownerExempt: false,
      hasCanonicalCustomerSubscription: true,
      entitlementsEnabled: lifecycle.entitlementsEnabled,
    });
    if (useCache) setCachedEntitlements(ownerId, stamped, now, undefined, customerScope);
    return stamped;
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
    const stampedDenied = withAccountState(denied, {
      ownerExempt: false,
      hasCanonicalCustomerSubscription: true,
      entitlementsEnabled: false,
    });
    if (useCache) setCachedEntitlements(ownerId, stampedDenied, now, undefined, customerScope);
    return stampedDenied;
  }

  // Unbound — Legacy Bridge ONLY
  commercialRuntimeAuthorityObservability.recordLegacyBridgeUsed(
    "subscriptionRuntime:unbound"
  );
  const context = await buildCommercialContextFromDb(ownerId, now);
  const legacyUnbound = getCommercialEntitlementsFromContext(context);
  const unboundResult = withAccountState(
    {
      ...legacyUnbound,
      meta: { commercialResolutionSource: "legacy_bridge" },
    } as CommercialEntitlementsResult,
    {
      ownerExempt: false,
      hasCanonicalCustomerSubscription: true,
      entitlementsEnabled: legacyUnbound.entitlements.plan !== "NONE",
    }
  );
  if (useCache) setCachedEntitlements(ownerId, unboundResult, now, undefined, customerScope);
  return unboundResult;
}

export function notifySubscriptionLifecycleChanged(ownerId: number): void {
  invalidateEntitlementCache(ownerId);
}

export const subscriptionRuntimeService = {
  resolveOwnerEntitlements,
  notifySubscriptionLifecycleChanged,
  invalidateEntitlementCache,
};
