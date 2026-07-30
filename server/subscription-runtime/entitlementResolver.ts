/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 * Canonical entitlement resolver — Snapshot facts + lifecycle only.
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
import type { CommercialSnapshotDefinition } from "@shared/commercial-catalog";
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

function featuresFromSnapshot(
  snapshot: CommercialSnapshotDefinition
): CommercialFeatures {
  const raw = snapshot.includedFeatures
    .filter((f) => f.included)
    .map((f) => f.featureKey);
  const enabled = expandFeatureKeysForRuntime(raw);
  const features = {} as CommercialFeatures;
  for (const key of FEATURE_KEYS) {
    features[key] = enabled.has(key);
  }
  return features;
}

function limitsFromSnapshot(
  snapshot: CommercialSnapshotDefinition
): CommercialLimits {
  const map = new Map(
    snapshot.usageLimits.map((l) => [l.limitKey, l.value] as const)
  );
  return {
    restaurants: map.has("restaurants") ? (map.get("restaurants") ?? null) : 0,
    categories: map.has("categories") ? (map.get("categories") ?? null) : 0,
    items: map.has("items") ? (map.get("items") ?? null) : 0,
  };
}

function catalogPlanFromSnapshot(
  snapshot: CommercialSnapshotDefinition,
  legacyPlanId: number | null | undefined
): CatalogPlan | null {
  if (snapshot.catalogPlanCode) {
    const bridge = bridgeByCatalogPlanCode(snapshot.catalogPlanCode);
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

/** Map commercial lifecycle → legacy SubscriptionStatus for DTO compat. */
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

export type ResolveFromSnapshotInput = {
  ownerId: number;
  role: UserRole;
  snapshot: CommercialSnapshotDefinition;
  snapshotId: string;
  legacyPlanId: number | null;
  lifecycle: LifecycleSyncResult;
  dbStatus: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  now: Date;
};

export type EntitlementResolveMeta = {
  commercialResolutionSource: "snapshot" | "snapshot_fail_closed";
  commercialSnapshotId: string;
  commercialLifecycleState: CommercialLifecycleState;
  commercialLifecycleReason: string;
  grandfathered: boolean;
  commercialSnapshotPlanVersionId?: string;
  commercialName?: string;
  billingCycle?: CommercialSnapshotDefinition["billingCycle"];
  pricing?: CommercialSnapshotDefinition["pricing"];
  trialPolicy?: CommercialSnapshotDefinition["trialPolicy"];
  promotionApplied?: CommercialSnapshotDefinition["promotionApplied"];
  region?: CommercialSnapshotDefinition["region"];
  catalogPlanCode?: string | null;
};

/**
 * Canonical Snapshot entitlement assembly.
 * MUST NOT import live Catalog feature matrix modules.
 */
export function resolveEntitlementsFromSnapshot(
  input: ResolveFromSnapshotInput
): CommercialEntitlementsResult & { meta: EntitlementResolveMeta } {
  const catalogPlan = catalogPlanFromSnapshot(
    input.snapshot,
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
      ? limitsFromSnapshot(input.snapshot)
      : { restaurants: 0, categories: 0, items: 0 },
    features: effectivelyEntitled
      ? featuresFromSnapshot(input.snapshot)
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
      commercialResolutionSource: "snapshot",
      commercialSnapshotId: input.snapshotId,
      commercialLifecycleState: input.lifecycle.state,
      commercialLifecycleReason: input.lifecycle.reason,
      grandfathered: input.lifecycle.grandfathered,
      commercialSnapshotPlanVersionId: input.snapshot.planVersionId,
      commercialName: input.snapshot.commercialName,
      billingCycle: input.snapshot.billingCycle,
      pricing: input.snapshot.pricing,
      trialPolicy: input.snapshot.trialPolicy,
      promotionApplied: input.snapshot.promotionApplied,
      region: input.snapshot.region ?? null,
      catalogPlanCode: input.snapshot.catalogPlanCode ?? null,
    },
  };
}

export function denyEntitlementsFailClosed(input: {
  ownerId: number;
  role: UserRole;
  snapshotId: string;
  planVersionId: string;
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
      commercialResolutionSource: "snapshot_fail_closed",
      commercialSnapshotId: input.snapshotId,
      commercialLifecycleState: "expired",
      commercialLifecycleReason: "snapshot_unreadable",
      grandfathered: false,
      commercialSnapshotPlanVersionId: input.planVersionId,
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
