/**
 * SUBSCRIPTION-RUNTIME-ENTITLEMENT-ENFORCEMENT-1
 * Runtime enforcement layer — single entry for capability authorization.
 */

import type { FeatureKey } from "@commercial/featureKeys";
import type { CommercialEntitlementsResult } from "@commercial/getCommercialEntitlements";
import {
  assertFeatureKey,
  resolveCapabilityEntitlement,
  type LimitEntitlementKey,
} from "./capabilityMatrix";
import {
  hasFeatureInEntitlements,
  readLimitValue,
} from "./entitlementResolver";
import { resolveOwnerEntitlements } from "./subscriptionRuntimeService";

export type EntitlementDecision = {
  entitled: boolean;
  reasonCode: string;
  featureKey?: FeatureKey;
  limitKey?: string;
  source: string;
  lifecycleState?: string;
  grandfathered?: boolean;
  planId?: string;
};

export type LimitDecision = {
  allowed: boolean;
  reasonCode: string;
  limitKey: string;
  cap: number | null;
  proposedTotal?: number;
  policy: "unlimited" | "hard" | "denied";
  source: string;
};

function metaOf(result: CommercialEntitlementsResult): Record<string, unknown> {
  return ((result as { meta?: Record<string, unknown> }).meta ?? {}) as Record<
    string,
    unknown
  >;
}

export async function checkEntitlement(input: {
  ownerId: number;
  featureKey: FeatureKey;
  now?: Date;
}): Promise<EntitlementDecision> {
  const result = await resolveOwnerEntitlements(input.ownerId, {
    now: input.now,
  });
  const meta = metaOf(result);
  const entitled = hasFeatureInEntitlements(
    result.entitlements,
    input.featureKey
  );
  return {
    entitled,
    reasonCode: entitled ? "feature_granted" : "feature_denied",
    featureKey: input.featureKey,
    source: String(meta.commercialResolutionSource ?? "unknown"),
    lifecycleState: meta.commercialLifecycleState
      ? String(meta.commercialLifecycleState)
      : undefined,
    grandfathered: meta.grandfathered === true,
    planId: meta.commercialPlanId ? String(meta.commercialPlanId) : undefined,
  };
}

export async function hasFeature(
  ownerId: number,
  featureKey: FeatureKey,
  now?: Date
): Promise<boolean> {
  const decision = await checkEntitlement({ ownerId, featureKey, now });
  return decision.entitled;
}

export async function requireFeature(
  ownerId: number,
  featureKey: FeatureKey,
  now?: Date
): Promise<void> {
  const decision = await checkEntitlement({ ownerId, featureKey, now });
  if (!decision.entitled) {
    const err = new Error(
      `Commercial entitlement denied: ${featureKey} (${decision.reasonCode})`
    );
    (err as Error & { code?: string }).code = "COMMERCIAL_ENTITLEMENT_DENIED";
    throw err;
  }
}

export async function checkCapability(input: {
  ownerId: number;
  capabilityId: string;
  now?: Date;
}): Promise<EntitlementDecision> {
  const mapped = resolveCapabilityEntitlement(input.capabilityId);
  if (!mapped) {
    return {
      entitled: false,
      reasonCode: "unknown_capability",
      source: "matrix",
    };
  }
  if (mapped.kind !== "feature" || !assertFeatureKey(mapped.entitlementKey)) {
    return {
      entitled: false,
      reasonCode: "capability_not_feature",
      source: "matrix",
    };
  }
  return checkEntitlement({
    ownerId: input.ownerId,
    featureKey: mapped.entitlementKey,
    now: input.now,
  });
}

export async function checkLimit(input: {
  ownerId: number;
  limitKey: LimitEntitlementKey | "restaurants" | "categories" | "items";
  /** Current usage + proposed delta (e.g. existing + 1). */
  proposedTotal: number;
  now?: Date;
}): Promise<LimitDecision> {
  const result = await resolveOwnerEntitlements(input.ownerId, {
    now: input.now,
  });
  const meta = metaOf(result);
  const source = String(meta.commercialResolutionSource ?? "unknown");

  if (result.entitlements.plan === "NONE") {
    return {
      allowed: false,
      reasonCode: "not_entitled",
      limitKey: input.limitKey,
      cap: 0,
      proposedTotal: input.proposedTotal,
      policy: "denied",
      source,
    };
  }

  const cap = readLimitValue(result.entitlements, input.limitKey);
  if (cap === undefined) {
    // Limit key not in core DTO — treat missing Snapshot limit as deny for unknown keys.
    return {
      allowed: false,
      reasonCode: "limit_key_unsupported",
      limitKey: input.limitKey,
      cap: null,
      proposedTotal: input.proposedTotal,
      policy: "denied",
      source,
    };
  }
  if (cap === null) {
    return {
      allowed: true,
      reasonCode: "unlimited",
      limitKey: input.limitKey,
      cap: null,
      proposedTotal: input.proposedTotal,
      policy: "unlimited",
      source,
    };
  }
  const allowed = input.proposedTotal <= cap;
  return {
    allowed,
    reasonCode: allowed ? "within_limit" : "limit_exceeded",
    limitKey: input.limitKey,
    cap,
    proposedTotal: input.proposedTotal,
    policy: "hard",
    source,
  };
}
