/**
 * COMMERCIAL-SNAPSHOT-RUNTIME-AUTHORITY-1
 * Branch-only entitlement assembly from an immutable Commercial Snapshot.
 * Never imports planFeatureMatrix / legacy commercial configuration.
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
import { bridgeByCatalogPlanCode, bridgeByLegacyPlanId } from "../services/commercial-catalog/legacyPlanBridge";

function parseInstant(value: string | Date | null | undefined): Date | null {
  if (value == null) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function isPeriodValid(
  end: string | Date | null | undefined,
  now: Date
): boolean {
  const instant = parseInstant(end);
  if (instant == null) return false;
  return now < instant;
}

function deniedFeatures(): CommercialFeatures {
  const features = {} as CommercialFeatures;
  for (const key of FEATURE_KEYS) {
    features[key] = key === "qrMenu" || key === "search";
  }
  return features;
}

function featuresFromSnapshot(snapshot: CommercialSnapshotDefinition): CommercialFeatures {
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

function limitsFromSnapshot(snapshot: CommercialSnapshotDefinition): CommercialLimits {
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

export type SnapshotLifecycleInput = {
  ownerId: number;
  role: UserRole;
  status: SubscriptionStatus;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
  legacyPlanId: number | null;
  now: Date;
};

/**
 * Build entitlements exclusively from Snapshot commercial facts + instance lifecycle.
 * Does not read Legacy matrix, Catalog, or subscription_plans.
 */
export function buildEntitlementsFromCommercialSnapshot(
  snapshot: CommercialSnapshotDefinition,
  lifecycle: SnapshotLifecycleInput
): CommercialEntitlementsResult {
  const catalogPlan = catalogPlanFromSnapshot(snapshot, lifecycle.legacyPlanId);
  const { status, now } = lifecycle;

  let commercialPlan: CommercialPlan = "NONE";
  let resolvedStatus: SubscriptionStatus | null = status;

  if (status === "canceled" || status === "expired") {
    commercialPlan = "NONE";
  } else if (status === "trial") {
    commercialPlan = isPeriodValid(lifecycle.trialEndsAt, now) ? "TRIAL" : "NONE";
  } else if (status === "active") {
    commercialPlan = isPeriodValid(lifecycle.currentPeriodEnd, now)
      ? (catalogPlan ?? "NONE")
      : "NONE";
  } else {
    commercialPlan = "NONE";
  }

  const entitled = commercialPlan !== "NONE";
  const entitlements: CommercialEntitlements = {
    accountType: accountTypeForPlan(commercialPlan),
    plan: commercialPlan,
    status: resolvedStatus,
    limits: entitled ? limitsFromSnapshot(snapshot) : { restaurants: 0, categories: 0, items: 0 },
    features: entitled ? featuresFromSnapshot(snapshot) : deniedFeatures(),
    commercial: flagsForResolvedPlan(commercialPlan),
  };

  const context: CommercialContext = {
    ownerId: lifecycle.ownerId,
    role: lifecycle.role,
    subscription:
      catalogPlan != null
        ? {
            catalogPlan,
            subscriptionStatus: status,
            trialEndsAt: lifecycle.trialEndsAt,
            currentPeriodEnd: lifecycle.currentPeriodEnd,
          }
        : null,
    now,
  };

  return {
    context,
    entitlements,
    meta: {
      commercialResolutionSource: "snapshot",
      commercialSnapshotPlanVersionId: snapshot.planVersionId,
      commercialName: snapshot.commercialName,
      billingCycle: snapshot.billingCycle,
      pricing: snapshot.pricing,
      trialPolicy: snapshot.trialPolicy,
      promotionApplied: snapshot.promotionApplied,
      region: snapshot.region ?? null,
      catalogPlanCode: snapshot.catalogPlanCode ?? null,
    },
  } as CommercialEntitlementsResult & { meta: Record<string, unknown> };
}

export function snapshotQuotaLimits(snapshot: CommercialSnapshotDefinition): {
  maxRestaurants: number;
  maxItemsPerRestaurant: number;
  maxCategories: number;
} {
  const limits = limitsFromSnapshot(snapshot);
  return {
    maxRestaurants: limits.restaurants ?? Number.MAX_SAFE_INTEGER,
    maxItemsPerRestaurant: limits.items ?? Number.MAX_SAFE_INTEGER,
    maxCategories: limits.categories ?? Number.MAX_SAFE_INTEGER,
  };
}

export type { FeatureKey };
