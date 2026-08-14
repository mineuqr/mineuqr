/**
 * COMMERCIAL-LIVE-PLANS-SIMPLIFICATION-1
 * Canonical entitlement resolver — live plan capabilities + lifecycle + charged terms.
 */

import { FEATURE_KEYS, type FeatureKey } from "@commercial/featureKeys";
import { expandFeatureKeysForRuntime } from "@shared/commercial-projection";
import type { CommercialContext } from "@commercial/commercialContext";
import type { CommercialEntitlementsResult } from "@commercial/getCommercialEntitlements";
import type {
  CatalogPlan,
  CommercialPlan,
  SubscriptionStatus,
  UserRole,
} from "@commercial/planTypes";
import type {
  CommercialEntitlements,
  CommercialFeatures,
  CommercialFlags,
  CommercialLimits,
} from "@commercial/types";
import type { CommercialChargedTerms } from "@shared/commercial-catalog";
import {
  bridgeByCatalogPlanCode,
  bridgeByLegacyPlanId,
} from "../services/commercial-catalog/legacyPlanBridge";
import {
  lifecycleEnablesEntitlements,
  type CommercialLifecycleState,
  type LifecycleSyncResult,
} from "./lifecycleSync";

function deniedFeatures(): CommercialFeatures {
  const features = {} as CommercialFeatures;
  for (const key of FEATURE_KEYS) {
    features[key] = key === "qrMenu" || key === "search";
  }
  return features;
}

function featuresFromKeys(raw: string[]): CommercialFeatures {
  const enabled = expandFeatureKeysForRuntime(raw);
  const features = {} as CommercialFeatures;
  for (const key of FEATURE_KEYS) {
    features[key] = enabled.has(key);
  }
  return features;
}

function limitsFromRows(
  rows: { limitKey: string; value: number | null }[]
): CommercialLimits {
  const map = new Map(rows.map((l) => [l.limitKey, l.value] as const));
  return {
    restaurants: map.has("restaurants") ? (map.get("restaurants") ?? null) : 0,
    categories: map.has("categories") ? (map.get("categories") ?? null) : 0,
    items: map.has("items") ? (map.get("items") ?? null) : 0,
  };
}

function catalogPlanFromCode(
  catalogPlanCode: string | null,
  legacyPlanId: number | null | undefined
): CatalogPlan | null {
  if (catalogPlanCode) {
    const bridge = bridgeByCatalogPlanCode(catalogPlanCode);
    if (bridge) return bridge.catalogPlanKey;
  }
  if (legacyPlanId != null) {
    return bridgeByLegacyPlanId(legacyPlanId)?.catalogPlanKey ?? null;
  }
  return null;
}

function flagsForResolvedPlan(plan: CommercialPlan): CommercialFlags {
  switch (plan) {
    case "TRIAL":
      return {
        isTrial: true,
        isPaid: false,
        isEnterprise: false,
        isAdmin: false,
        countsInMrr: false,
        countsInRevenue: false,
        invoiceEligible: false,
      };
    case "BASIC":
    case "PROFESSIONAL":
      return {
        isTrial: false,
        isPaid: true,
        isEnterprise: false,
        isAdmin: false,
        countsInMrr: true,
        countsInRevenue: true,
        invoiceEligible: true,
      };
    case "ENTERPRISE":
      return {
        isTrial: false,
        isPaid: true,
        isEnterprise: true,
        isAdmin: false,
        countsInMrr: true,
        countsInRevenue: true,
        invoiceEligible: true,
      };
    case "ADMIN":
      return {
        isTrial: false,
        isPaid: false,
        isEnterprise: false,
        isAdmin: true,
        countsInMrr: false,
        countsInRevenue: false,
        invoiceEligible: false,
      };
    default:
      return {
        isTrial: false,
        isPaid: false,
        isEnterprise: false,
        isAdmin: false,
        countsInMrr: false,
        countsInRevenue: false,
        invoiceEligible: false,
      };
  }
}

function accountTypeForPlan(
  plan: CommercialPlan
): CommercialEntitlements["accountType"] {
  if (plan === "ADMIN") return "ADMIN";
  if (plan === "TRIAL") return "TRIAL";
  if (plan === "BASIC" || plan === "PROFESSIONAL" || plan === "ENTERPRISE") {
    return "PAYING";
  }
  return "NONE";
}

export function lifecycleToSubscriptionStatus(
  state: CommercialLifecycleState
): SubscriptionStatus | null {
  switch (state) {
    case "trial":
      return "trial";
    case "active":
    case "grace":
      return "active";
    case "suspended":
    case "expired":
    case "archived":
    case "draft":
      return "expired";
    case "cancelled":
      return "canceled";
    default:
      return "expired";
  }
}

