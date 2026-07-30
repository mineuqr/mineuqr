/**
 * COMMERCIAL-PROJECTION-GENERATION-1
 *
 * Commercial Capability Filter SSOT — GENERATED from Commercial Projection
 * (Discovery ELIGIBLE → packaging policy → projection registry).
 *
 * Catalog / Plans / Published Offerings consume Projection IDs only.
 * FEATURE_KEYS / Runtime entitlements = Projection ∪ Legacy Compat (documented).
 *
 * Does NOT redesign Catalog schema, Plan model, or Subscription Runtime algorithms.
 */

import {
  COMMERCIAL_PROJECTION_IDS,
  COMMERCIAL_PROJECTION_REGISTRY,
  COMMERCIAL_PROJECTION_GENERATION_PROGRAM,
  RUNTIME_ENTITLEMENT_FEATURE_KEYS,
  expandFeatureKeysForRuntime,
  getCommercialProjection,
  isCommercialProjectionId,
  isRuntimeEntitlementFeatureKey,
  normalizeFeatureKeysForProjection,
  type CommercialProjectionId,
  type CommercialProjectionRecord,
  type RuntimeEntitlementFeatureKey,
} from "@shared/commercial-projection";
import {
  DISCOVERY_COMMERCIAL_ELIGIBLE,
  DISCOVERY_COMMERCIAL_ELIGIBLE_IDS,
} from "@shared/capability-discovery";

/** @deprecated Use commercializable vs internal via Discovery eligibility. */
export const COMMERCIAL_CAPABILITY_CLASSES = [
  "commercializable",
  "internal_only",
] as const;

export type CommercialCapabilityClass =
  (typeof COMMERCIAL_CAPABILITY_CLASSES)[number];

/**
 * Normative commercial filter keys for Plans / Catalog / Offerings.
 * Generated Projection IDs — NOT legacy FEATURE_KEYS vocabulary.
 */
export const COMMERCIAL_CAPABILITY_FILTER_KEYS = COMMERCIAL_PROJECTION_IDS;

export type CommercialCapabilityFilterKey = CommercialProjectionId;

export const COMMERCIAL_LIMIT_FILTER_KEYS = [
  "restaurants",
  "items",
  "categories",
  "ordersPerMonth",
  "qrCodes",
  "storage",
  "images",
  "staffAccounts",
  "branches",
  "devices",
] as const;

export type CommercialLimitFilterKey =
  (typeof COMMERCIAL_LIMIT_FILTER_KEYS)[number];

/** Join: Discovery CAP · Runtime matrix cap.* · Plan filter (projection) key */
export type CommercialCapabilityFilterRow = {
  filterKey: CommercialCapabilityFilterKey;
  discoveryCapIds: readonly string[];
  runtimeCapabilityId: string;
  class: "commercializable";
  inFilterVocabulary: true;
  productionImplemented: boolean;
  runtimeEnforced: "full" | "partial" | "flags_only" | "coarse_legacy";
  ownerDomain: string;
  capabilityName: string;
  domain: string;
  category: string;
  projectionVersion: string;
};

function runtimeEnforcedFor(
  projectionId: CommercialProjectionId
): CommercialCapabilityFilterRow["runtimeEnforced"] {
  if (projectionId === "ordering") return "full";
  return "flags_only";
}

function toFilterRow(
  row: CommercialProjectionRecord
): CommercialCapabilityFilterRow {
  return {
    filterKey: row.projectionId,
    discoveryCapIds: row.discoveryCapabilityIds,
    runtimeCapabilityId: row.runtimeCapabilityId,
    class: "commercializable",
    inFilterVocabulary: true,
    productionImplemented: true,
    runtimeEnforced: runtimeEnforcedFor(row.projectionId),
    ownerDomain: row.owner,
    capabilityName: row.capabilityName,
    domain: row.domain,
    category: row.category,
    projectionVersion: row.projectionVersion,
  };
}

/**
 * Commercial Filter Registry — projection of Discovery (generated).
 * No manual capability registration.
 */
export const COMMERCIAL_CAPABILITY_FILTER_REGISTRY: readonly CommercialCapabilityFilterRow[] =
  COMMERCIAL_PROJECTION_REGISTRY.map(toFilterRow);

/** Discovery ELIGIBLE classification for commercial projection inputs. */
export type DiscoveryCapabilityClassification = {
  capId: string;
  name: string;
  class: CommercialCapabilityClass;
  inFilterVocabulary: boolean;
  ownerDomain: string;
};

export const DISCOVERY_CAPABILITY_CLASSIFICATION: readonly DiscoveryCapabilityClassification[] =
  DISCOVERY_COMMERCIAL_ELIGIBLE.map((c) => ({
    capId: c.capabilityId,
    name: c.name,
    class: "commercializable" as const,
    inFilterVocabulary: true,
    ownerDomain: c.owner,
  }));

export function isCommercialCapabilityFilterKey(
  key: string
): key is CommercialCapabilityFilterKey {
  return isCommercialProjectionId(key);
}

export function isCommercialLimitFilterKey(
  key: string
): key is CommercialLimitFilterKey {
  return (COMMERCIAL_LIMIT_FILTER_KEYS as readonly string[]).includes(key);
}

/**
 * Catalog / Plan write validation.
 * Accepts Projection IDs or legacy aliases (normalized). Rejects unknown / deprecated-only.
 */
export function assertCommercialCapabilityFilterKeys(
  keys: readonly string[]
): { ok: true; normalized: CommercialCapabilityFilterKey[] } | { ok: false; invalid: string[] } {
  const invalid: string[] = [];
  for (const key of keys) {
    if (isCommercialProjectionId(key)) continue;
    const normalized = normalizeFeatureKeysForProjection([key]);
    if (normalized.length === 0) invalid.push(key);
  }
  if (invalid.length) return { ok: false, invalid };
  return { ok: true, normalized: normalizeFeatureKeysForProjection(keys) };
}

export function listCommercializableDiscoveryCaps(): DiscoveryCapabilityClassification[] {
  return [...DISCOVERY_CAPABILITY_CLASSIFICATION];
}

export function listInternalOnlyDiscoveryCaps(): DiscoveryCapabilityClassification[] {
  return [];
}

export const COMMERCIAL_CAPABILITY_PLATFORM_ADOPTION_PROGRAM =
  "COMMERCIAL-CAPABILITY-PLATFORM-ADOPTION-1" as const;

export const COMMERCIAL_PROJECTION_PROGRAM =
  COMMERCIAL_PROJECTION_GENERATION_PROGRAM;

export {
  COMMERCIAL_PROJECTION_REGISTRY,
  COMMERCIAL_PROJECTION_IDS,
  RUNTIME_ENTITLEMENT_FEATURE_KEYS,
  DISCOVERY_COMMERCIAL_ELIGIBLE_IDS,
  expandFeatureKeysForRuntime,
  getCommercialProjection,
  isRuntimeEntitlementFeatureKey,
  normalizeFeatureKeysForProjection,
  type RuntimeEntitlementFeatureKey,
};
