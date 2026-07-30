/**
 * COMMERCIAL-PROJECTION-GENERATION-1
 * FEATURE_KEYS = Runtime entitlement vocabulary (Projection ∪ Legacy Compat).
 * Catalog Plan filters = COMMERCIAL_CAPABILITY_FILTER_KEYS (Projection only).
 */

export {
  RUNTIME_ENTITLEMENT_FEATURE_KEYS as FEATURE_KEYS,
  type RuntimeEntitlementFeatureKey as FeatureKey,
  COMMERCIAL_CAPABILITY_FILTER_KEYS,
  type CommercialCapabilityFilterKey,
  isCommercialCapabilityFilterKey,
  isRuntimeEntitlementFeatureKey,
} from "@shared/commercial-capability";