export type ResolveFromLivePlanInput = {
  ownerId: number;
  role: UserRole;
  planId: string;
  catalogPlanCode: string;
  featureKeys: string[];
  limits: { limitKey: string; value: number | null; unit?: string | null }[];
  chargedTerms: CommercialChargedTerms | null;
  legacyPlanId: number | null;
  lifecycle: LifecycleSyncResult;
  dbStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  now: Date;
};

export type EntitlementResolveMeta = {
  commercialResolutionSource: "live_plan" | "live_plan_fail_closed";
  commercialPlanId: string;
  commercialLifecycleState: CommercialLifecycleState;
  commercialLifecycleReason: string;
  grandfathered: boolean;
  commercialName?: string;
  chargedTerms?: CommercialChargedTerms | null;
  catalogPlanCode?: string | null;
};

export function resolveEntitlementsFromLivePlan(
  input: ResolveFromLivePlanInput
): CommercialEntitlementsResult & { meta: EntitlementResolveMeta } {
  const catalogPlan = catalogPlanFromCode(
    input.catalogPlanCode,
    input.legacyPlanId
  );
  const enabled = lifecycleEnablesEntitlements(input.lifecycle.state);

  let commercialPlan: CommercialPlan = "NONE";
  if (enabled) {
    if (input.lifecycle.state === "trial") {
      commercialPlan = "TRIAL";
    } else if (catalogPlan) {
      commercialPlan = catalogPlan;
    }
  }

  const effectivelyEntitled = commercialPlan !== "NONE";

  const entitlements: CommercialEntitlements = {
    accountType: accountTypeForPlan(commercialPlan),
    plan: commercialPlan,
    status: lifecycleToSubscriptionStatus(input.lifecycle.state),
    limits: effectivelyEntitled
      ? limitsFromRows(input.limits)
      : { restaurants: 0, categories: 0, items: 0 },
    features: effectivelyEntitled
      ? featuresFromKeys(input.featureKeys)
      : deniedFeatures(),
    commercial: flagsForResolvedPlan(commercialPlan),
  };

  const context: CommercialContext = {
    ownerId: input.ownerId,
    role: input.role,
    subscription:
      catalogPlan != null
        ? {
            catalogPlan,
            subscriptionStatus: input.dbStatus,
            trialEndsAt: input.trialEndsAt,
            currentPeriodEnd: input.currentPeriodEnd,
          }
        : null,
    now: input.now,
  };

  return {
    context,
    entitlements,
    meta: {
      commercialResolutionSource: "live_plan",
      commercialPlanId: input.planId,
      commercialLifecycleState: input.lifecycle.state,
      commercialLifecycleReason: input.lifecycle.reason,
      grandfathered: input.lifecycle.grandfathered,
      commercialName: input.chargedTerms?.commercialName,
      chargedTerms: input.chargedTerms,
      catalogPlanCode: input.catalogPlanCode,
    },
  };
}

export function denyEntitlementsFailClosed(input: {
  ownerId: number;
  role: UserRole;
  planId: string;
  legacyPlanId: number | null;
  now: Date;
}): CommercialEntitlementsResult & { meta: EntitlementResolveMeta } {
  const entitlements: CommercialEntitlements = {
    accountType: "NONE",
    plan: "NONE",
    status: "expired",
    limits: { restaurants: 0, categories: 0, items: 0 },
    features: deniedFeatures(),
    commercial: flagsForResolvedPlan("NONE"),
  };
  return {
    context: {
      ownerId: input.ownerId,
      role: input.role,
      subscription: null,
      now: input.now,
    },
    entitlements,
    meta: {
      commercialResolutionSource: "live_plan_fail_closed",
      commercialPlanId: input.planId,
      commercialLifecycleState: "expired",
      commercialLifecycleReason: "live_plan_unreadable",
      grandfathered: false,
    },
  };
}

export function hasFeatureInEntitlements(
  entitlements: CommercialEntitlements,
  featureKey: FeatureKey
): boolean {
  return entitlements.features[featureKey] === true;
}

export function readLimitValue(
  entitlements: CommercialEntitlements,
  limitKey: string
): number | null | undefined {
  if (limitKey === "restaurants") return entitlements.limits.restaurants;
  if (limitKey === "categories") return entitlements.limits.categories;
  if (limitKey === "items") return entitlements.limits.items;
  return undefined;
}
