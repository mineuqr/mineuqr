/**
 * PLATFORM-OWNER-ACCESS-MODE-IMPLEMENTATION-1
 * Entitlement results for owner access modes. No subscription / binding.
 */

import { FEATURE_KEYS } from "@commercial/featureKeys";
import type { CommercialContext } from "@commercial/commercialContext";
import type { CommercialEntitlementsResult } from "@commercial/getCommercialEntitlements";
import type { CommercialFeatures, CommercialEntitlements } from "@commercial/types";
import type { UserRole } from "@commercial/planTypes";
import {
  denyEntitlementsFailClosed,
  resolveEntitlementsFromLivePlan,
} from "../subscription-runtime/entitlementResolver";
import { getCurrentLivePlanCompositionByCode } from "./livePlanComposition";
import type { OwnerAccessModeState } from "./types";

export type PlatformOwnerResolutionSource =
  | "platform_owner_full_platform"
  | "platform_owner_simulated_plan"
  | "platform_owner_simulation_unavailable"
  | "platform_owner_invalid_mode";

function allCurrentFeatures(): CommercialFeatures {
  const features = {} as CommercialFeatures;
  for (const key of FEATURE_KEYS) {
    features[key] = true;
  }
  return features;
}

export function resolveFullPlatformEntitlements(input: {
  ownerId: number;
  role: UserRole;
  now: Date;
}): CommercialEntitlementsResult {
  const entitlements: CommercialEntitlements = {
    accountType: "ADMIN",
    plan: "ADMIN",
    status: "active",
    limits: { restaurants: null, categories: null, items: null },
    features: allCurrentFeatures(),
    commercial: {
      isTrial: false,
      isPaid: false,
      isEnterprise: false,
      isAdmin: true,
      countsInMrr: false,
      countsInRevenue: false,
      invoiceEligible: false,
    },
  };
  const context: CommercialContext = {
    ownerId: input.ownerId,
    role: input.role,
    subscription: null,
    now: input.now,
  };
  return {
    context,
    entitlements,
    meta: { commercialResolutionSource: "platform_owner_full_platform" },
  };
}

export async function resolvePlatformOwnerEntitlements(input: {
  ownerId: number;
  role: UserRole;
  now: Date;
  state: OwnerAccessModeState;
}): Promise<CommercialEntitlementsResult> {
  if (!input.state.ok) {
    const denied = denyEntitlementsFailClosed({
      ownerId: input.ownerId,
      role: input.role,
      planId: "platform-owner-invalid-mode",
      legacyPlanId: null,
      now: input.now,
    });
    return {
      ...denied,
      meta: {
        ...denied.meta,
        commercialResolutionSource: "platform_owner_invalid_mode",
        commercialLifecycleReason: "invalid_persisted_state",
      },
    };
  }

  if (input.state.mode === "FULL_PLATFORM") {
    return resolveFullPlatformEntitlements(input);
  }

  const composition = await getCurrentLivePlanCompositionByCode(
    input.state.simulatedPlanCode
  );
  if (!composition) {
    const denied = denyEntitlementsFailClosed({
      ownerId: input.ownerId,
      role: input.role,
      planId: input.state.simulatedPlanCode,
      legacyPlanId: null,
      now: input.now,
    });
    return {
      ...denied,
      meta: {
        ...denied.meta,
        commercialResolutionSource: "platform_owner_simulation_unavailable",
        catalogPlanCode: input.state.simulatedPlanCode,
        commercialLifecycleReason: "simulation_unavailable",
      },
    };
  }

  const result = resolveEntitlementsFromLivePlan({
    ownerId: input.ownerId,
    role: input.role,
    planId: composition.planId,
    catalogPlanCode: composition.catalogPlanCode,
    featureKeys: composition.featureKeys,
    limits: composition.limits,
    chargedTerms: null,
    legacyPlanId: null,
    lifecycle: {
      state: "active",
      entitlementsEnabled: true,
      grandfathered: false,
      reason: "platform_owner_simulation",
    },
    dbStatus: "active",
    trialEndsAt: null,
    currentPeriodEnd: null,
    now: input.now,
  });

  return {
    ...result,
    meta: {
      ...result.meta,
      commercialResolutionSource: "platform_owner_simulated_plan",
      catalogPlanCode: composition.catalogPlanCode,
      commercialName: composition.commercialName,
    },
  };
}
