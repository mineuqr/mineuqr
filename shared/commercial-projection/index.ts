/**
 * COMMERCIAL-PROJECTION-GENERATION-1
 * Generated Commercial Projection Registry (Commercial SSOT for Plans/Catalog/Offerings).
 */

import { generateCommercialProjectionRegistry } from "./packaging";
import {
  COMMERCIAL_PROJECTION_IDS,
  isCommercialProjectionId,
  type CommercialProjectionId,
  type CommercialProjectionRecord,
} from "./schema";
import {
  LEGACY_COMPAT_FEATURE_KEYS,
  isLegacyCompatFeatureKey,
  normalizeToProjectionId,
  type LegacyCompatFeatureKey,
} from "./legacyCompat";

export const COMMERCIAL_PROJECTION_REGISTRY: readonly CommercialProjectionRecord[] =
  generateCommercialProjectionRegistry();

export const COMMERCIAL_PROJECTION_GENERATION_PROGRAM =
  "COMMERCIAL-PROJECTION-GENERATION-1" as const;

const byId = new Map(
  COMMERCIAL_PROJECTION_REGISTRY.map((r) => [r.projectionId, r])
);

export function getCommercialProjection(
  id: string
): CommercialProjectionRecord | null {
  return byId.get(id as CommercialProjectionId) ?? null;
}

export function listCommercialProjectionIds(): readonly CommercialProjectionId[] {
  return COMMERCIAL_PROJECTION_IDS;
}

/**
 * Runtime entitlement feature vocabulary =
 * Projection IDs ∪ Legacy compat keys (snapshots / UI gates).
 * Catalog / Plans / Published Offerings use Projection IDs only.
 */
export const RUNTIME_ENTITLEMENT_FEATURE_KEYS = [
  ...COMMERCIAL_PROJECTION_IDS,
  ...LEGACY_COMPAT_FEATURE_KEYS,
] as const;

export type RuntimeEntitlementFeatureKey =
  (typeof RUNTIME_ENTITLEMENT_FEATURE_KEYS)[number];

export function isRuntimeEntitlementFeatureKey(
  key: string
): key is RuntimeEntitlementFeatureKey {
  return (RUNTIME_ENTITLEMENT_FEATURE_KEYS as readonly string[]).includes(key);
}

/**
 * Expand snapshot/bundle feature keys into Runtime entitlement map keys.
 * Enables projection IDs and keeps legacy compat keys for UI gates.
 */
export function expandFeatureKeysForRuntime(
  keys: readonly string[]
): Set<RuntimeEntitlementFeatureKey> {
  const out = new Set<RuntimeEntitlementFeatureKey>();
  for (const key of keys) {
    if (isCommercialProjectionId(key)) {
      out.add(key);
      continue;
    }
    if (isLegacyCompatFeatureKey(key)) {
      out.add(key);
      const projected = normalizeToProjectionId(key);
      if (projected) out.add(projected);
      continue;
    }
    if (key === "ordering") {
      out.add("ordering");
    }
  }
  return out;
}

/**
 * Normalize keys for Catalog Plan / bundle writes & public offerings.
 * Projection IDs kept; legacy aliases mapped; deprecated dropped.
 */
export function normalizeFeatureKeysForProjection(
  keys: readonly string[]
): CommercialProjectionId[] {
  const out: CommercialProjectionId[] = [];
  const seen = new Set<string>();
  for (const key of keys) {
    let id: CommercialProjectionId | null = null;
    if (isCommercialProjectionId(key)) {
      id = key;
    } else {
      id = normalizeToProjectionId(key);
    }
    if (id && !seen.has(id)) {
      seen.add(id);
      out.push(id);
    }
  }
  return out;
}

export {
  LEGACY_COMPAT_FEATURE_KEYS,
  LEGACY_TO_PROJECTION,
  isLegacyCompatFeatureKey,
  normalizeToProjectionId,
} from "./legacyCompat";
export type { CommercialProjectionId, CommercialProjectionRecord, LegacyCompatFeatureKey };
export {
  COMMERCIAL_PROJECTION_IDS,
  CATALOG_PROMOTED_PROJECTION_IDS,
  isCommercialProjectionId,
} from "./schema";
export { generateCommercialProjectionRegistry } from "./packaging";
export { COMMERCIAL_PROJECTION_VERSION } from "./schema";
export {
  LEGACY_COMPATIBILITY_RETIREMENT_PROGRAM,
  LEGACY_COMPAT_KEY_RETIREMENT,
  LEGACY_COMPAT_STRUCTURE_RETIREMENT,
  listLegacyCompatKeysByAction,
  assertLegacyCompatKeyClassificationComplete,
} from "./legacyRetirement";
export type {
  LegacyCompatUsageClass,
  LegacyRetirementAction,
  LegacyCompatArtifactRecord,
} from "./legacyRetirement";
